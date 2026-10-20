"""
Workflow engine: turns a submitted form into approval tasks and moves it through its workflow.

Workflow types
- SEQUENTIAL:  steps run one at a time, in `order`.
- CONDITIONAL: like SEQUENTIAL, but a step only runs when its `conditions` match the submission.
- PARALLEL:    every step whose conditions match starts at once. The workflow is approved once
               `approval_threshold` percent of the required steps approve, and rejected as soon
               as that threshold can no longer be reached.

Each step has one or more approvers and an approval mode:
- ALL:      everyone must approve; a single rejection rejects the step.
- MAJORITY: more than half must approve; half or more rejecting rejects the step.
- ANY:      one approval passes the step; it is rejected only when everyone rejects.

Rules that keep the state consistent
- The submitter is never an approver of their own request. If a step has no one else, the task
  goes to an administrator and the instance is flagged NEEDS_ADMIN_ACTION.
- As soon as a step is decided, its remaining pending tasks are closed (SKIPPED), and when the
  workflow finishes every pending task is closed, so late votes cannot change the outcome.
- Every decision runs in a transaction that locks the workflow instance row, so two approvers
  acting at the same moment are processed one after the other.
"""

import logging
import operator
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from users.models import User
from .models import ACTIVE_INSTANCE_STATUSES, WorkflowApproval, WorkflowInstance, WorkflowNotification

logger = logging.getLogger(__name__)

PENDING, APPROVED, REJECTED = 'PENDING', 'APPROVED', 'REJECTED'
# Delegated, skipped and cancelled records are not votes.
VOTE_STATUSES = (PENDING, APPROVED, REJECTED)


def _as_number(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _compare(op):
    """Wrap an ordering operator so '1500' > 1000 compares as numbers."""
    def compare(a, b):
        x, y = _as_number(a), _as_number(b)
        if x is not None and y is not None:
            return op(x, y)
        return op(a, b)
    return compare


OPERATORS = {
    'eq': _compare(operator.eq),
    'ne': _compare(operator.ne),
    'gt': _compare(operator.gt),
    'lt': _compare(operator.lt),
    'gte': _compare(operator.ge),
    'lte': _compare(operator.le),
    'in': lambda a, b: b is not None and a in b,
    'not_in': lambda a, b: b is None or a not in b,
    'contains': lambda a, b: a is not None and b is not None and str(b) in str(a),
    'starts_with': lambda a, b: a is not None and b is not None and str(a).startswith(str(b)),
    'ends_with': lambda a, b: a is not None and b is not None and str(a).endswith(str(b)),
}


class WorkflowError(Exception):
    """A decision that is not allowed, e.g. on a task that was already decided."""


class WorkflowEngine:

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    @transaction.atomic
    def start_workflow(self, submission, workflow):
        """Create the workflow instance for a submission and open its first task(s)."""
        instance = WorkflowInstance.objects.create(
            workflow=workflow,
            submission=submission,
            status='IN_PROGRESS',
            context_data={
                'submission_id': str(submission.id),
                'form_id': str(submission.form_id),
                'submitted_by': submission.submitted_by.username,
                'submitted_by_id': str(submission.submitted_by_id),
                'submission_data': submission.data,
            },
        )

        if workflow.workflow_type == 'PARALLEL':
            steps = [s for s in workflow.steps.order_by('order') if self._conditions_met(s, instance)]
            for step in steps:
                self._activate_step(instance, step)
            started = bool(steps)
        else:
            started = self._activate_next_step(instance, after=None)

        if not started:
            # Nothing to approve (no steps, or no step's conditions matched)
            self._finish(instance, approved=True, deciding_approval=None)

        return instance

    def approve_step(self, approval, user, comments=''):
        return self._decide(approval, user, APPROVED, comments)

    def reject_step(self, approval, user, comments=''):
        return self._decide(approval, user, REJECTED, comments)

    @transaction.atomic
    def decide_as_admin(self, instance, admin, approve, comments=''):
        """Approve or reject every open task of the current step on behalf of an administrator."""
        instance = WorkflowInstance.objects.select_for_update().get(pk=instance.pk)
        if instance.status not in ACTIVE_INSTANCE_STATUSES:
            raise WorkflowError('This workflow is already closed.')

        pending = instance.approvals.filter(status=PENDING)
        if instance.workflow.workflow_type != 'PARALLEL' and instance.current_step_id:
            pending = pending.filter(workflow_step_id=instance.current_step_id)
        pending = list(pending)
        if not pending:
            raise WorkflowError('There are no pending approvals for the current step.')

        decision = APPROVED if approve else REJECTED
        for approval in pending:
            approval.refresh_from_db()
            instance.refresh_from_db()
            if approval.status != PENDING or instance.status not in ACTIVE_INSTANCE_STATUSES:
                continue  # closed by an earlier decision in this loop
            self._decide(approval, admin, decision, comments)

        instance.refresh_from_db()
        return instance

    @transaction.atomic
    def cancel(self, instance, user, reason='', submission_status='CANCELLED'):
        """Stop a running workflow, cancel its open tasks and set the submission's final status."""
        instance = WorkflowInstance.objects.select_for_update().get(pk=instance.pk)
        if instance.status not in ACTIVE_INSTANCE_STATUSES:
            raise WorkflowError('This workflow is already closed.')

        now = timezone.now()
        instance.status = 'CANCELLED'
        instance.cancelled_at = now
        instance.cancelled_by = user
        instance.cancellation_reason = reason
        instance.save(update_fields=['status', 'cancelled_at', 'cancelled_by', 'cancellation_reason'])
        instance.approvals.filter(status=PENDING).update(status='CANCELLED', completed_at=now)

        submission = instance.submission
        submission.status = submission_status
        submission.save(update_fields=['status', 'updated_at'])
        return instance

    def step_outcome(self, instance, step):
        """PENDING, APPROVED or REJECTED for one step of one workflow instance."""
        votes = list(
            instance.approvals.filter(workflow_step=step, status__in=VOTE_STATUSES)
            .values_list('status', flat=True)
        )
        total = len(votes)
        if total == 0:
            return PENDING
        approved, rejected = votes.count(APPROVED), votes.count(REJECTED)

        if step.approval_mode == 'ANY':
            if approved:
                return APPROVED
            if rejected == total:
                return REJECTED
        elif step.approval_mode == 'MAJORITY':
            if approved * 2 > total:
                return APPROVED
            if rejected * 2 >= total:  # a majority can no longer be reached
                return REJECTED
        else:  # ALL
            if rejected:
                return REJECTED
            if approved == total:
                return APPROVED
        return PENDING

    # ------------------------------------------------------------------
    # Decisions
    # ------------------------------------------------------------------

    @transaction.atomic
    def _decide(self, approval, user, decision, comments):
        instance = WorkflowInstance.objects.select_for_update().get(pk=approval.workflow_instance_id)
        approval = WorkflowApproval.objects.select_for_update().get(pk=approval.pk)

        if instance.status not in ACTIVE_INSTANCE_STATUSES:
            raise WorkflowError('This workflow is already closed.')
        if approval.status != PENDING:
            raise WorkflowError('This approval has already been processed.')

        if decision == APPROVED:
            approval.approve(user, comments)
        else:
            approval.reject(user, comments)

        step = approval.workflow_step
        outcome = self.step_outcome(instance, step)
        if outcome == PENDING:
            return instance

        self._close_pending(instance, step=step)

        if instance.workflow.workflow_type == 'PARALLEL':
            self._evaluate_parallel(instance, approval)
        elif outcome == REJECTED and step.is_required and not step.can_skip:
            self._finish(instance, approved=False, deciding_approval=approval)
        elif not self._activate_next_step(instance, after=step):
            self._finish(instance, approved=True, deciding_approval=approval)

        return instance

    def _evaluate_parallel(self, instance, deciding_approval):
        started = list(instance.workflow.steps.filter(approvals__workflow_instance=instance).distinct())
        counted = [s for s in started if s.is_required] or started
        outcomes = [self.step_outcome(instance, s) for s in counted]

        total = len(outcomes)
        approved = outcomes.count(APPROVED)
        undecided = outcomes.count(PENDING)
        threshold = instance.workflow.approval_threshold

        if approved * 100 >= threshold * total:
            self._finish(instance, approved=True, deciding_approval=deciding_approval)
        elif (approved + undecided) * 100 < threshold * total:
            self._finish(instance, approved=False, deciding_approval=deciding_approval)

    def _finish(self, instance, approved, deciding_approval):
        instance.status = 'COMPLETED' if approved else 'FAILED'
        instance.completed_at = timezone.now()
        instance.save(update_fields=['status', 'completed_at'])

        submission = instance.submission
        submission.status = 'APPROVED' if approved else 'REJECTED'
        submission.save(update_fields=['status', 'updated_at'])

        self._close_pending(instance)

        if deciding_approval is not None:
            verdict = 'approved' if approved else 'rejected'
            self._notify(
                deciding_approval,
                'COMPLETED' if approved else 'REJECTED',
                submission.submitted_by,
                f"Your {submission.form.name} request was {verdict}",
                f"Submission {submission.submission_number} was {verdict}.",
            )

    def _close_pending(self, instance, step=None):
        pending = instance.approvals.filter(status=PENDING)
        if step is not None:
            pending = pending.filter(workflow_step=step)
        pending.update(status='SKIPPED', completed_at=timezone.now())

    # ------------------------------------------------------------------
    # Starting steps
    # ------------------------------------------------------------------

    def _activate_next_step(self, instance, after):
        """Open the next step after `after` (or the first step). Returns False when none is left."""
        steps = instance.workflow.steps.order_by('order')
        if after is not None:
            steps = steps.filter(order__gt=after.order)

        for step in steps:
            if instance.workflow.workflow_type == 'CONDITIONAL' and not self._conditions_met(step, instance):
                continue
            instance.current_step = step
            instance.save(update_fields=['current_step'])
            self._activate_step(instance, step)
            return True
        return False

    def _activate_step(self, instance, step):
        """Create one pending task per approver of `step`, never assigning the submitter."""
        submitter = instance.submission.submitted_by

        approvers = [
            link.user for link in step.step_approvers.select_related('user').order_by('order')
            if link.user.is_active and link.user_id != submitter.id
        ]
        if not approvers and step.assigned_user and step.assigned_user.is_active \
                and step.assigned_user_id != submitter.id:
            approvers = [step.assigned_user]

        if step.step_approvers.filter(user_id=submitter.id).exists() or step.assigned_user_id == submitter.id:
            self._record(instance, 'exclusions', {
                'step': step.name, 'excluded_user': submitter.username, 'reason': 'self_approval',
            })

        if approvers:
            if instance.status == 'NEEDS_ADMIN_ACTION':
                instance.status = 'IN_PROGRESS'
                instance.context_data.pop('admin_fallback', None)
                instance.context_data.pop('admin_fallback_step', None)
        else:
            admin = (User.objects.filter(role='ADMIN', is_active=True).exclude(id=submitter.id).first()
                     or User.objects.filter(role='ADMIN', is_active=True).first())
            instance.status = 'NEEDS_ADMIN_ACTION'
            if admin is None:
                instance.context_data['no_approvers_step'] = step.name
                instance.save(update_fields=['status', 'context_data'])
                logger.warning('Workflow %s: no approver and no administrator for step %s', instance.id, step.name)
                return
            approvers = [admin]
            instance.context_data['admin_fallback'] = True
            instance.context_data['admin_fallback_step'] = step.name
            self._record(instance, 'exclusions', {
                'step': step.name, 'fallback_to': admin.username, 'reason': 'no_eligible_approvers',
            })
        instance.save(update_fields=['status', 'context_data'])

        due_date = timezone.now() + timedelta(hours=step.time_limit_hours) if step.time_limit_hours else None
        for approver in approvers:
            approval = WorkflowApproval.objects.create(
                workflow_instance=instance,
                workflow_step=step,
                status=PENDING,
                assigned_to=approver,
                due_date=due_date,
            )
            self._notify(
                approval,
                'ASSIGNED',
                approver,
                f"New approval task: {step.name}",
                f"You have been assigned to {step.name} for {instance.submission.form.name}",
            )

    # ------------------------------------------------------------------
    # Conditions
    # ------------------------------------------------------------------

    def _conditions_met(self, step, instance):
        """Evaluate {"logic": "AND"|"OR", "rules": [{"field", "operator", "value"}]} against the submission."""
        conditions = step.conditions or {}
        rules = conditions.get('rules') or []
        if not rules:
            return True

        results = []
        for rule in rules:
            compare = OPERATORS.get(rule.get('operator', 'eq'), OPERATORS['eq'])
            actual = self._field_value(instance, rule.get('field', ''))
            try:
                results.append(bool(compare(actual, rule.get('value'))))
            except (TypeError, ValueError):
                results.append(False)

        return any(results) if conditions.get('logic') == 'OR' else all(results)

    @staticmethod
    def _field_value(instance, path):
        """Look a dotted path up in the submission data first, then in the instance context."""
        submission_data = instance.context_data.get('submission_data') or {}
        for source in (submission_data, instance.context_data):
            value = source
            for key in path.split('.'):
                value = value.get(key) if isinstance(value, dict) else None
            if value is not None:
                return value
        return None

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _record(instance, key, entry):
        instance.context_data.setdefault(key, []).append(entry)

    @staticmethod
    def _notify(approval, notification_type, recipient, subject, message):
        WorkflowNotification.objects.create(
            workflow_approval=approval,
            notification_type=notification_type,
            recipient=recipient,
            subject=subject,
            message=message,
        )
