"""
Workflow views for managing approval processes.
"""

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied, ValidationError
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from django.utils import timezone

from .models import (
    ACTIVE_INSTANCE_STATUSES, Workflow, WorkflowStep, WorkflowInstance,
    WorkflowApproval, WorkflowNotification
)
from .serializers import (
    WorkflowSerializer, WorkflowListSerializer, WorkflowStepSerializer,
    WorkflowInstanceSerializer, WorkflowApprovalSerializer,
    ApprovalActionSerializer, WorkflowNotificationSerializer
)
from .engine import WorkflowEngine, WorkflowError
from forms.models import FormSubmission
from users.audit import log_create, log_update, log_delete, log_approve, log_reject
from users.permissions import IsStaffOrReadOnly


class WorkflowViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing workflows.

    Permissions:
    - Admin: Can create/edit/delete workflows for all departments
    - Form Manager: Can create/edit/delete workflows for their department's forms only
    - Regular User: Read-only access to active workflows
    """

    queryset = Workflow.objects.all()
    serializer_class = WorkflowSerializer
    permission_classes = [IsAuthenticated, IsStaffOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'workflow_type', 'form__department']
    search_fields = ['name', 'code', 'description']
    ordering_fields = ['name', 'created_at', 'updated_at']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return WorkflowListSerializer
        return WorkflowSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset().select_related(
            'form', 'form__department', 'created_by'
        ).prefetch_related('steps')

        # Filter based on user role
        if user.role == 'ADMIN':
            # Admin can see all workflows
            return queryset
        elif user.role == 'MANAGER':
            # Form Manager can see workflows in their department
            return queryset.filter(form__department=user.department)
        else:
            # Regular users can see active workflows in their department
            return queryset.filter(
                status='ACTIVE',
                form__department=user.department
            )

    def perform_create(self, serializer):
        user = self.request.user
        form = serializer.validated_data.get('form')

        # Permission check
        if user.role == 'MANAGER' and form.department != user.department:
            raise PermissionDenied("You can only create workflows for forms in your department.")

        # Check if form already has a workflow
        if Workflow.objects.filter(form=form).exists():
            raise ValidationError(
                f"The form '{form.name}' already has a workflow. "
                "Each form can only have one workflow. "
                "Please delete the existing workflow first if you want to create a new one."
            )

        workflow = serializer.save(created_by=user)

        # Log the workflow creation
        log_create(user, 'Workflow', workflow, self.request)

    def perform_update(self, serializer):
        user = self.request.user
        instance = self.get_object()

        # Permission check
        if user.role == 'MANAGER' and instance.form.department != user.department:
            raise PermissionDenied("You can only edit workflows for forms in your department.")

        # Track old data for audit log
        old_data = {'name': instance.name, 'status': instance.status}
        workflow = serializer.save()

        # Log the workflow update
        log_update(user, 'Workflow', workflow, {'old': old_data, 'new': serializer.validated_data}, self.request)

    def perform_destroy(self, instance):
        user = self.request.user

        # Permission check
        if user.role == 'MANAGER' and instance.form.department != user.department:
            raise PermissionDenied("You can only delete workflows for forms in your department.")

        # Check if workflow status allows deletion
        if instance.status in ['ACTIVE', 'ARCHIVED']:
            raise ValidationError(f"Cannot delete workflow with status '{instance.status}'. Please deactivate it first.")

        # Check if workflow has active instances
        active_instances = instance.instances.filter(status__in=ACTIVE_INSTANCE_STATUSES)
        if active_instances.exists():
            raise ValidationError(
                f"Cannot delete workflow. {active_instances.count()} request(s) are still being approved with it. "
                "Please complete or cancel them before deleting the workflow."
            )

        # Store info before deletion for audit log
        workflow_id = str(instance.id)
        workflow_repr = str(instance)

        instance.delete()

        # Log the workflow deletion
        log_delete(user, 'Workflow', workflow_id, workflow_repr, self.request)

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate a workflow."""
        workflow = self.get_object()

        # Ensure workflow has at least one step
        if not workflow.steps.exists():
            return Response(
                {'error': 'Workflow must have at least one step to be activated.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        workflow.status = 'ACTIVE'
        workflow.save()

        return Response({'status': 'Workflow activated'})

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Deactivate a workflow."""
        workflow = self.get_object()
        workflow.status = 'INACTIVE'
        workflow.save()

        return Response({'status': 'Workflow deactivated'})

    @action(detail=True, methods=['get'])
    def preview(self, request, pk=None):
        """Get a preview of the workflow with all steps."""
        workflow = self.get_object()
        serializer = self.get_serializer(workflow)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def check_instances(self, request, pk=None):
        """Check workflow instances status."""
        workflow = self.get_object()

        instances = workflow.instances.all()
        active_instances = instances.filter(status__in=ACTIVE_INSTANCE_STATUSES)

        return Response({
            'total_instances': instances.count(),
            'active_instances': active_instances.count(),
            'pending': instances.filter(status='PENDING').count(),
            'in_progress': instances.filter(status='IN_PROGRESS').count(),
            'completed': instances.filter(status='COMPLETED').count(),
            'cancelled': instances.filter(status='CANCELLED').count(),
            'can_delete': active_instances.count() == 0 and workflow.status not in ['ACTIVE', 'ARCHIVED']
        })

    @action(detail=True, methods=['post'])
    def cancel_instances(self, request, pk=None):
        """Cancel all active instances of a workflow."""
        workflow = self.get_object()
        user = request.user

        # Permission check
        if user.role == 'MANAGER' and workflow.form.department != user.department:
            raise PermissionDenied("You can only manage workflows in your department.")

        active_instances = list(workflow.instances.filter(status__in=ACTIVE_INSTANCE_STATUSES))
        count = len(active_instances)

        if count == 0:
            return Response({'message': 'No active instances to cancel'})

        engine = WorkflowEngine()
        for instance in active_instances:
            engine.cancel(instance, user, 'Cancelled so the workflow can be deleted')

        return Response({
            'status': 'success',
            'message': f'Successfully cancelled {count} active instance(s)'
        })


class WorkflowStepViewSet(viewsets.ModelViewSet):
    """ViewSet for managing workflow steps."""

    queryset = WorkflowStep.objects.all()
    serializer_class = WorkflowStepSerializer
    permission_classes = [IsAuthenticated, IsStaffOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset().select_related(
            'workflow', 'workflow__form', 'assigned_user', 'assigned_department'
        )

        # Filter based on workflow permissions
        if user.role == 'ADMIN':
            return queryset
        elif user.role == 'MANAGER':
            return queryset.filter(workflow__form__department=user.department)
        else:
            return queryset.filter(
                workflow__status='ACTIVE',
                workflow__form__department=user.department
            )


class WorkflowInstanceViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read access to workflow instances. Their state only changes through the engine:
    starting, cancelling and admin decisions here, approver decisions on WorkflowApprovalViewSet.
    """

    queryset = WorkflowInstance.objects.all()
    serializer_class = WorkflowInstanceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['workflow', 'status', 'submission']
    ordering = ['-started_at']

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset().select_related(
            'workflow', 'workflow__form', 'submission', 'submission__submitted_by',
            'current_step', 'cancelled_by'
        ).prefetch_related('approvals')

        if user.role == 'ADMIN':
            return queryset
        elif user.role == 'MANAGER':
            return queryset.filter(workflow__form__department=user.department)
        else:
            # Users can see instances they're involved in
            return queryset.filter(
                Q(submission__submitted_by=user) |
                Q(approvals__assigned_to=user)
            ).distinct()

    def _require_staff(self, department):
        user = self.request.user
        if user.role == 'ADMIN' or (user.role == 'MANAGER' and department == user.department):
            return
        raise PermissionDenied('Only Admins and the Form Manager of this department can do this.')

    @action(detail=False, methods=['post'])
    def start(self, request):
        """Start a workflow for a submission."""
        submission_id = request.data.get('submission_id')
        workflow_id = request.data.get('workflow_id')

        if not submission_id or not workflow_id:
            return Response(
                {'error': 'submission_id and workflow_id are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            submission = FormSubmission.objects.get(id=submission_id)
            workflow = Workflow.objects.get(id=workflow_id, form=submission.form)
        except (FormSubmission.DoesNotExist, Workflow.DoesNotExist):
            return Response(
                {'error': 'Submission or Workflow not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        self._require_staff(workflow.form.department)

        if workflow.status != 'ACTIVE':
            return Response({'error': 'Workflow is not active'}, status=status.HTTP_400_BAD_REQUEST)
        if submission.status != 'SUBMITTED':
            return Response(
                {'error': 'Only submitted requests can enter a workflow'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if WorkflowInstance.objects.filter(submission=submission).exists():
            return Response(
                {'error': 'Workflow instance already exists for this submission'},
                status=status.HTTP_400_BAD_REQUEST
            )

        instance = WorkflowEngine().start_workflow(submission, workflow)
        return Response(self.get_serializer(instance).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a running workflow instance (Admin or the department's Form Manager)."""
        instance = self.get_object()
        self._require_staff(instance.workflow.form.department)

        try:
            WorkflowEngine().cancel(instance, request.user, request.data.get('reason', ''))
        except WorkflowError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'status': 'Workflow cancelled'})

    @action(detail=True, methods=['post'])
    def admin_approve(self, request, pk=None):
        """Approve the current step on behalf of its approvers (used when no one else can approve)."""
        return self._admin_decide(request, approve=True)

    @action(detail=True, methods=['post'])
    def admin_reject(self, request, pk=None):
        """Reject the current step on behalf of its approvers (used when no one else can approve)."""
        return self._admin_decide(request, approve=False)

    def _admin_decide(self, request, approve):
        instance = self.get_object()
        user = request.user

        if user.role != 'ADMIN':
            return Response(
                {'error': 'Only administrators can perform this action'},
                status=status.HTTP_403_FORBIDDEN
            )
        if instance.status != 'NEEDS_ADMIN_ACTION':
            return Response(
                {'error': 'This workflow does not require admin action'},
                status=status.HTTP_400_BAD_REQUEST
            )

        verb = 'Approved' if approve else 'Rejected'
        comments = request.data.get('comments') or f'{verb} by administrator (no eligible approver)'
        step_name = instance.current_step.name if instance.current_step else 'unknown'

        try:
            instance = WorkflowEngine().decide_as_admin(instance, user, approve, comments)
        except WorkflowError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        instance.context_data.setdefault('admin_actions', []).append({
            'action': 'approve' if approve else 'reject',
            'step': step_name,
            'admin': user.username,
            'timestamp': timezone.now().isoformat(),
        })
        instance.save(update_fields=['context_data'])

        log = log_approve if approve else log_reject
        log(user, 'WorkflowInstance', instance, comments=comments, request=request)

        return Response({
            'status': 'success',
            'message': f'Step {verb.lower()} by administrator. Workflow status: {instance.status}',
            'workflow_status': instance.status
        })


class WorkflowApprovalViewSet(viewsets.ReadOnlyModelViewSet):
    """Approval tasks. Approvers act on them only through the `process` action."""

    queryset = WorkflowApproval.objects.all()
    serializer_class = WorkflowApprovalSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'workflow_instance', 'assigned_to']
    ordering = ['-assigned_at']

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset().select_related(
            'workflow_instance', 'workflow_step', 'assigned_to', 'approved_by'
        )

        if user.role == 'ADMIN':
            return queryset
        elif user.role == 'MANAGER':
            return queryset.filter(workflow_instance__workflow__form__department=user.department)
        else:
            # Regular users can only see their approvals
            return queryset.filter(assigned_to=user)

    @action(detail=False, methods=['get'])
    def my_pending(self, request):
        """Get pending approvals for the current user."""
        if request.user.role in ['ADMIN', 'MANAGER']:
            return Response(
                {'error': 'Admins and Form Managers cannot have approvals'},
                status=status.HTTP_403_FORBIDDEN
            )

        approvals = self.get_queryset().filter(
            assigned_to=request.user,
            status='PENDING'
        ).exclude(
            workflow_instance__submission__submitted_by=request.user
        )

        serializer = self.get_serializer(approvals, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def process(self, request, pk=None):
        """Approve, reject or delegate an approval task assigned to the current user."""
        approval = self.get_object()

        if approval.assigned_to != request.user:
            return Response(
                {'error': 'You are not assigned to this approval'},
                status=status.HTTP_403_FORBIDDEN
            )

        submission = approval.workflow_instance.submission
        if submission.submitted_by == request.user:
            return Response(
                {'error': 'You cannot approve or reject your own submission. Please contact an administrator.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = ApprovalActionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        action_name = serializer.validated_data['action']
        comments = serializer.validated_data.get('comments', '')
        engine = WorkflowEngine()

        try:
            if action_name == 'approve':
                engine.approve_step(approval, request.user, comments)
                log_approve(request.user, 'WorkflowApproval', approval, comments=comments, request=request)
                return Response({'status': 'Approved'})

            if action_name == 'reject':
                engine.reject_step(approval, request.user, comments)
                log_reject(request.user, 'WorkflowApproval', approval, comments=comments, request=request)
                return Response({'status': 'Rejected'})

            return self._delegate(approval, serializer.validated_data['delegate_to'], comments)
        except WorkflowError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    def _delegate(self, approval, delegate_to, comments):
        instance = approval.workflow_instance
        if not instance.workflow.allow_delegation:
            raise WorkflowError('Delegation is turned off for this workflow.')
        if instance.status not in ACTIVE_INSTANCE_STATUSES or approval.status != 'PENDING':
            raise WorkflowError('This approval has already been processed.')
        if not delegate_to.is_active:
            raise WorkflowError('You cannot delegate to an inactive user.')
        if delegate_to == instance.submission.submitted_by:
            raise WorkflowError('You cannot delegate an approval to the person who submitted the request.')
        if instance.approvals.filter(
            workflow_step=approval.workflow_step,
            assigned_to=delegate_to,
            status__in=['PENDING', 'APPROVED', 'REJECTED'],
        ).exists():
            raise WorkflowError(f'{delegate_to.username} is already an approver of this step.')

        new_approval = approval.delegate(self.request.user, delegate_to, comments)
        return Response({'status': 'Delegated', 'new_approval_id': str(new_approval.id)})


class WorkflowNotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """In-app notifications of the current user."""

    queryset = WorkflowNotification.objects.all()
    serializer_class = WorkflowNotificationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['notification_type', 'is_read']
    ordering = ['-created_at']

    def get_queryset(self):
        return super().get_queryset().filter(recipient=self.request.user).select_related(
            'workflow_approval', 'workflow_approval__workflow_instance',
            'workflow_approval__workflow_step', 'recipient'
        )

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark a notification as read."""
        notification = self.get_object()
        notification.is_read = True
        notification.read_at = timezone.now()
        notification.save(update_fields=['is_read', 'read_at'])
        return Response({'status': 'Notification marked as read'})

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all notifications as read for the current user."""
        self.get_queryset().filter(is_read=False).update(is_read=True, read_at=timezone.now())
        return Response({'status': 'All notifications marked as read'})

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get the count of unread notifications."""
        return Response({'unread_count': self.get_queryset().filter(is_read=False).count()})
