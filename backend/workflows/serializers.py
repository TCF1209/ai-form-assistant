"""
Workflow serializers for API endpoints.
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db import transaction
from .models import (
    Workflow, WorkflowStep, WorkflowStepApprover, WorkflowInstance,
    WorkflowApproval, WorkflowNotification
)

User = get_user_model()


class WorkflowStepSerializer(serializers.ModelSerializer):
    """Serializer for workflow steps."""

    assigned_user_detail = serializers.SerializerMethodField()
    assigned_department_detail = serializers.SerializerMethodField()
    assigned_users_detail = serializers.SerializerMethodField()
    approvers = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        write_only=True,
        help_text="List of user IDs to assign as approvers"
    )

    class Meta:
        model = WorkflowStep
        fields = [
            'id', 'name', 'step_type', 'order',
            'assigned_role', 'assigned_user', 'assigned_user_detail',
            'assigned_department', 'assigned_department_detail',
            'approval_mode', 'approvers', 'assigned_users_detail',
            'is_required', 'can_skip', 'time_limit_hours',
            'conditions', 'actions'
        ]

    def get_assigned_user_detail(self, obj):
        """Backward compatibility: Return single assigned user detail."""
        if obj.assigned_user:
            return {
                'id': str(obj.assigned_user.id),
                'username': obj.assigned_user.username,
                'email': obj.assigned_user.email,
                'full_name': f"{obj.assigned_user.first_name} {obj.assigned_user.last_name}".strip()
            }
        return None

    def get_assigned_users_detail(self, obj):
        """Return list of all assigned approvers for multi-approver support."""
        step_approvers = obj.step_approvers.select_related('user').order_by('order')
        return [{
            'id': str(sa.user.id),
            'username': sa.user.username,
            'email': sa.user.email,
            'full_name': f"{sa.user.first_name} {sa.user.last_name}".strip(),
            'order': sa.order
        } for sa in step_approvers]

    def get_assigned_department_detail(self, obj):
        if obj.assigned_department:
            return {
                'id': str(obj.assigned_department.id),
                'name': obj.assigned_department.name,
                'code': obj.assigned_department.code
            }
        return None

    def validate_assigned_user(self, value):
        """Ensure only regular users can be approvers."""
        if value and value.role in ['ADMIN', 'FORM_MANAGER']:
            raise serializers.ValidationError(
                "Admins and Form Managers cannot be approvers. Only regular users can approve."
            )
        return value

    def validate_approvers(self, approvers):
        """Validate that all approvers are regular users."""
        if not approvers:
            return approvers

        for user_id in approvers:
            try:
                user = User.objects.get(id=user_id)
                if user.role in ['ADMIN', 'FORM_MANAGER']:
                    raise serializers.ValidationError(
                        f"User {user.username} cannot be an approver (role: {user.role}). "
                        "Only regular users can be approvers."
                    )
            except User.DoesNotExist:
                raise serializers.ValidationError(f"User with ID {user_id} not found")
        return approvers


class WorkflowSerializer(serializers.ModelSerializer):
    """Main workflow serializer."""

    steps = WorkflowStepSerializer(many=True, required=False)
    form_detail = serializers.SerializerMethodField()
    created_by_detail = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()
    can_delete = serializers.SerializerMethodField()

    class Meta:
        model = Workflow
        fields = [
            'id', 'name', 'code', 'description', 'form', 'form_detail',
            'workflow_type', 'status', 'created_by', 'created_by_detail',
            'config', 'approval_threshold', 'allow_delegation',
            'allow_comments', 'auto_escalate', 'escalation_days',
            'steps', 'can_edit', 'can_delete',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'code', 'created_at', 'updated_at']  # code is now auto-generated

    def get_form_detail(self, obj):
        if obj.form:
            return {
                'id': str(obj.form.id),
                'name': obj.form.name,
                'code': obj.form.code,
                'department': str(obj.form.department.id) if obj.form.department else None,
                'department_name': obj.form.department.name if obj.form.department else None
            }
        return None

    def get_created_by_detail(self, obj):
        if obj.created_by:
            return {
                'id': str(obj.created_by.id),
                'username': obj.created_by.username,
                'email': obj.created_by.email
            }
        return None

    def get_can_edit(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False

        user = request.user
        # Admin can edit all workflows
        if user.role == 'ADMIN':
            return True
        # Form Manager can edit workflows in their department
        if user.role == 'FORM_MANAGER' and obj.form.department == user.department:
            return True
        return False

    def get_can_delete(self, obj):
        return self.get_can_edit(obj)

    def _generate_workflow_code(self, name):
        """Generate a unique workflow code from the name."""
        import re
        import uuid

        # Convert name to uppercase, replace spaces and special chars with underscores
        base_code = re.sub(r'[^A-Z0-9]+', '_', name.upper())
        base_code = re.sub(r'_+', '_', base_code).strip('_')  # Remove duplicate and trailing underscores

        # Limit length and ensure uniqueness
        base_code = base_code[:20] if len(base_code) > 20 else base_code

        # Check if code exists, if so append a short unique suffix
        code = base_code
        counter = 1
        while Workflow.objects.filter(code=code).exists():
            suffix = f"_{counter}"
            code = f"{base_code[:20-len(suffix)]}{suffix}"
            counter += 1
            if counter > 100:  # Fallback to UUID suffix
                code = f"{base_code[:12]}_{uuid.uuid4().hex[:6].upper()}"
                break

        return code

    def validate_steps(self, steps_data):
        """Validate workflow steps - check for at least one approver per step."""
        if not steps_data:
            return steps_data

        for i, step in enumerate(steps_data):
            # Check if step has either approvers list or assigned_user
            approvers = step.get('approvers', [])
            assigned_user = step.get('assigned_user')

            if not approvers and not assigned_user:
                raise serializers.ValidationError(
                    f"Step {i + 1} ({step.get('name', 'Unnamed')}) must have at least one approver."
                )

            # Validate no duplicate approvers within the same step
            if approvers and len(approvers) != len(set(approvers)):
                raise serializers.ValidationError(
                    f"Step {i + 1} ({step.get('name', 'Unnamed')}) has duplicate approvers."
                )

        return steps_data

    @transaction.atomic
    def create(self, validated_data):
        steps_data = validated_data.pop('steps', [])

        # Auto-generate workflow code from name
        validated_data['code'] = self._generate_workflow_code(validated_data.get('name', 'WORKFLOW'))

        workflow = Workflow.objects.create(**validated_data)

        # Create workflow steps with approvers
        for step_data in steps_data:
            approvers = step_data.pop('approvers', [])
            step = WorkflowStep.objects.create(workflow=workflow, **step_data)

            # Create WorkflowStepApprover records for multi-approver support
            for order, user_id in enumerate(approvers):
                WorkflowStepApprover.objects.create(
                    workflow_step=step,
                    user_id=user_id,
                    order=order
                )

            # Backward compatibility: If no approvers but has assigned_user, create approver record
            if not approvers and step.assigned_user:
                WorkflowStepApprover.objects.create(
                    workflow_step=step,
                    user=step.assigned_user,
                    order=0
                )

        return workflow

    @transaction.atomic
    def update(self, instance, validated_data):
        steps_data = validated_data.pop('steps', None)

        # Update workflow fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update steps if provided
        if steps_data is not None:
            # Delete existing steps (cascade deletes WorkflowStepApprover records)
            instance.steps.all().delete()

            # Create new steps with approvers
            for step_data in steps_data:
                approvers = step_data.pop('approvers', [])
                step = WorkflowStep.objects.create(workflow=instance, **step_data)

                # Create WorkflowStepApprover records
                for order, user_id in enumerate(approvers):
                    WorkflowStepApprover.objects.create(
                        workflow_step=step,
                        user_id=user_id,
                        order=order
                    )

                # Backward compatibility: If no approvers but has assigned_user
                if not approvers and step.assigned_user:
                    WorkflowStepApprover.objects.create(
                        workflow_step=step,
                        user=step.assigned_user,
                        order=0
                    )

        return instance


class WorkflowListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for workflow lists."""

    form_name = serializers.CharField(source='form.name', read_only=True)
    department_name = serializers.CharField(source='form.department.name', read_only=True)
    steps_count = serializers.IntegerField(source='steps.count', read_only=True)

    class Meta:
        model = Workflow
        fields = [
            'id', 'name', 'code', 'form', 'workflow_type', 'status',
            'form_name', 'department_name', 'steps_count',
            'created_at'
        ]


class WorkflowInstanceSerializer(serializers.ModelSerializer):
    """Serializer for workflow instances."""

    workflow_detail = serializers.SerializerMethodField()
    submission_detail = serializers.SerializerMethodField()
    current_step_detail = serializers.SerializerMethodField()
    approvals = serializers.SerializerMethodField()

    class Meta:
        model = WorkflowInstance
        fields = [
            'id', 'workflow', 'workflow_detail', 'submission', 'submission_detail',
            'status', 'current_step', 'current_step_detail',
            'started_at', 'completed_at', 'cancelled_at',
            'cancelled_by', 'cancellation_reason', 'context_data',
            'approvals'
        ]
        read_only_fields = ['id', 'started_at']

    def get_workflow_detail(self, obj):
        return {
            'id': str(obj.workflow.id),
            'name': obj.workflow.name,
            'type': obj.workflow.workflow_type
        }

    def get_submission_detail(self, obj):
        return {
            'id': str(obj.submission.id),
            'submission_number': obj.submission.submission_number,
            'form_name': obj.submission.form.name,
            'submitted_by': obj.submission.submitted_by.username if obj.submission.submitted_by else None
        }

    def get_current_step_detail(self, obj):
        if obj.current_step:
            return {
                'id': str(obj.current_step.id),
                'name': obj.current_step.name,
                'order': obj.current_step.order,
                'type': obj.current_step.step_type
            }
        return None

    def get_approvals(self, obj):
        approvals = obj.approvals.all().order_by('workflow_step__order')
        return WorkflowApprovalSerializer(approvals, many=True).data


class WorkflowApprovalSerializer(serializers.ModelSerializer):
    """Serializer for workflow approvals."""

    step_detail = serializers.SerializerMethodField()
    assigned_to_detail = serializers.SerializerMethodField()
    approved_by_detail = serializers.SerializerMethodField()
    submission_detail = serializers.SerializerMethodField()

    class Meta:
        model = WorkflowApproval
        fields = [
            'id', 'workflow_instance', 'workflow_step', 'step_detail',
            'status', 'assigned_to', 'assigned_to_detail',
            'approved_by', 'approved_by_detail', 'delegated_to',
            'comments', 'attachments', 'assigned_at', 'due_date',
            'completed_at', 'submission_detail'
        ]
        read_only_fields = ['id', 'assigned_at']

    def get_step_detail(self, obj):
        return {
            'id': str(obj.workflow_step.id),
            'name': obj.workflow_step.name,
            'order': obj.workflow_step.order,
            'type': obj.workflow_step.step_type,
            'approval_mode': obj.workflow_step.approval_mode
        }

    def get_assigned_to_detail(self, obj):
        if obj.assigned_to:
            return {
                'id': str(obj.assigned_to.id),
                'username': obj.assigned_to.username,
                'email': obj.assigned_to.email
            }
        return None

    def get_approved_by_detail(self, obj):
        if obj.approved_by:
            return {
                'id': str(obj.approved_by.id),
                'username': obj.approved_by.username,
                'email': obj.approved_by.email
            }
        return None

    def get_submission_detail(self, obj):
        if obj.workflow_instance and obj.workflow_instance.submission:
            submission = obj.workflow_instance.submission
            form_detail = None
            if submission.form:
                form_detail = {
                    'id': str(submission.form.id),
                    'name': submission.form.name,
                    'code': submission.form.code,
                    'department_name': submission.form.department.name if submission.form.department else None
                }
            submitted_by_detail = None
            if submission.submitted_by:
                full_name = f"{submission.submitted_by.first_name} {submission.submitted_by.last_name}".strip()
                submitted_by_detail = {
                    'id': str(submission.submitted_by.id),
                    'username': submission.submitted_by.username,
                    'email': submission.submitted_by.email,
                    'full_name': full_name if full_name else submission.submitted_by.username
                }
            return {
                'id': str(submission.id),
                'submission_number': submission.submission_number,
                'form_detail': form_detail,
                'submitted_by_detail': submitted_by_detail,
                'status': submission.status,
                'data': submission.data
            }
        return None


class ApprovalActionSerializer(serializers.Serializer):
    """Serializer for approval actions (approve/reject)."""

    action = serializers.ChoiceField(choices=['approve', 'reject', 'delegate'])
    comments = serializers.CharField(required=False, allow_blank=True)
    delegate_to = serializers.UUIDField(required=False)

    def validate(self, data):
        if data['action'] == 'delegate' and not data.get('delegate_to'):
            raise serializers.ValidationError("delegate_to is required when action is 'delegate'")

        if data.get('delegate_to'):
            try:
                user = User.objects.get(id=data['delegate_to'])
                if user.role in ['ADMIN', 'FORM_MANAGER']:
                    raise serializers.ValidationError(
                        "Cannot delegate to Admin or Form Manager. Only regular users can be approvers."
                    )
                data['delegate_to'] = user
            except User.DoesNotExist:
                raise serializers.ValidationError("Invalid user ID for delegation")

        return data


class WorkflowNotificationSerializer(serializers.ModelSerializer):
    """Serializer for workflow notifications."""

    workflow_approval_detail = serializers.SerializerMethodField()

    class Meta:
        model = WorkflowNotification
        fields = [
            'id', 'workflow_approval', 'workflow_approval_detail',
            'notification_type', 'recipient', 'subject', 'message',
            'is_read', 'is_sent', 'sent_at', 'read_at', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def get_workflow_approval_detail(self, obj):
        return {
            'id': str(obj.workflow_approval.id),
            'step_name': obj.workflow_approval.workflow_step.name,
            'workflow_name': obj.workflow_approval.workflow_instance.workflow.name
        }