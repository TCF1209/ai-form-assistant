"""
Workflow views for managing approval processes.
"""

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied, ValidationError
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.db import transaction

from .models import (
    Workflow, WorkflowStep, WorkflowInstance,
    WorkflowApproval, WorkflowNotification
)
from .serializers import (
    WorkflowSerializer, WorkflowListSerializer, WorkflowStepSerializer,
    WorkflowInstanceSerializer, WorkflowApprovalSerializer,
    ApprovalActionSerializer, WorkflowNotificationSerializer
)
from .engine import WorkflowEngine
from forms.models import FormSubmission
from users.permissions import IsAdmin, IsFormManager, IsOwnerOrAdmin


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
    permission_classes = [IsAuthenticated]
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
        queryset = super().get_queryset()

        # Filter based on user role
        if user.role == 'ADMIN':
            # Admin can see all workflows
            return queryset
        elif user.role == 'FORM_MANAGER':
            # Form Manager can see workflows in their department
            return queryset.filter(form__department=user.department)
        else:
            # Regular users can see active workflows they might interact with
            return queryset.filter(
                Q(status='ACTIVE') &
                (Q(form__department=user.department) | Q(form__is_public=True))
            )

    def perform_create(self, serializer):
        user = self.request.user
        form = serializer.validated_data.get('form')

        # Permission check
        if user.role == 'FORM_MANAGER' and form.department != user.department:
            raise PermissionDenied("You can only create workflows for forms in your department.")

        serializer.save(created_by=user)

    def perform_update(self, serializer):
        user = self.request.user
        instance = self.get_object()

        # Permission check
        if user.role == 'FORM_MANAGER' and instance.form.department != user.department:
            raise PermissionDenied("You can only edit workflows for forms in your department.")

        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user

        # Permission check
        if user.role == 'FORM_MANAGER' and instance.form.department != user.department:
            raise PermissionDenied("You can only delete workflows for forms in your department.")

        # Check if workflow status allows deletion
        if instance.status in ['ACTIVE', 'ARCHIVED']:
            raise ValidationError(f"Cannot delete workflow with status '{instance.status}'. Please deactivate it first.")

        # Check if workflow has active instances
        if instance.instances.filter(status__in=['PENDING', 'IN_PROGRESS']).exists():
            raise ValidationError("Cannot delete workflow with active instances.")

        instance.delete()

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

    @action(detail=True, methods=['post'])
    def clone(self, request, pk=None):
        """Clone a workflow."""
        workflow = self.get_object()

        # Create a copy
        new_workflow = Workflow.objects.create(
            name=f"{workflow.name} (Copy)",
            code=f"{workflow.code}_copy_{timezone.now().timestamp()}",
            description=workflow.description,
            form=workflow.form,
            workflow_type=workflow.workflow_type,
            status='DRAFT',
            created_by=request.user,
            config=workflow.config,
            approval_threshold=workflow.approval_threshold,
            allow_delegation=workflow.allow_delegation,
            allow_comments=workflow.allow_comments,
            auto_escalate=workflow.auto_escalate,
            escalation_days=workflow.escalation_days
        )

        # Clone steps
        for step in workflow.steps.all():
            WorkflowStep.objects.create(
                workflow=new_workflow,
                name=step.name,
                step_type=step.step_type,
                order=step.order,
                assigned_role=step.assigned_role,
                assigned_user=step.assigned_user,
                assigned_department=step.assigned_department,
                is_required=step.is_required,
                can_skip=step.can_skip,
                time_limit_hours=step.time_limit_hours,
                conditions=step.conditions,
                actions=step.actions
            )

        serializer = self.get_serializer(new_workflow)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class WorkflowStepViewSet(viewsets.ModelViewSet):
    """ViewSet for managing workflow steps."""

    queryset = WorkflowStep.objects.all()
    serializer_class = WorkflowStepSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()

        # Filter based on workflow permissions
        if user.role == 'ADMIN':
            return queryset
        elif user.role == 'FORM_MANAGER':
            return queryset.filter(workflow__form__department=user.department)
        else:
            return queryset.filter(
                workflow__status='ACTIVE',
                workflow__form__department=user.department
            )

    @action(detail=False, methods=['post'], url_path='reorder')
    def reorder(self, request):
        """Reorder workflow steps."""
        workflow_id = request.data.get('workflow_id')
        step_ids = request.data.get('step_ids', [])

        if not workflow_id or not step_ids:
            return Response(
                {'error': 'workflow_id and step_ids are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            workflow = Workflow.objects.get(id=workflow_id)

            # Check permissions
            user = request.user
            if user.role == 'FORM_MANAGER' and workflow.form.department != user.department:
                return Response(
                    {'error': 'You can only edit workflows in your department'},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Update order
            with transaction.atomic():
                for index, step_id in enumerate(step_ids):
                    WorkflowStep.objects.filter(
                        id=step_id,
                        workflow=workflow
                    ).update(order=index)

            return Response({'status': 'Steps reordered successfully'})

        except Workflow.DoesNotExist:
            return Response(
                {'error': 'Workflow not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class WorkflowInstanceViewSet(viewsets.ModelViewSet):
    """ViewSet for managing workflow instances."""

    queryset = WorkflowInstance.objects.all()
    serializer_class = WorkflowInstanceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['workflow', 'status', 'submission']
    ordering = ['-started_at']

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()

        if user.role == 'ADMIN':
            return queryset
        elif user.role == 'FORM_MANAGER':
            return queryset.filter(workflow__form__department=user.department)
        else:
            # Users can see instances they're involved in
            return queryset.filter(
                Q(submission__submitted_by=user) |
                Q(approvals__assigned_to=user)
            ).distinct()

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
            workflow = Workflow.objects.get(id=workflow_id)

            # Check if workflow is active
            if workflow.status != 'ACTIVE':
                return Response(
                    {'error': 'Workflow is not active'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Check if instance already exists
            if WorkflowInstance.objects.filter(
                submission=submission,
                workflow=workflow
            ).exists():
                return Response(
                    {'error': 'Workflow instance already exists for this submission'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Start workflow using the engine
            engine = WorkflowEngine()
            instance = engine.start_workflow(submission, workflow)

            serializer = self.get_serializer(instance)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except (FormSubmission.DoesNotExist, Workflow.DoesNotExist):
            return Response(
                {'error': 'Submission or Workflow not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a workflow instance."""
        instance = self.get_object()
        reason = request.data.get('reason', '')

        if instance.status in ['COMPLETED', 'CANCELLED']:
            return Response(
                {'error': 'Cannot cancel completed or already cancelled workflow'},
                status=status.HTTP_400_BAD_REQUEST
            )

        instance.status = 'CANCELLED'
        instance.cancelled_at = timezone.now()
        instance.cancelled_by = request.user
        instance.cancellation_reason = reason
        instance.save()

        return Response({'status': 'Workflow cancelled'})


class WorkflowApprovalViewSet(viewsets.ModelViewSet):
    """ViewSet for managing workflow approvals."""

    queryset = WorkflowApproval.objects.all()
    serializer_class = WorkflowApprovalSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'workflow_instance', 'assigned_to']
    ordering = ['-assigned_at']

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()

        if user.role == 'ADMIN':
            return queryset.select_related(
                'workflow_instance', 'workflow_step', 'assigned_to', 'approved_by'
            )
        elif user.role == 'FORM_MANAGER':
            return queryset.filter(
                workflow_instance__workflow__form__department=user.department
            ).select_related(
                'workflow_instance', 'workflow_step', 'assigned_to', 'approved_by'
            )
        else:
            # Regular users can only see their approvals
            return queryset.filter(assigned_to=user).select_related(
                'workflow_instance', 'workflow_step', 'assigned_to', 'approved_by'
            )

    @action(detail=False, methods=['get'])
    def my_pending(self, request):
        """Get pending approvals for the current user."""
        if request.user.role in ['ADMIN', 'FORM_MANAGER']:
            return Response(
                {'error': 'Admins and Form Managers cannot have approvals'},
                status=status.HTTP_403_FORBIDDEN
            )

        approvals = self.get_queryset().filter(
            assigned_to=request.user,
            status='PENDING'
        )

        serializer = self.get_serializer(approvals, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def process(self, request, pk=None):
        """Process an approval (approve/reject/delegate)."""
        approval = self.get_object()

        # Check if user can process this approval
        if approval.assigned_to != request.user:
            return Response(
                {'error': 'You are not assigned to this approval'},
                status=status.HTTP_403_FORBIDDEN
            )

        if approval.status != 'PENDING':
            return Response(
                {'error': 'This approval has already been processed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = ApprovalActionSerializer(data=request.data)
        if serializer.is_valid():
            action = serializer.validated_data['action']
            comments = serializer.validated_data.get('comments', '')

            engine = WorkflowEngine()

            if action == 'approve':
                engine.approve_step(approval, request.user, comments)
                return Response({'status': 'Approved'})
            elif action == 'reject':
                engine.reject_step(approval, request.user, comments)
                return Response({'status': 'Rejected'})
            elif action == 'delegate':
                delegate_to = serializer.validated_data['delegate_to']
                new_approval = approval.delegate(request.user, delegate_to, comments)
                return Response({
                    'status': 'Delegated',
                    'new_approval_id': str(new_approval.id)
                })

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class WorkflowNotificationViewSet(viewsets.ModelViewSet):
    """ViewSet for managing workflow notifications."""

    queryset = WorkflowNotification.objects.all()
    serializer_class = WorkflowNotificationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['notification_type', 'is_read', 'recipient']
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        # Users can only see their own notifications
        return super().get_queryset().filter(recipient=user)

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark a notification as read."""
        notification = self.get_object()
        notification.is_read = True
        notification.read_at = timezone.now()
        notification.save()

        return Response({'status': 'Notification marked as read'})

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all notifications as read for the current user."""
        self.get_queryset().filter(is_read=False).update(
            is_read=True,
            read_at=timezone.now()
        )
        return Response({'status': 'All notifications marked as read'})

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get the count of unread notifications."""
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'unread_count': count})