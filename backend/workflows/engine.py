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
    Workflow, WorkflowStep, WorkflowStepApprover, WorkflowInstance,
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
            'in': lambda a, b: a in b if b is not None else False,
            'not_in': lambda a, b: a not in b if b is not None else True,
            'contains': lambda a, b: str(b) in str(a) if a is not None and b is not None else False,
            'starts_with': lambda a, b: str(a).startswith(str(b)) if a is not None and b is not None else False,
            'ends_with': lambda a, b: str(a).endswith(str(b)) if a is not None and b is not None else False,
        }

    # =====================================================
    # Multi-Approver Support Methods
    # =====================================================

    def _get_approvers_for_step(self, step, submitter):
        """
        Get list of approvers for a step, excluding the submitter.
        Returns list of User objects.
        """
        from users.models import User

        # Get assigned users from the M2M relationship (through WorkflowStepApprover)
        step_approvers = step.step_approvers.select_related('user').order_by('order')
        approvers = [sa.user for sa in step_approvers
                     if sa.user.is_active and sa.user.id != submitter.id]

        # If no multi-approvers defined, fall back to single assigned_user
        if not approvers and step.assigned_user:
            if step.assigned_user.is_active and step.assigned_user.id != submitter.id:
                approvers = [step.assigned_user]

        return approvers

    def _create_approvals_for_multi_step(self, instance, step, submitter):
        """
        Create approval records for ALL assigned approvers in a step.
        Returns list of created approvals and info about any exclusions.
        """
        approvers = self._get_approvers_for_step(step, submitter)
        approvals = []
        exclusions = []

        # Check if submitter was excluded
        step_approver_ids = [sa.user.id for sa in step.step_approvers.all()]
        if submitter.id in step_approver_ids:
            exclusions.append({
                'step': step.name,
                'excluded_user': submitter.username,
                'reason': 'self_approval'
            })

        if not approvers:
            # No approvers left after excluding submitter - need admin fallback
            admin = self._get_admin_fallback()
            if admin:
                approvers = [admin]
                exclusions.append({
                    'step': step.name,
                    'fallback_to': admin.username,
                    'reason': 'no_eligible_approvers'
                })
            else:
                # Mark instance as needing admin action
                instance.status = 'NEEDS_ADMIN_ACTION'
                instance.context_data['no_approvers_step'] = step.name
                instance.save()
                return [], exclusions

        # Create approvals for all approvers
        due_date = None
        if step.time_limit_hours:
            due_date = timezone.now() + timedelta(hours=step.time_limit_hours)

        for approver in approvers:
            approval = WorkflowApproval.objects.create(
                workflow_instance=instance,
                workflow_step=step,
                status='PENDING',
                assigned_to=approver,
                due_date=due_date
            )
            approvals.append(approval)

            # Create notification
            self._create_notification(
                approval,
                'ASSIGNED',
                approver,
                f"New approval task: {step.name}",
                f"You have been assigned to {step.name} for {instance.submission.form.name}"
            )

        return approvals, exclusions

    def _check_step_completion(self, instance, step):
        """
        Check if a step is complete based on its approval_mode.

        Returns: tuple (is_complete: bool, is_rejected: bool)
            - is_complete: True if the step has reached a final decision
            - is_rejected: True if the step was rejected (only valid if is_complete is True)
        """
        approvals = instance.approvals.filter(workflow_step=step)
        total_approvers = approvals.count()

        if total_approvers == 0:
            return False, False

        approved_count = approvals.filter(status='APPROVED').count()
        rejected_count = approvals.filter(status='REJECTED').count()
        pending_count = approvals.filter(status='PENDING').count()

        approval_mode = step.approval_mode

        if approval_mode == 'ALL':
            # ALL mode: All must approve, one reject = failed
            if rejected_count > 0:
                return True, True  # Complete and rejected
            if approved_count == total_approvers:
                return True, False  # Complete and approved
            return False, False  # Still pending

        elif approval_mode == 'MAJORITY':
            # MAJORITY mode: >50% must approve, >50% reject = failed
            majority_threshold = total_approvers / 2
            if approved_count > majority_threshold:
                return True, False  # Majority approved
            if rejected_count > majority_threshold:
                return True, True  # Majority rejected
            if pending_count == 0:
                # All votes in but no majority - treat as rejected
                return True, rejected_count >= approved_count
            return False, False  # Still pending

        elif approval_mode == 'ANY':
            # ANY mode: One approval = pass, all reject = fail
            if approved_count >= 1:
                return True, False  # At least one approved
            if rejected_count == total_approvers:
                return True, True  # All rejected
            return False, False  # Still pending

        return False, False

    def _handle_step_approval(self, instance, step):
        """Handle when a step is successfully approved."""
        workflow = instance.workflow

        if self._check_workflow_completion(instance):
            instance.status = 'COMPLETED'
            instance.completed_at = timezone.now()
            instance.save()
            instance.submission.status = 'APPROVED'
            instance.submission.save()
            self._send_notifications(instance, 'COMPLETED')
        else:
            # Move to next step based on workflow type
            submitter = instance.submission.submitted_by
            if workflow.workflow_type == 'SEQUENTIAL':
                self._handle_sequential_progression_multi(instance, step, submitter)
            elif workflow.workflow_type == 'PARALLEL':
                self._handle_parallel_progression(instance)
            elif workflow.workflow_type == 'CONDITIONAL':
                self._handle_conditional_progression_multi(instance, step, submitter)
            elif workflow.workflow_type == 'HYBRID':
                self._handle_hybrid_progression_multi(instance, step, submitter)

    def _handle_step_rejection(self, instance, step):
        """Handle when a step is rejected."""
        if not step.can_skip:
            instance.status = 'FAILED'
            instance.completed_at = timezone.now()
            instance.save()
            instance.submission.status = 'REJECTED'
            instance.submission.save()
            self._send_notifications(instance, 'REJECTED')

    def _handle_sequential_progression_multi(self, instance, current_step, submitter):
        """Handle progression for sequential workflows with multi-approver."""
        next_step = instance.workflow.steps.filter(
            order__gt=current_step.order
        ).order_by('order').first()

        if next_step:
            instance.current_step = next_step
            instance.save()

            approvals, exclusions = self._create_approvals_for_multi_step(instance, next_step, submitter)

            # Track exclusions in context
            if exclusions:
                existing_exclusions = instance.context_data.get('exclusions', [])
                existing_exclusions.extend(exclusions)
                instance.context_data['exclusions'] = existing_exclusions
                instance.save()

    def _handle_conditional_progression_multi(self, instance, current_step, submitter):
        """Handle progression for conditional workflows with multi-approver."""
        next_step = self._get_next_conditional_step(instance.workflow, instance, current_step)

        if next_step:
            instance.current_step = next_step
            instance.save()

            approvals, exclusions = self._create_approvals_for_multi_step(instance, next_step, submitter)

            if exclusions:
                existing_exclusions = instance.context_data.get('exclusions', [])
                existing_exclusions.extend(exclusions)
                instance.context_data['exclusions'] = existing_exclusions
                instance.save()

    def _handle_hybrid_progression_multi(self, instance, current_step, submitter):
        """Handle progression for hybrid workflows with multi-approver."""
        current_order = current_step.order

        # Check if all steps at current order level are complete
        steps_at_level = instance.workflow.steps.filter(order=current_order)

        for step in steps_at_level:
            is_complete, _ = self._check_step_completion(instance, step)
            if not is_complete:
                # Still waiting for other approvals at this level
                return

        # Move to next order level
        next_steps = instance.workflow.steps.filter(
            order__gt=current_order
        ).order_by('order')

        if next_steps.exists():
            next_order = next_steps.first().order
            steps_at_next_level = next_steps.filter(order=next_order)

            all_exclusions = []
            for step in steps_at_next_level:
                if self._check_step_conditions(step, instance):
                    approvals, exclusions = self._create_approvals_for_multi_step(instance, step, submitter)
                    all_exclusions.extend(exclusions)

            if all_exclusions:
                existing_exclusions = instance.context_data.get('exclusions', [])
                existing_exclusions.extend(all_exclusions)
                instance.context_data['exclusions'] = existing_exclusions

            instance.current_step = steps_at_next_level.first()
            instance.save()

    # =====================================================
    # Original Methods (Updated for Multi-Approver)
    # =====================================================

    @transaction.atomic
    def start_workflow(self, submission, workflow):
        """Start a new workflow instance for a submission."""

        submitter = submission.submitted_by

        # Create workflow instance
        instance = WorkflowInstance.objects.create(
            workflow=workflow,
            submission=submission,
            status='IN_PROGRESS',
            context_data={
                'submission_id': str(submission.id),
                'form_id': str(submission.form.id),
                'submitted_by': submission.submitted_by.username,
                'submitted_by_id': str(submission.submitted_by.id),
                'submission_data': submission.data
            }
        )

        # Track exclusions (submitter excluded from approvers) for context data
        all_exclusions = []

        # Get the first active step(s) based on workflow type
        if workflow.workflow_type == 'SEQUENTIAL':
            # For sequential, process step by step
            first_step = workflow.steps.order_by('order').first()
            if first_step:
                # Use multi-approver method - handles self-approval exclusion automatically
                approvals, exclusions = self._create_approvals_for_multi_step(instance, first_step, submitter)
                all_exclusions.extend(exclusions)

                instance.current_step = first_step
                instance.save()

        elif workflow.workflow_type == 'PARALLEL':
            # Create approvals for all steps
            steps = workflow.steps.all()
            for step in steps:
                if self._check_step_conditions(step, instance):
                    approvals, exclusions = self._create_approvals_for_multi_step(instance, step, submitter)
                    all_exclusions.extend(exclusions)

        elif workflow.workflow_type == 'CONDITIONAL':
            # Evaluate conditions to determine first step
            first_step = self._get_next_conditional_step(workflow, instance, None)
            if first_step:
                approvals, exclusions = self._create_approvals_for_multi_step(instance, first_step, submitter)
                all_exclusions.extend(exclusions)

                instance.current_step = first_step
                instance.save()

        elif workflow.workflow_type == 'HYBRID':
            # Hybrid combines sequential and parallel
            # Start with first sequential group (all steps at order=0)
            first_steps = workflow.steps.filter(order=0)
            for step in first_steps:
                if self._check_step_conditions(step, instance):
                    approvals, exclusions = self._create_approvals_for_multi_step(instance, step, submitter)
                    all_exclusions.extend(exclusions)
            if first_steps.exists():
                instance.current_step = first_steps.first()
                instance.save()

        # Store exclusion info in context (when submitter was excluded from approvers)
        if all_exclusions:
            instance.context_data['exclusions'] = all_exclusions
            instance.save()

        # Check if workflow is complete (no pending approvals)
        if self._check_workflow_completion(instance):
            instance.status = 'COMPLETED'
            instance.completed_at = timezone.now()
            instance.save()
            submission.status = 'APPROVED'
            submission.save()

        # Send initial notifications
        self._send_notifications(instance, 'ASSIGNED')

        return instance

    def _is_self_approval(self, step, submitter):
        """Check if the step's approver is the same as the submitter."""
        if step.assigned_user and step.assigned_user.id == submitter.id:
            return True
        return False

    def _find_eligible_reassignment_user(self, step, submitter):
        """
        Find an eligible user to reassign approval when self-approval is detected.

        Logic:
        1. Find users in SAME DEPARTMENT as the original approver
        2. Exclude the submitter
        3. Exclude admins and form managers (only regular users can be approvers)
        4. Select the one with LEAST pending approvals (workload)
        5. If no one found, return None (will fall back to admin)
        """
        from users.models import User
        from django.db.models import Count, Q

        # Get the department from the original assigned user
        original_user = step.assigned_user
        if not original_user or not original_user.department:
            return None

        department = original_user.department

        # Find eligible users in same department
        eligible_users = User.objects.filter(
            department=department,
            role='USER',  # Only regular users can be approvers
            is_active=True
        ).exclude(
            id=submitter.id  # Exclude the submitter
        )

        if not eligible_users.exists():
            return None

        # Annotate with pending approval count (workload)
        eligible_users = eligible_users.annotate(
            pending_count=Count(
                'assigned_approvals',
                filter=Q(assigned_approvals__status='PENDING')
            )
        ).order_by('pending_count')  # Least workload first

        return eligible_users.first()

    def _get_admin_fallback(self):
        """Get an admin user as fallback when no eligible users found."""
        from users.models import User

        # Get any active admin
        admin = User.objects.filter(
            role='ADMIN',
            is_active=True
        ).first()

        return admin

    def _get_next_non_self_step(self, workflow, instance, current_step, submitter):
        """Get the next step where the approver is not the submitter (deprecated - kept for compatibility)."""
        if current_step:
            next_steps = workflow.steps.filter(order__gt=current_step.order).order_by('order')
        else:
            next_steps = workflow.steps.all().order_by('order')

        for step in next_steps:
            if not self._is_self_approval(step, submitter):
                return step

        return None

    def _handle_self_approval_reassignment(self, instance, step, submitter):
        """
        Handle self-approval by reassigning to another user.

        Returns:
            tuple: (approval, reassigned_to_user) - always returns a valid approval
        """
        # Try to find eligible user in same department
        eligible_user = self._find_eligible_reassignment_user(step, submitter)

        if eligible_user:
            # Reassign to eligible user
            approval = self._create_reassigned_approval(instance, step, eligible_user, submitter)
            return approval, eligible_user

        # Fallback to admin
        admin = self._get_admin_fallback()
        if admin:
            approval = self._create_reassigned_approval(instance, step, admin, submitter, is_admin_fallback=True)
            return approval, admin

        # Last resort: If no department users and no admin available,
        # create a regular approval (workflow will need manual intervention)
        # This should rarely happen in a properly configured system
        approval = self._create_approval_for_step(instance, step)
        # Mark instance as needing attention
        instance.status = 'NEEDS_ADMIN_ACTION'
        instance.context_data['reassignment_failed'] = True
        instance.context_data['reassignment_failed_step'] = step.name
        instance.save()
        return approval, step.assigned_user

    def _create_reassigned_approval(self, instance, step, new_assignee, original_submitter, is_admin_fallback=False):
        """Create an approval that was reassigned due to self-approval conflict."""
        # Calculate due date if time limit is set
        due_date = None
        if step.time_limit_hours:
            due_date = timezone.now() + timedelta(hours=step.time_limit_hours)

        if is_admin_fallback:
            comments = f'Auto-reassigned to admin: Original approver ({original_submitter.username}) is the submitter, no other users available in department'
        else:
            comments = f'Auto-reassigned: Original approver ({original_submitter.username}) is the submitter'

        approval = WorkflowApproval.objects.create(
            workflow_instance=instance,
            workflow_step=step,
            status='PENDING',
            assigned_to=new_assignee,
            due_date=due_date,
            comments=comments
        )

        # Create notification for new assignee
        self._create_notification(
            approval,
            'ASSIGNED',
            new_assignee,
            f"Reassigned approval task: {step.name}",
            f"You have been assigned to {step.name} for {instance.submission.form.name} (auto-reassigned due to conflict)"
        )

        return approval

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
            if step.assigned_user.role not in ['ADMIN', 'MANAGER']:
                return step.assigned_user

        if step.assigned_role:
            # Find a user with this role (excluding admin and form manager)
            from users.models import User
            users = User.objects.filter(
                role=step.assigned_role,
                is_active=True
            ).exclude(role__in=['ADMIN', 'MANAGER'])

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
            except (TypeError, ValueError, AttributeError) as e:
                # Log the error for debugging but don't crash the workflow
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Condition evaluation failed for field '{field}': {e}")
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
        step = approval.workflow_step

        # Check if the STEP is complete based on approval_mode (ALL/MAJORITY/ANY)
        is_step_complete, is_step_rejected = self._check_step_completion(instance, step)

        if is_step_complete:
            if is_step_rejected:
                # Step was rejected (shouldn't happen in approve_step, but handle it)
                self._handle_step_rejection(instance, step)
            else:
                # Step is approved - handle progression
                self._handle_step_approval(instance, step)

    @transaction.atomic
    def reject_step(self, approval, user, comments=''):
        """Process a rejection for a workflow step."""

        # Update approval
        approval.reject(user, comments)

        instance = approval.workflow_instance
        step = approval.workflow_step

        # Check if the STEP is complete based on approval_mode (ALL/MAJORITY/ANY)
        is_step_complete, is_step_rejected = self._check_step_completion(instance, step)

        if is_step_complete:
            if is_step_rejected:
                # Step was rejected - handle rejection
                self._handle_step_rejection(instance, step)
            else:
                # Step passed despite this rejection (MAJORITY/ANY mode)
                self._handle_step_approval(instance, step)

    def _handle_sequential_progression(self, instance, completed_approval):
        """Handle progression for sequential workflows."""

        current_step = completed_approval.workflow_step
        next_step = instance.workflow.steps.filter(
            order__gt=current_step.order
        ).order_by('order').first()

        if next_step:
            instance.current_step = next_step
            instance.save()

            # Get submitter to check for self-approval
            submitter = instance.submission.submitted_by

            if self._is_self_approval(next_step, submitter):
                # Reassign to another user
                approval, new_assignee = self._handle_self_approval_reassignment(instance, next_step, submitter)
                if approval:
                    # Track reassignment in context
                    reassignments = instance.context_data.get('reassignments', [])
                    reassignments.append({
                        'step': next_step.name,
                        'original': submitter.username,
                        'reassigned_to': new_assignee.username,
                        'is_admin': new_assignee.role == 'ADMIN'
                    })
                    instance.context_data['reassignments'] = reassignments
                    instance.save()
            else:
                self._create_approval_for_step(instance, next_step)

    def _handle_parallel_progression(self, instance):
        """Handle progression for parallel workflows."""

        # Check if enough STEPS are complete (not individual approvals)
        # With multi-approver support, we count unique steps, not approval records
        required_steps = instance.workflow.steps.filter(is_required=True)
        total_steps = required_steps.count()

        if total_steps == 0:
            return

        # Count how many unique steps are complete (approved, not rejected)
        completed_step_count = 0
        for step in required_steps:
            is_complete, is_rejected = self._check_step_completion(instance, step)
            if is_complete and not is_rejected:
                completed_step_count += 1

        threshold = instance.workflow.approval_threshold
        approval_percentage = (completed_step_count / total_steps) * 100

        if approval_percentage >= threshold:
            instance.status = 'COMPLETED'
            instance.completed_at = timezone.now()
            instance.save()
            # Also update submission status
            instance.submission.status = 'APPROVED'
            instance.submission.save()

    def _handle_conditional_progression(self, instance, completed_approval):
        """Handle progression for conditional workflows."""

        current_step = completed_approval.workflow_step
        next_step = self._get_next_conditional_step(
            instance.workflow, instance, current_step
        )

        if next_step:
            instance.current_step = next_step
            instance.save()

            # Get submitter to check for self-approval
            submitter = instance.submission.submitted_by

            if self._is_self_approval(next_step, submitter):
                # Reassign to another user
                approval, new_assignee = self._handle_self_approval_reassignment(instance, next_step, submitter)
                if approval:
                    # Track reassignment in context
                    reassignments = instance.context_data.get('reassignments', [])
                    reassignments.append({
                        'step': next_step.name,
                        'original': submitter.username,
                        'reassigned_to': new_assignee.username,
                        'is_admin': new_assignee.role == 'ADMIN'
                    })
                    instance.context_data['reassignments'] = reassignments
                    instance.save()
            else:
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

            # Get submitter to check for self-approval
            submitter = instance.submission.submitted_by

            for step in steps_at_next_level:
                if self._check_step_conditions(step, instance):
                    if self._is_self_approval(step, submitter):
                        # Reassign to another user
                        approval, new_assignee = self._handle_self_approval_reassignment(instance, step, submitter)
                        if approval:
                            # Track reassignment in context
                            reassignments = instance.context_data.get('reassignments', [])
                            reassignments.append({
                                'step': step.name,
                                'original': submitter.username,
                                'reassigned_to': new_assignee.username,
                                'is_admin': new_assignee.role == 'ADMIN'
                            })
                            instance.context_data['reassignments'] = reassignments
                    else:
                        self._create_approval_for_step(instance, step)

            instance.current_step = steps_at_next_level.first()
            instance.save()

    def _check_workflow_completion(self, instance):
        """Check if a workflow instance is complete."""

        workflow = instance.workflow

        if workflow.workflow_type == 'SEQUENTIAL':
            # For sequential workflows, check if ALL required steps have been approved
            # With multi-approver support, we need to count UNIQUE STEPS that are complete
            # (not individual approval records)
            required_steps = workflow.steps.filter(is_required=True)
            total_required_steps = required_steps.count()

            # Count how many unique steps are complete (approved, not rejected)
            completed_step_count = 0
            for step in required_steps:
                is_complete, is_rejected = self._check_step_completion(instance, step)
                if is_complete and not is_rejected:
                    completed_step_count += 1

            return completed_step_count >= total_required_steps

        elif workflow.workflow_type == 'PARALLEL':
            # Complete based on threshold - count unique steps, not individual approvals
            required_steps = workflow.steps.filter(is_required=True)
            total_steps = required_steps.count()

            if total_steps == 0:
                return True

            # Count how many unique steps are complete (approved, not rejected)
            completed_step_count = 0
            for step in required_steps:
                is_complete, is_rejected = self._check_step_completion(instance, step)
                if is_complete and not is_rejected:
                    completed_step_count += 1

            approval_percentage = (completed_step_count / total_steps) * 100
            return approval_percentage >= workflow.approval_threshold

        elif workflow.workflow_type in ['CONDITIONAL', 'HYBRID']:
            # Complete if all required steps are complete (using step-level completion check)
            # With multi-approver support, we check each step's completion status
            required_steps = workflow.steps.filter(is_required=True)

            if required_steps.count() == 0:
                return True

            # Check each required step - all must be complete and not rejected
            for step in required_steps:
                # Check if this step has any approvals for this instance
                step_approvals = instance.approvals.filter(workflow_step=step)
                if not step_approvals.exists():
                    # Step hasn't been reached yet
                    return False

                is_complete, is_rejected = self._check_step_completion(instance, step)
                if is_rejected:
                    # Step was rejected - workflow is failed, not complete
                    return False
                if not is_complete:
                    # Step still pending
                    return False

            return True

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
                role='MANAGER'
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