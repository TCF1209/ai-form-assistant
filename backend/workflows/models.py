"""
Workflow models for managing approval processes and form workflows.
"""

from django.db import models
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
import uuid

User = get_user_model()


class Workflow(models.Model):
    """
    Main workflow model defining approval processes.
    """

    class WorkflowType(models.TextChoices):
        SEQUENTIAL = 'SEQUENTIAL', _('Sequential Approval')
        PARALLEL = 'PARALLEL', _('Parallel Approval')
        CONDITIONAL = 'CONDITIONAL', _('Conditional Routing')
        HYBRID = 'HYBRID', _('Hybrid Workflow')

    class WorkflowStatus(models.TextChoices):
        DRAFT = 'DRAFT', _('Draft')
        ACTIVE = 'ACTIVE', _('Active')
        INACTIVE = 'INACTIVE', _('Inactive')
        ARCHIVED = 'ARCHIVED', _('Archived')

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    code = models.CharField(
        max_length=50,
        unique=True,
        help_text=_('Unique workflow identifier')
    )
    description = models.TextField(blank=True)
    form = models.ForeignKey(
        'forms.Form',
        on_delete=models.CASCADE,
        related_name='workflows'
    )
    workflow_type = models.CharField(
        max_length=20,
        choices=WorkflowType.choices,
        default=WorkflowType.SEQUENTIAL
    )
    status = models.CharField(
        max_length=20,
        choices=WorkflowStatus.choices,
        default=WorkflowStatus.DRAFT
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_workflows'
    )

    # Workflow configuration
    config = models.JSONField(
        default=dict,
        help_text=_('Workflow configuration (timeouts, escalation rules, etc.)')
    )

    # Approval settings
    approval_threshold = models.IntegerField(
        default=100,
        help_text=_('Percentage of approvals required (for parallel workflows)')
    )
    allow_delegation = models.BooleanField(default=True)
    allow_comments = models.BooleanField(default=True)
    auto_escalate = models.BooleanField(default=False)
    escalation_days = models.IntegerField(
        default=3,
        help_text=_('Days before auto-escalation')
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'workflows'
        verbose_name = _('Workflow')
        verbose_name_plural = _('Workflows')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['form', 'status']),
            models.Index(fields=['code']),
        ]
        # Ensure only one workflow per form to keep the system simple
        constraints = [
            models.UniqueConstraint(
                fields=['form'],
                name='unique_workflow_per_form'
            )
        ]

    def __str__(self):
        return f"{self.name} ({self.workflow_type})"


class WorkflowStep(models.Model):
    """
    Individual steps in a workflow.
    """

    class StepType(models.TextChoices):
        APPROVAL = 'APPROVAL', _('Approval')
        REVIEW = 'REVIEW', _('Review')
        NOTIFICATION = 'NOTIFICATION', _('Notification')
        CONDITIONAL = 'CONDITIONAL', _('Conditional')
        SYSTEM = 'SYSTEM', _('System Action')

    class ApprovalMode(models.TextChoices):
        ALL = 'ALL', _('All Must Approve')
        MAJORITY = 'MAJORITY', _('Majority Must Approve')
        ANY = 'ANY', _('Any One Can Approve')

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workflow = models.ForeignKey(
        Workflow,
        on_delete=models.CASCADE,
        related_name='steps'
    )
    name = models.CharField(max_length=200)
    step_type = models.CharField(
        max_length=20,
        choices=StepType.choices,
        default=StepType.APPROVAL
    )
    order = models.IntegerField(default=0)

    # Assignee configuration
    assigned_role = models.CharField(
        max_length=20,
        blank=True,
        help_text=_('Role that can perform this step')
    )
    assigned_user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_workflow_steps'
    )
    assigned_department = models.ForeignKey(
        'users.Department',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='workflow_steps'
    )

    # Multi-approver support
    approval_mode = models.CharField(
        max_length=20,
        choices=ApprovalMode.choices,
        default=ApprovalMode.ALL,
        help_text=_('How approvals are determined for this step')
    )
    assigned_users = models.ManyToManyField(
        User,
        through='WorkflowStepApprover',
        related_name='multi_assigned_workflow_steps',
        blank=True
    )

    # Step configuration
    is_required = models.BooleanField(default=True)
    can_skip = models.BooleanField(default=False)
    time_limit_hours = models.IntegerField(
        null=True,
        blank=True,
        help_text=_('Time limit for this step in hours')
    )

    # Conditional logic
    conditions = models.JSONField(
        default=dict,
        blank=True,
        help_text=_('Conditions for this step to be active')
    )

    # Actions to perform
    actions = models.JSONField(
        default=dict,
        blank=True,
        help_text=_('Actions to perform when step is completed')
    )

    class Meta:
        db_table = 'workflow_steps'
        verbose_name = _('Workflow Step')
        verbose_name_plural = _('Workflow Steps')
        ordering = ['workflow', 'order']
        unique_together = [['workflow', 'order']]
        indexes = [
            models.Index(fields=['workflow', 'order']),
        ]

    def __str__(self):
        return f"{self.workflow.name} - Step {self.order}: {self.name}"


class WorkflowStepApprover(models.Model):
    """
    Through model for many-to-many relationship between WorkflowStep and User.
    Allows multiple approvers per workflow step.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workflow_step = models.ForeignKey(
        'WorkflowStep',
        on_delete=models.CASCADE,
        related_name='step_approvers'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='workflow_step_assignments'
    )
    order = models.IntegerField(
        default=0,
        help_text=_('Order of approver within the step (for display purposes)')
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'workflow_step_approvers'
        verbose_name = _('Workflow Step Approver')
        verbose_name_plural = _('Workflow Step Approvers')
        ordering = ['workflow_step', 'order']
        unique_together = [['workflow_step', 'user']]

    def __str__(self):
        return f"{self.workflow_step.name} - {self.user.username}"


class WorkflowInstance(models.Model):
    """
    Instance of a workflow for a specific form submission.
    """

    class InstanceStatus(models.TextChoices):
        PENDING = 'PENDING', _('Pending')
        IN_PROGRESS = 'IN_PROGRESS', _('In Progress')
        COMPLETED = 'COMPLETED', _('Completed')
        CANCELLED = 'CANCELLED', _('Cancelled')
        FAILED = 'FAILED', _('Failed')
        EXPIRED = 'EXPIRED', _('Expired')
        NEEDS_ADMIN_ACTION = 'NEEDS_ADMIN_ACTION', _('Needs Admin Action')

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workflow = models.ForeignKey(
        Workflow,
        on_delete=models.CASCADE,
        related_name='instances'
    )
    submission = models.ForeignKey(
        'forms.FormSubmission',
        on_delete=models.CASCADE,
        related_name='workflow_instances'
    )
    status = models.CharField(
        max_length=20,
        choices=InstanceStatus.choices,
        default=InstanceStatus.PENDING
    )
    current_step = models.ForeignKey(
        WorkflowStep,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='current_instances'
    )

    # Tracking
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancelled_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cancelled_workflows'
    )
    cancellation_reason = models.TextField(blank=True)

    # Instance data
    context_data = models.JSONField(
        default=dict,
        help_text=_('Workflow instance context data')
    )

    class Meta:
        db_table = 'workflow_instances'
        verbose_name = _('Workflow Instance')
        verbose_name_plural = _('Workflow Instances')
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['workflow', 'status']),
            models.Index(fields=['submission']),
            models.Index(fields=['status', '-started_at']),
        ]

    def __str__(self):
        return f"{self.workflow.name} - {self.submission.submission_number}"


class WorkflowApproval(models.Model):
    """
    Individual approval/action records for workflow steps.
    """

    class ApprovalStatus(models.TextChoices):
        PENDING = 'PENDING', _('Pending')
        APPROVED = 'APPROVED', _('Approved')
        REJECTED = 'REJECTED', _('Rejected')
        SKIPPED = 'SKIPPED', _('Skipped')
        DELEGATED = 'DELEGATED', _('Delegated')
        EXPIRED = 'EXPIRED', _('Expired')

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workflow_instance = models.ForeignKey(
        WorkflowInstance,
        on_delete=models.CASCADE,
        related_name='approvals'
    )
    workflow_step = models.ForeignKey(
        WorkflowStep,
        on_delete=models.CASCADE,
        related_name='approvals'
    )
    status = models.CharField(
        max_length=20,
        choices=ApprovalStatus.choices,
        default=ApprovalStatus.PENDING
    )

    # Approver information
    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='assigned_approvals'
    )
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='completed_approvals'
    )
    delegated_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='delegated_approvals'
    )

    # Approval details
    comments = models.TextField(blank=True)
    attachments = models.JSONField(
        default=list,
        blank=True,
        help_text=_('List of attached file IDs')
    )

    # Timestamps
    assigned_at = models.DateTimeField(auto_now_add=True)
    due_date = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    # Metadata
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)

    class Meta:
        db_table = 'workflow_approvals'
        verbose_name = _('Workflow Approval')
        verbose_name_plural = _('Workflow Approvals')
        ordering = ['-assigned_at']
        indexes = [
            models.Index(fields=['workflow_instance', 'status']),
            models.Index(fields=['assigned_to', 'status']),
            models.Index(fields=['status', '-assigned_at']),
        ]

    def __str__(self):
        return f"{self.workflow_step.name} - {self.status}"

    def approve(self, user, comments=''):
        """Approve this workflow step."""
        self.status = self.ApprovalStatus.APPROVED
        self.approved_by = user
        self.completed_at = timezone.now()
        self.comments = comments
        self.save()

    def reject(self, user, comments=''):
        """Reject this workflow step."""
        self.status = self.ApprovalStatus.REJECTED
        self.approved_by = user
        self.completed_at = timezone.now()
        self.comments = comments
        self.save()

    def delegate(self, from_user, to_user, comments=''):
        """Delegate this approval to another user."""
        self.status = self.ApprovalStatus.DELEGATED
        self.delegated_to = to_user
        self.comments = comments
        self.save()

        # Create new approval for delegated user
        new_approval = WorkflowApproval.objects.create(
            workflow_instance=self.workflow_instance,
            workflow_step=self.workflow_step,
            assigned_to=to_user,
            status=self.ApprovalStatus.PENDING
        )
        return new_approval


class WorkflowNotification(models.Model):
    """
    Notifications related to workflow events.
    """

    class NotificationType(models.TextChoices):
        ASSIGNED = 'ASSIGNED', _('Task Assigned')
        REMINDER = 'REMINDER', _('Reminder')
        ESCALATION = 'ESCALATION', _('Escalation')
        COMPLETED = 'COMPLETED', _('Task Completed')
        REJECTED = 'REJECTED', _('Task Rejected')
        DELEGATED = 'DELEGATED', _('Task Delegated')

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workflow_approval = models.ForeignKey(
        WorkflowApproval,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    notification_type = models.CharField(
        max_length=20,
        choices=NotificationType.choices
    )
    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='workflow_notifications'
    )
    subject = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    is_sent = models.BooleanField(default=False)
    sent_at = models.DateTimeField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'workflow_notifications'
        verbose_name = _('Workflow Notification')
        verbose_name_plural = _('Workflow Notifications')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_read']),
            models.Index(fields=['workflow_approval']),
        ]

    def __str__(self):
        return f"{self.notification_type} - {self.recipient.email}"
