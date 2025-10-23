"""
Form views for REST API.
"""

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.db.models import Q, Count
from django.shortcuts import get_object_or_404
from .models import Form, FormField, FormSubmission, FormFile
from .serializers import (
    FormListSerializer, FormDetailSerializer,
    FormFieldSerializer, FormSubmissionListSerializer,
    FormSubmissionDetailSerializer, FormFileSerializer
)
from users.permissions import IsAdmin, IsManager, IsOwnerOrAdmin


class IsFormManager(permissions.BasePermission):
    """Permission to check if user can manage forms (ADMIN or MANAGER)."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['ADMIN', 'MANAGER']


class IsFormOwnerOrManager(permissions.BasePermission):
    """Permission to check if user owns the form or is a manager."""

    def has_object_permission(self, request, view, obj):
        if request.user.role in ['ADMIN', 'MANAGER']:
            return True
        if hasattr(obj, 'created_by'):
            return obj.created_by == request.user
        if hasattr(obj, 'submitted_by'):
            return obj.submitted_by == request.user
        return False


class FormViewSet(viewsets.ModelViewSet):
    """ViewSet for managing forms."""
    queryset = Form.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            return FormListSerializer
        return FormDetailSerializer

    def get_queryset(self):
        """Filter forms based on user role and department."""
        user = self.request.user
        queryset = Form.objects.all()

        # Filter by user's access level
        if user.role == 'USER':
            # Regular users can see only ACTIVE forms (they can view and submit)
            queryset = queryset.filter(
                status=Form.FormStatus.ACTIVE
            )
        elif user.role == 'MANAGER':
            # Form Managers can only see forms from their own department
            if user.department:
                queryset = queryset.filter(department=user.department)
            else:
                # Manager without department sees nothing
                queryset = queryset.none()
        # ADMIN can see all forms from all departments (view and delete only)

        # Apply additional filters from query params
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        department_filter = self.request.query_params.get('department')
        if department_filter:
            queryset = queryset.filter(department_id=department_filter)

        # Add annotations
        queryset = queryset.select_related('department', 'created_by')
        queryset = queryset.prefetch_related('fields', 'submissions')
        queryset = queryset.annotate(
            field_count=Count('fields'),
            submission_count=Count('submissions')
        )

        return queryset

    def perform_create(self, serializer):
        """Set created_by to current user when creating form."""
        # Only MANAGER can create forms, ADMIN cannot
        if self.request.user.role != 'MANAGER':
            raise PermissionDenied("Only Form Managers can create forms.")

        # Manager can only create forms for their own department
        if not self.request.user.department:
            raise PermissionDenied("You must be assigned to a department to create forms.")

        # Ensure the form is created for the manager's department
        serializer.save(
            created_by=self.request.user,
            department=self.request.user.department
        )

    def perform_update(self, serializer):
        """Check permissions when updating form."""
        instance = self.get_object()

        # ADMIN cannot edit forms
        if self.request.user.role == 'ADMIN':
            raise PermissionDenied("Admins can only view and delete forms, not edit them.")

        # USER cannot edit forms
        if self.request.user.role == 'USER':
            raise PermissionDenied("Users can only view and submit forms, not edit them.")

        # MANAGER can only edit forms from their own department
        if self.request.user.role == 'MANAGER':
            if instance.department != self.request.user.department:
                raise PermissionDenied("You can only edit forms from your own department.")

        serializer.save()

    def perform_destroy(self, instance):
        """Check permissions when deleting form."""
        # USER cannot delete forms
        if self.request.user.role == 'USER':
            raise PermissionDenied("Users can only view and submit forms, not delete them.")

        # ADMIN can delete any form
        if self.request.user.role == 'ADMIN':
            instance.delete()
            return

        # MANAGER can only delete forms from their own department
        if self.request.user.role == 'MANAGER':
            if instance.department != self.request.user.department:
                raise PermissionDenied("You can only delete forms from your own department.")
            instance.delete()
            return

        raise PermissionDenied("You don't have permission to delete forms.")

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """Duplicate a form with a new code."""
        form = self.get_object()

        # Only MANAGER can duplicate forms, not ADMIN or USER
        if request.user.role != 'MANAGER':
            return Response(
                {"error": "Only Form Managers can duplicate forms."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Manager can only duplicate forms from their own department
        if form.department != request.user.department:
            return Response(
                {"error": "You can only duplicate forms from your own department."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Create duplicate
        new_code = request.data.get('code')
        if not new_code:
            return Response(
                {"error": "New form code is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if code already exists
        if Form.objects.filter(code=new_code).exists():
            return Response(
                {"error": "Form with this code already exists."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Duplicate the form
        old_fields = form.fields.all()
        form.pk = None
        form.id = None
        form.code = new_code
        form.name = request.data.get('name', f"{form.name} (Copy)")
        form.status = Form.FormStatus.DRAFT
        form.created_by = request.user
        form.version = 1
        form.save()

        # Duplicate fields
        for field in old_fields:
            field.pk = None
            field.id = None
            field.form = form
            field.save()

        serializer = FormDetailSerializer(form)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def fields(self, request, pk=None):
        """Get all fields for a form."""
        form = self.get_object()
        fields = form.fields.all().order_by('order')
        serializer = FormFieldSerializer(fields, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_field(self, request, pk=None):
        """Add a new field to the form."""
        form = self.get_object()

        # Only MANAGER can add fields, not ADMIN or USER
        if request.user.role != 'MANAGER':
            return Response(
                {"error": "Only Form Managers can add fields."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Manager can only add fields to forms from their own department
        if form.department != request.user.department:
            return Response(
                {"error": "You can only add fields to forms from your own department."},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = FormFieldSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(form=form)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class FormSubmissionViewSet(viewsets.ModelViewSet):
    """ViewSet for managing form submissions."""
    queryset = FormSubmission.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            return FormSubmissionListSerializer
        return FormSubmissionDetailSerializer

    def get_queryset(self):
        """Filter submissions based on user role."""
        user = self.request.user
        queryset = FormSubmission.objects.all()

        # Filter by user's access level
        if user.role == 'USER':
            # Regular users can only see their own submissions
            queryset = queryset.filter(submitted_by=user)
        elif user.role == 'MANAGER':
            # Managers can see submissions from their department
            if user.department:
                queryset = queryset.filter(form__department=user.department)
            else:
                # Manager without department sees only their own
                queryset = queryset.filter(submitted_by=user)
        # ADMIN can see all submissions (no filter needed)

        # Apply additional filters
        form_filter = self.request.query_params.get('form')
        if form_filter:
            queryset = queryset.filter(form_id=form_filter)

        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Add select_related for optimization
        queryset = queryset.select_related('form', 'submitted_by')

        return queryset

    def perform_create(self, serializer):
        """Set submitted_by to current user when creating submission."""
        serializer.save(submitted_by=self.request.user)

    def perform_update(self, serializer):
        """Check permissions when updating submission."""
        instance = self.get_object()

        # Users can only edit their own submissions
        if self.request.user.role == 'USER' and instance.submitted_by != self.request.user:
            raise PermissionDenied("You can only edit your own submissions.")

        # Managers can edit submissions from their department
        if self.request.user.role == 'MANAGER':
            if instance.form.department != self.request.user.department:
                if instance.submitted_by != self.request.user:
                    raise PermissionDenied("You can only edit submissions from your department.")

        serializer.save()

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """Submit a draft submission."""
        submission = self.get_object()

        if submission.submitted_by != request.user:
            return Response(
                {"error": "You can only submit your own submissions."},
                status=status.HTTP_403_FORBIDDEN
            )

        if submission.status != FormSubmission.SubmissionStatus.DRAFT:
            return Response(
                {"error": "Only draft submissions can be submitted."},
                status=status.HTTP_400_BAD_REQUEST
            )

        submission.status = FormSubmission.SubmissionStatus.SUBMITTED
        submission.save()

        serializer = self.get_serializer(submission)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a submission (Manager/Admin only)."""
        submission = self.get_object()

        if request.user.role not in ['ADMIN', 'MANAGER']:
            return Response(
                {"error": "Only Form Managers and Admins can approve submissions."},
                status=status.HTTP_403_FORBIDDEN
            )

        if submission.status != FormSubmission.SubmissionStatus.SUBMITTED:
            return Response(
                {"error": "Only submitted submissions can be approved."},
                status=status.HTTP_400_BAD_REQUEST
            )

        submission.status = FormSubmission.SubmissionStatus.APPROVED
        submission.save()

        serializer = self.get_serializer(submission)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a submission (Manager/Admin only)."""
        submission = self.get_object()

        if request.user.role not in ['ADMIN', 'MANAGER']:
            return Response(
                {"error": "Only Form Managers and Admins can reject submissions."},
                status=status.HTTP_403_FORBIDDEN
            )

        if submission.status not in [
            FormSubmission.SubmissionStatus.SUBMITTED,
            FormSubmission.SubmissionStatus.IN_REVIEW
        ]:
            return Response(
                {"error": "Only submitted or in-review submissions can be rejected."},
                status=status.HTTP_400_BAD_REQUEST
            )

        submission.status = FormSubmission.SubmissionStatus.REJECTED
        submission.save()

        serializer = self.get_serializer(submission)
        return Response(serializer.data)