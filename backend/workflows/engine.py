"""
Workflow execution engine for processing approval flows.
"""

from django.db import transaction
from django.utils import timezone
from django.db.models import Q
import json
import operator
from datetime import timedelta

from .models import (
    Workflow, WorkflowStep, WorkflowInstance,
    WorkflowApproval, WorkflowNotification
)


class WorkflowEngine:
    """Engine for executing workflow logic."""

    def __init__(self):
        self.operators = {
            'eq': operator.eq,
            'ne': operator.ne,
            'gt': operator.gt,
            'lt': operator.lt,
            'gte': operator.ge,
            'lte': operator.le,
            'in': lambda a, b: a in b,
            'not_in': lambda a, b: a not in b,
            'contains': lambda a, b: b in a,
            'starts_with': lambda a, b: a.startswith(b),
            'ends_with': lambda a, b: a.endswith(b),
        }

    @transaction.atomic
    def start_workflow(self, submission, workflow):
        """Start a new workflow instance for a submission."""

        # Create workflow instance
        instance = WorkflowInstance.objects.create(
            workflow=workflow,
            submission=submission,
            status='IN_PROGRESS',
            context_data={
                'submission_id': str(submission.id),
                'form_id': str(submission.form.id),
                'submitted_by': submission.submitted_by.username,
                'submission_data': submission.data
            }
        )

        # Get the first active step(s) based on workflow type
        if workflow.workflow_type == 'SEQUENTIAL':
            # Start with the first step
            first_step = workflow.steps.filter(order=0).first()
            if first_step:
                instance.current_step = first_step
                instance.save()
                self._create_approval_for_step(instance, first_step)

        elif workflow.workflow_type == 'PARALLEL':
            # Create approvals for all steps at once
            steps = workflow.steps.all()
            for step in steps:
                if self._check_step_conditions(step, instance):
                    self._create_approval_for_step(instance, step)

        elif workflow.workflow_type == 'CONDITIONAL':
            # Evaluate conditions to determine first step
            first_step = self._get_next_conditional_step(workflow, instance, None)
            if first_step:
                instance.current_step = first_step
                instance.save()
                self._create_approval_for_step(instance, first_step)

        elif workflow.workflow_type == 'HYBRID':
            # Hybrid combines sequential and parallel
            # Start with first sequential group
            first_steps = workflow.steps.filter(order=0)
            for step in first_steps:
                if self._check_step_conditions(step, instance):
                    self._create_approval_for_step(instance, step)
            if first_steps.exists():
                instance.current_step = first_steps.first()
                instance.save()

        # Send initial notifications
        self._send_notifications(instance, 'ASSIGNED')

        return instance

    def _create_approval_for_step(self, instance, step):
        """Create an approval record for a workflow step."""

        # Determine who should be assigned
        assigned_to = self._get_assignee_for_step(step, instance)

        if not assigned_to:
            # If no specific user, create pending approval without assignee
            # This might be handled by role-based assignment later
            pass

        # Calculate due date if time limit is set
        due_date = None
        if step.time_limit_hours:
            due_date = timezone.now() + timedelta(hours=step.time_limit_hours)

        approval = WorkflowApproval.objects.create(
            workflow_instance=instance,
            workflow_step=step,
            status='PENDING',
            assigned_to=assigned_to,
            due_date=due_date
        )

        # Create notification for assignee
        if assigned_to:
            self._create_notification(
                approval,
                'ASSIGNED',
                assigned_to,
                f"New approval task: {step.name}",
                f"You have been assigned to {step.name} for {instance.submission.form.name}"
            )

        return approval

    def _get_assignee_for_step(self, step, instance):
        """Determine who should be assigned to a step."""

        # Priority: specific user > role > department
        if step.assigned_user:
            # Check if user is not admin or form manager
            if step.assigned_user.role not in ['ADMIN', 'FORM_MANAGER']:
                return step.assigned_user

        if step.assigned_role:
            # Find a user with this role (excluding admin and form manager)
            from users.models import User
            users = User.objects.filter(
                role=step.assigned_role,
                is_active=True
            ).exclude(role__in=['ADMIN', 'FORM_MANAGER'])

            if step.assigned_department:
                users = users.filter(department=step.assigned_department)

            return users.first()

        if step.assigned_department:
            # Find any regular user in this department
            from users.models import User
            return User.objects.filter(
                department=step.assigned_department,
                role='USER',
                is_active=True
            ).first()

        return None

    def _check_step_conditions(self, step, instance):
        """Check if a step's conditions are met."""

        if not step.conditions:
            return True

        conditions = step.conditions
        if isinstance(conditions, str):
            conditions = json.loads(conditions)

        # Evaluate conditions
        return self._evaluate_conditions(conditions, instance.context_data)

    def _evaluate_conditions(self, conditions, context):
        """Evaluate a set of conditions against context data."""

        if not conditions:
            return True

        logic = conditions.get('logic', 'AND')
        rules = conditions.get('rules', [])

        if not rules:
            return True

        results = []
        for rule in rules:
            field = rule.get('field')
            operator_key = rule.get('operator', 'eq')
            value = rule.get('value')

            # Get field value from context
            field_value = self._get_nested_value(context, field)

            # Apply operator
            op_func = self.operators.get(operator_key, operator.eq)
            try:
                result = op_func(field_value, value)
                results.append(result)
            except:
                results.append(False)

        # Apply logic
        if logic == 'AND':
            return all(results)
        elif logic == 'OR':
            return any(results)
        else:
            return True

    def _get_nested_value(self, data, path):
        """Get a value from nested dictionary using dot notation."""
        keys = path.split('.')
        value = data

        for key in keys:
            if isinstance(value, dict):
                value = value.get(key)
            else:
                return None

        return value

    def _get_next_conditional_step(self, workflow, instance, current_step):
        """Get the next step based on conditions."""

        if current_step:
            # Get steps after current step
            next_steps = workflow.steps.filter(order__gt=current_step.order).order_by('order')
        else:
            # Get first step
            next_steps = workflow.steps.all().order_by('order')

        for step in next_steps:
            if self._check_step_conditions(step, instance):
                return step

        return None

    @transaction.atomic
    def approve_step(self, approval, user, comments=''):
        """Process an approval for a workflow step."""

        # Update approval
        approval.approve(user, comments)

        instance = approval.workflow_instance
        workflow = instance.workflow

        # Check if this completes the workflow
        if self._check_workflow_completion(instance):
            instance.status = 'COMPLETED'
            instance.completed_at = timezone.now()
            instance.save()

            # Update the submission status to APPROVED
            submission = instance.submission
            submission.status = 'APPROVED'
            submission.save()

            # Send completion notifications
            self._send_notifications(instance, 'COMPLETED')

        else:
            # Move to next step based on workflow type
            if workflow.workflow_type == 'SEQUENTIAL':
                self._handle_sequential_progression(instance, approval)

            elif workflow.workflow_type == 'PARALLEL':
                self._handle_parallel_progression(instance)

            elif workflow.workflow_type == 'CONDITIONAL':
                self._handle_conditional_progression(instance, approval)

            elif workflow.workflow_type == 'HYBRID':
                self._handle_hybrid_progression(instance, approval)

    @transaction.atomic
    def reject_step(self, approval, user, comments=''):
        """Process a rejection for a workflow step."""

        # Update approval
        approval.reject(user, comments)

        instance = approval.workflow_instance

        # For rejection, typically the workflow fails
        # But this can be configured based on requirements
        if not approval.workflow_step.can_skip:
            instance.status = 'FAILED'
            instance.completed_at = timezone.now()
            instance.save()

            # Update the submission status to REJECTED
            submission = instance.submission
            submission.status = 'REJECTED'
            submission.save()

            # Send rejection notifications
            self._send_notifications(instance, 'REJECTED')

    def _handle_sequential_progression(self, instance, completed_approval):
        """Handle progression for sequential workflows."""

        current_step = completed_approval.workflow_step
        next_step = instance.workflow.steps.filter(
            order__gt=current_step.order
        ).order_by('order').first()

        if next_step:
            instance.current_step = next_step
            instance.save()
            self._create_approval_for_step(instance, next_step)

    def _handle_parallel_progression(self, instance):
        """Handle progression for parallel workflows."""

        # Check if enough approvals are complete
        total_steps = instance.workflow.steps.count()
        approved_count = instance.approvals.filter(status='APPROVED').count()
        threshold = instance.workflow.approval_threshold

        approval_percentage = (approved_count / total_steps) * 100

        if approval_percentage >= threshold:
            instance.status = 'COMPLETED'
            instance.completed_at = timezone.now()
            instance.save()

    def _handle_conditional_progression(self, instance, completed_approval):
        """Handle progression for conditional workflows."""

        current_step = completed_approval.workflow_step
        next_step = self._get_next_conditional_step(
            instance.workflow, instance, current_step
        )

        if next_step:
            instance.current_step = next_step
            instance.save()
            self._create_approval_for_step(instance, next_step)

    def _handle_hybrid_progression(self, instance, completed_approval):
        """Handle progression for hybrid workflows."""

        current_order = completed_approval.workflow_step.order

        # Check if all steps at current order level are complete
        steps_at_level = instance.workflow.steps.filter(order=current_order)
        approvals_at_level = instance.approvals.filter(
            workflow_step__in=steps_at_level
        )

        if approvals_at_level.filter(status='PENDING').exists():
            # Still waiting for other parallel approvals at this level
            return

        # Move to next order level
        next_steps = instance.workflow.steps.filter(
            order__gt=current_order
        ).order_by('order')

        if next_steps.exists():
            next_order = next_steps.first().order
            steps_at_next_level = next_steps.filter(order=next_order)

            for step in steps_at_next_level:
                if self._check_step_conditions(step, instance):
                    self._create_approval_for_step(instance, step)

            instance.current_step = steps_at_next_level.first()
            instance.save()

    def _check_workflow_completion(self, instance):
        """Check if a workflow instance is complete."""

        workflow = instance.workflow

        if workflow.workflow_type == 'SEQUENTIAL':
            # For sequential workflows, check if ALL required steps have been approved
            # (not just if there are no pending approvals, because next step's approval
            # hasn't been created yet at this point)
            total_required_steps = workflow.steps.filter(is_required=True).count()
            approved_steps = instance.approvals.filter(
                workflow_step__is_required=True,
                status='APPROVED'
            ).count()

            return approved_steps >= total_required_steps

        elif workflow.workflow_type == 'PARALLEL':
            # Complete based on threshold
            total_steps = workflow.steps.filter(is_required=True).count()
            approved_count = instance.approvals.filter(
                status='APPROVED',
                workflow_step__is_required=True
            ).count()

            if total_steps == 0:
                return True

            approval_percentage = (approved_count / total_steps) * 100
            return approval_percentage >= workflow.approval_threshold

        elif workflow.workflow_type in ['CONDITIONAL', 'HYBRID']:
            # Complete if no pending required approvals and no next steps
            has_pending = instance.approvals.filter(
                status__in=['PENDING', 'DELEGATED'],
                workflow_step__is_required=True
            ).exists()

            return not has_pending

        return False

    def _create_notification(self, approval, notification_type, recipient, subject, message):
        """Create a workflow notification."""

        WorkflowNotification.objects.create(
            workflow_approval=approval,
            notification_type=notification_type,
            recipient=recipient,
            subject=subject,
            message=message
        )

    def _send_notifications(self, instance, event_type):
        """Send notifications for workflow events."""

        # This is a placeholder for actual notification sending
        # In production, this would integrate with email, SMS, or push notifications
        pass

    def check_escalations(self):
        """Check for approvals that need escalation."""

        # Find overdue approvals
        overdue_approvals = WorkflowApproval.objects.filter(
            status='PENDING',
            due_date__lt=timezone.now(),
            workflow_instance__workflow__auto_escalate=True
        )

        for approval in overdue_approvals:
            self._escalate_approval(approval)

    def _escalate_approval(self, approval):
        """Escalate an overdue approval."""

        # Find escalation target (e.g., manager of assigned user)
        # This is a simplified implementation
        if approval.assigned_to and approval.assigned_to.department:
            from users.models import User
            manager = User.objects.filter(
                department=approval.assigned_to.department,
                role='FORM_MANAGER'
            ).first()

            if manager:
                # Reassign to manager
                approval.assigned_to = manager
                approval.save()

                # Create escalation notification
                self._create_notification(
                    approval,
                    'ESCALATION',
                    manager,
                    f"Escalated: {approval.workflow_step.name}",
                    f"This approval has been escalated to you due to timeout."
                )