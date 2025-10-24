"""
Form views for REST API.
"""

import re
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
from django.db import models
from django.db.models import Q, Count
from django.shortcuts import get_object_or_404
from .models import Form, FormField, FormSubmission, FormFile
from .serializers import (
    FormListSerializer, FormDetailSerializer,
    FormFieldSerializer, FormSubmissionListSerializer,
    FormSubmissionDetailSerializer, FormFileSerializer
)
from .templates import FORM_TEMPLATES
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
        # Admin and Manager can create forms, User cannot
        if self.request.user.role not in ['ADMIN', 'MANAGER']:
            raise PermissionDenied("Only Admins and Form Managers can create forms.")

        # Admin can create for any department, Manager only for their own
        if self.request.user.role == 'ADMIN':
            # Admin can specify any department (use what's provided in request)
            if 'department' not in serializer.validated_data:
                raise ValidationError("Department is required when creating a form.")
            serializer.save(created_by=self.request.user)
        else:  # MANAGER
            # Manager can only create forms for their own department
            if not self.request.user.department:
                raise PermissionDenied("You must be assigned to a department to create forms.")
            # Force the form to be created for the manager's department (ignore client-provided department)
            serializer.save(
                created_by=self.request.user,
                department=self.request.user.department  # Always use manager's department
            )

    def perform_update(self, serializer):
        """Check permissions when updating form."""
        instance = self.get_object()

        # USER cannot edit forms
        if self.request.user.role == 'USER':
            raise PermissionDenied("Users can only view and submit forms, not edit them.")

        # ADMIN can edit any form
        if self.request.user.role == 'ADMIN':
            serializer.save()
            return

        # MANAGER can only edit forms from their own department
        if self.request.user.role == 'MANAGER':
            if instance.department != self.request.user.department:
                raise PermissionDenied("You can only edit forms from your own department.")
            serializer.save()
            return

        raise PermissionDenied("You don't have permission to edit forms.")

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

        # Only ADMIN and MANAGER can add fields
        if request.user.role not in ['ADMIN', 'MANAGER']:
            return Response(
                {"error": "Only Admins and Form Managers can add fields."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Manager can only add fields to forms from their own department, Admin can add to any
        if request.user.role == 'MANAGER' and form.department != request.user.department:
            return Response(
                {"error": "You can only add fields to forms from your own department."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Auto-increment order if not provided
        if 'order' not in request.data:
            max_order = form.fields.aggregate(models.Max('order'))['order__max'] or -1
            request.data['order'] = max_order + 1

        # Auto-generate field name from label if not provided
        if 'name' not in request.data or not request.data.get('name'):
            label = request.data.get('label', '')
            if label:
                # Convert label to field name: "Full Name" -> "full_name"
                field_name = re.sub(r'[^a-zA-Z0-9\s]', '', label)  # Remove special chars
                field_name = field_name.lower().replace(' ', '_')  # Lowercase and replace spaces
                field_name = re.sub(r'_+', '_', field_name)  # Remove multiple underscores
                field_name = field_name.strip('_')  # Remove leading/trailing underscores

                # Ensure uniqueness within the form
                base_name = field_name
                counter = 1
                while form.fields.filter(name=field_name).exists():
                    field_name = f"{base_name}_{counter}"
                    counter += 1

                request.data['name'] = field_name

        serializer = FormFieldSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(form=form)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['put'])
    def update_field(self, request, pk=None):
        """Update a field in the form."""
        form = self.get_object()
        field_id = request.data.get('field_id')

        if not field_id:
            return Response(
                {"error": "field_id is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Only ADMIN and MANAGER can update fields
        if request.user.role not in ['ADMIN', 'MANAGER']:
            return Response(
                {"error": "Only Admins and Form Managers can update fields."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Manager can only update fields in forms from their own department, Admin can update any
        if request.user.role == 'MANAGER' and form.department != request.user.department:
            return Response(
                {"error": "You can only update fields in forms from your own department."},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            field = form.fields.get(id=field_id)
        except FormField.DoesNotExist:
            return Response(
                {"error": "Field not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        # Auto-generate field name from label if label changed but name not provided
        if 'label' in request.data and ('name' not in request.data or not request.data.get('name')):
            label = request.data.get('label', '')
            if label:
                # Convert label to field name: "Full Name" -> "full_name"
                field_name = re.sub(r'[^a-zA-Z0-9\s]', '', label)
                field_name = field_name.lower().replace(' ', '_')
                field_name = re.sub(r'_+', '_', field_name)
                field_name = field_name.strip('_')

                # Ensure uniqueness within the form (excluding current field)
                base_name = field_name
                counter = 1
                while form.fields.exclude(id=field_id).filter(name=field_name).exists():
                    field_name = f"{base_name}_{counter}"
                    counter += 1

                request.data['name'] = field_name

        serializer = FormFieldSerializer(field, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['delete'])
    def delete_field(self, request, pk=None):
        """Delete a field from the form."""
        form = self.get_object()
        field_id = request.query_params.get('field_id')

        if not field_id:
            return Response(
                {"error": "field_id is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Only ADMIN and MANAGER can delete fields
        if request.user.role not in ['ADMIN', 'MANAGER']:
            return Response(
                {"error": "Only Admins and Form Managers can delete fields."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Manager can only delete fields from forms in their own department, Admin can delete any
        if request.user.role == 'MANAGER' and form.department != request.user.department:
            return Response(
                {"error": "You can only delete fields from forms in your own department."},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            field = form.fields.get(id=field_id)
            field.delete()

            # Re-order remaining fields
            remaining_fields = form.fields.all().order_by('order')
            for index, field in enumerate(remaining_fields):
                field.order = index
                field.save()

            return Response(
                {"message": "Field deleted successfully."},
                status=status.HTTP_204_NO_CONTENT
            )
        except FormField.DoesNotExist:
            return Response(
                {"error": "Field not found."},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'])
    def reorder_fields(self, request, pk=None):
        """Reorder fields in the form (for drag-and-drop)."""
        form = self.get_object()

        # Only ADMIN and MANAGER can reorder fields
        if request.user.role not in ['ADMIN', 'MANAGER']:
            return Response(
                {"error": "Only Admins and Form Managers can reorder fields."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Manager can only reorder fields in forms from their own department, Admin can reorder any
        if request.user.role == 'MANAGER' and form.department != request.user.department:
            return Response(
                {"error": "You can only reorder fields in forms from your own department."},
                status=status.HTTP_403_FORBIDDEN
            )

        field_ids = request.data.get('field_ids', [])
        if not field_ids:
            return Response(
                {"error": "field_ids array is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update the order of each field
        for index, field_id in enumerate(field_ids):
            try:
                field = form.fields.get(id=field_id)
                field.order = index
                field.save()
            except FormField.DoesNotExist:
                return Response(
                    {"error": f"Field {field_id} not found."},
                    status=status.HTTP_404_NOT_FOUND
                )

        return Response(
            {"message": "Fields reordered successfully."},
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=['post'])
    def create_from_template(self, request):
        """Create a form from a predefined template."""
        template_key = request.data.get('template')
        form_code = request.data.get('code')
        form_name = request.data.get('name')

        if not template_key or template_key not in FORM_TEMPLATES:
            return Response(
                {"error": "Valid template key is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not form_code:
            return Response(
                {"error": "Form code is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Only Admins and Form Managers can create forms
        if request.user.role not in ['ADMIN', 'MANAGER']:
            return Response(
                {"error": "Only Admins and Form Managers can create forms."},
                status=status.HTTP_403_FORBIDDEN
            )

        # For Managers, must have department; for Admins, department must be in request
        if request.user.role == 'MANAGER' and not request.user.department:
            return Response(
                {"error": "You must be assigned to a department to create forms."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Check if code already exists
        if Form.objects.filter(code=form_code).exists():
            return Response(
                {"error": "Form with this code already exists."},
                status=status.HTTP_400_BAD_REQUEST
            )

        template = FORM_TEMPLATES[template_key]

        # Get status from request or default to DRAFT
        form_status = request.data.get('status', Form.FormStatus.DRAFT)

        # Determine department based on role
        if request.user.role == 'ADMIN':
            # Admin must provide department
            department_id = request.data.get('department')
            if not department_id:
                return Response(
                    {"error": "Department is required for Admin users."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            from users.models import Department
            try:
                department = Department.objects.get(id=department_id)
            except Department.DoesNotExist:
                return Response(
                    {"error": "Invalid department ID."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:  # MANAGER
            department = request.user.department

        # Create the form
        form = Form.objects.create(
            name=form_name or template['name'],
            code=form_code,
            description=template['description'],
            department=department,
            created_by=request.user,
            status=form_status,  # Use provided status or default to DRAFT
            is_template=False,
            requires_approval=True
        )

        # Create fields from template
        for field_data in template['fields']:
            FormField.objects.create(
                form=form,
                **field_data
            )

        serializer = FormDetailSerializer(form)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def templates(self, request):
        """Get available form templates."""
        templates = []
        for key, template in FORM_TEMPLATES.items():
            templates.append({
                'key': key,
                'name': template['name'],
                'description': template['description'],
                'field_count': len(template['fields'])
            })
        return Response(templates)


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
            # Form Managers can see all submissions from their department's forms
            if user.department:
                queryset = queryset.filter(form__department=user.department)
            else:
                # Manager without department sees nothing
                queryset = queryset.none()
        # ADMIN can see all submissions from all departments

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
        # Only USER role can create/submit forms
        if self.request.user.role != 'USER':
            raise PermissionDenied("Only users can submit forms. Admins and Form Managers cannot submit forms.")

        # Handle file uploads
        files_data = {}
        for key in self.request.FILES.keys():
            files_data[key] = self.request.FILES[key]

        # Save the submission
        submission = serializer.save(submitted_by=self.request.user)

        # Save files if any
        for field_name, file in files_data.items():
            FormFile.objects.create(
                submission=submission,
                field_name=field_name,
                file=file
            )

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

    @action(detail=False, methods=['get'])
    def drafts(self, request):
        """Get draft submissions for the current user."""
        form_id = request.query_params.get('form')

        queryset = self.get_queryset().filter(
            submitted_by=request.user,
            status=FormSubmission.SubmissionStatus.DRAFT
        )

        if form_id:
            queryset = queryset.filter(form_id=form_id)

        serializer = FormSubmissionListSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def save_draft(self, request, pk=None):
        """Save progress on a submission as draft."""
        submission = self.get_object()

        if submission.submitted_by != request.user:
            return Response(
                {"error": "You can only save your own submissions."},
                status=status.HTTP_403_FORBIDDEN
            )

        if submission.status not in [
            FormSubmission.SubmissionStatus.DRAFT,
            FormSubmission.SubmissionStatus.SUBMITTED
        ]:
            return Response(
                {"error": "Cannot save as draft."},
                status=status.HTTP_400_BAD_REQUEST
            )

        submission.data = request.data.get('data', {})
        submission.status = FormSubmission.SubmissionStatus.DRAFT
        submission.version = submission.version + 1
        submission.save()

        serializer = self.get_serializer(submission)
        return Response(serializer.data)

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
        submission.version = submission.version + 1
        submission.save()

        serializer = self.get_serializer(submission)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def upload_file(self, request, pk=None):
        """Upload a file for a submission."""
        submission = self.get_object()

        if submission.submitted_by != request.user:
            return Response(
                {"error": "You can only upload files to your own submissions."},
                status=status.HTTP_403_FORBIDDEN
            )

        field_name = request.data.get('field_name')
        if not field_name:
            return Response(
                {"error": "field_name is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if 'file' not in request.FILES:
            return Response(
                {"error": "No file provided."},
                status=status.HTTP_400_BAD_REQUEST
            )

        file = request.FILES['file']

        # Delete existing file for this field if any
        FormFile.objects.filter(
            submission=submission,
            field_name=field_name
        ).delete()

        # Create new file record
        form_file = FormFile.objects.create(
            submission=submission,
            field_name=field_name,
            file=file
        )

        return Response({
            'id': form_file.id,
            'field_name': form_file.field_name,
            'file': form_file.file.url,
            'uploaded_at': form_file.uploaded_at
        })

    @action(detail=True, methods=['get'])
    def files(self, request, pk=None):
        """Get all files for a submission."""
        submission = self.get_object()

        files = FormFile.objects.filter(submission=submission)
        data = []
        for file in files:
            data.append({
                'id': file.id,
                'field_name': file.field_name,
                'file': file.file.url,
                'uploaded_at': file.uploaded_at
            })

        return Response(data)

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