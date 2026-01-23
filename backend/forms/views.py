"""
Form views for REST API.
"""

import re
import io
from datetime import datetime, timedelta
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
from django.db import models
from django.db.models import Q, Count
from django.shortcuts import get_object_or_404
from django.http import HttpResponse
from django.utils import timezone
from .models import Form, FormField, FormSubmission, FormFile
from .serializers import (
    FormListSerializer, FormDetailSerializer,
    FormFieldSerializer, FormSubmissionListSerializer,
    FormSubmissionDetailSerializer, FormFileSerializer
)
from .templates import FORM_TEMPLATES
from users.permissions import IsAdmin, IsManager, IsOwnerOrAdmin
from users.audit import log_create, log_update, log_delete, log_submit, log_approve, log_reject


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
            form = serializer.save(created_by=self.request.user)
        else:  # MANAGER
            # Manager can only create forms for their own department
            if not self.request.user.department:
                raise PermissionDenied("You must be assigned to a department to create forms.")
            # Force the form to be created for the manager's department (ignore client-provided department)
            form = serializer.save(
                created_by=self.request.user,
                department=self.request.user.department  # Always use manager's department
            )

        # Log the form creation
        log_create(self.request.user, 'Form', form, self.request)

    def perform_update(self, serializer):
        """Check permissions when updating form."""
        instance = self.get_object()

        # USER cannot edit forms
        if self.request.user.role == 'USER':
            raise PermissionDenied("Users can only view and submit forms, not edit them.")

        # Track changes for audit log
        old_data = {'name': instance.name, 'status': instance.status}

        # ADMIN can edit any form
        if self.request.user.role == 'ADMIN':
            form = serializer.save()
            log_update(self.request.user, 'Form', form, {'old': old_data, 'new': serializer.validated_data}, self.request)
            return

        # MANAGER can only edit forms from their own department
        if self.request.user.role == 'MANAGER':
            if instance.department != self.request.user.department:
                raise PermissionDenied("You can only edit forms from your own department.")
            form = serializer.save()
            log_update(self.request.user, 'Form', form, {'old': old_data, 'new': serializer.validated_data}, self.request)
            return

        raise PermissionDenied("You don't have permission to edit forms.")

    def perform_destroy(self, instance):
        """Check permissions when deleting form."""
        # USER cannot delete forms
        if self.request.user.role == 'USER':
            raise PermissionDenied("Users can only view and submit forms, not delete them.")

        # Store info before deletion for audit log
        form_id = str(instance.id)
        form_repr = str(instance)

        # ADMIN can delete any form
        if self.request.user.role == 'ADMIN':
            instance.delete()
            log_delete(self.request.user, 'Form', form_id, form_repr, self.request)
            return

        # MANAGER can only delete forms from their own department
        if self.request.user.role == 'MANAGER':
            if instance.department != self.request.user.department:
                raise PermissionDenied("You can only delete forms from your own department.")
            instance.delete()
            log_delete(self.request.user, 'Form', form_id, form_repr, self.request)
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

        # Add select_related for optimization (includes form__department for Reports page)
        queryset = queryset.select_related('form', 'form__department', 'submitted_by')

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

        # Log the submission creation
        if submission.status == 'SUBMITTED':
            log_submit(self.request.user, 'FormSubmission', submission, self.request)
        else:
            log_create(self.request.user, 'FormSubmission', submission, self.request)

        # Check if submission is being submitted (not draft) and start workflow
        if submission.status == 'SUBMITTED':
            self._start_workflow_for_submission(submission)

    def _start_workflow_for_submission(self, submission):
        """Start workflow for a submitted form if there's an active workflow."""
        from workflows.models import Workflow, WorkflowInstance
        from workflows.engine import WorkflowEngine

        # Check for active workflow for this form
        active_workflow = Workflow.objects.filter(
            form=submission.form,
            status='ACTIVE'
        ).first()

        if active_workflow:
            # Check if workflow instance already exists
            existing_instance = WorkflowInstance.objects.filter(
                submission=submission,
                workflow=active_workflow
            ).exists()

            if not existing_instance:
                # Start the workflow
                engine = WorkflowEngine()
                engine.start_workflow(submission, active_workflow)

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

        # Check if status changed from DRAFT to SUBMITTED
        old_status = instance.status
        submission = serializer.save()

        # If status changed to SUBMITTED, start workflow
        if old_status != 'SUBMITTED' and submission.status == 'SUBMITTED':
            self._start_workflow_for_submission(submission)

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
    def withdraw(self, request, pk=None):
        """
        Withdraw/recall a pending submission.
        Only the submitter can withdraw their own submission.
        Only submissions in SUBMITTED or IN_REVIEW status can be withdrawn.
        """
        from workflows.models import WorkflowInstance
        from django.utils import timezone

        submission = self.get_object()

        # Check that the user is the submitter
        if submission.submitted_by != request.user:
            return Response(
                {"error": "You can only withdraw your own submissions."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Check that submission is in a withdrawable state
        withdrawable_statuses = [
            FormSubmission.SubmissionStatus.SUBMITTED,
            FormSubmission.SubmissionStatus.IN_REVIEW,
        ]
        if submission.status not in withdrawable_statuses:
            return Response(
                {"error": f"Cannot withdraw submission with status '{submission.status}'. "
                          "Only SUBMITTED or IN_REVIEW submissions can be withdrawn."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get the reason for withdrawal (optional)
        reason = request.data.get('reason', '')

        # Cancel any associated workflow instances
        workflow_instances = WorkflowInstance.objects.filter(
            submission=submission,
            status__in=['PENDING', 'IN_PROGRESS', 'NEEDS_ADMIN_ACTION']
        )

        for instance in workflow_instances:
            instance.status = 'CANCELLED'
            instance.cancelled_at = timezone.now()
            instance.cancelled_by = request.user
            instance.cancellation_reason = f"Submission withdrawn by submitter. Reason: {reason}" if reason else "Submission withdrawn by submitter"
            instance.save()

            # Cancel all pending approvals for this instance
            instance.approvals.filter(status='PENDING').update(
                status='CANCELLED',
                comments='Submission withdrawn by submitter'
            )

        # Update submission status to WITHDRAWN
        submission.status = FormSubmission.SubmissionStatus.WITHDRAWN
        submission.save()

        # Log the withdrawal
        log_update(
            request.user,
            'FormSubmission',
            submission,
            {'action': 'withdraw', 'reason': reason},
            request
        )

        serializer = self.get_serializer(submission)
        return Response({
            'status': 'success',
            'message': 'Submission withdrawn successfully.',
            'submission': serializer.data
        })

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

        # Log the approval
        log_approve(request.user, 'FormSubmission', submission, request=request)

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

        # Log the rejection
        reason = request.data.get('reason', '')
        log_reject(request.user, 'FormSubmission', submission, comments=reason, request=request)

        serializer = self.get_serializer(submission)
        return Response(serializer.data)

    # NOTE: export functionality moved to core/urls.py to fix routing issues
    # The @action decorator was removed to prevent router conflicts
    def _export_disabled(self, request):
        """Export submissions - DISABLED, use /api/v1/submissions/export/ instead."""
        if request.user.role not in ['ADMIN', 'MANAGER']:
            return Response(
                {"error": "Only Form Managers and Admins can export submissions."},
                status=status.HTTP_403_FORBIDDEN
            )

        export_format = request.query_params.get('format', 'excel')
        days = int(request.query_params.get('days', 30))
        form_id = request.query_params.get('form_id')

        # Calculate date range
        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)

        # Filter submissions
        queryset = FormSubmission.objects.filter(
            submitted_at__gte=start_date,
            submitted_at__lte=end_date
        )

        # Filter by form if specified
        if form_id:
            queryset = queryset.filter(form_id=form_id)

        # Filter by department for managers
        if request.user.role == 'MANAGER':
            queryset = queryset.filter(form__department=request.user.department)

        submissions = queryset.select_related('form', 'submitted_by').order_by('-submitted_at')

        if export_format == 'pdf':
            return self._export_pdf(submissions, start_date, end_date)
        else:
            return self._export_excel(submissions, start_date, end_date)

    def _export_excel(self, submissions, start_date, end_date):
        """Generate Excel export of submissions."""
        try:
            from openpyxl import Workbook
            from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
        except ImportError:
            return Response(
                {"error": "openpyxl is not installed. Run: pip install openpyxl"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        wb = Workbook()
        ws = wb.active
        ws.title = "Submissions Report"

        # Styles
        header_font = Font(bold=True, color="FFFFFF")
        header_fill = PatternFill(start_color="0EA5E9", end_color="0EA5E9", fill_type="solid")
        header_alignment = Alignment(horizontal="center", vertical="center")
        thin_border = Border(
            left=Side(style='thin'),
            right=Side(style='thin'),
            top=Side(style='thin'),
            bottom=Side(style='thin')
        )

        # Title
        ws.merge_cells('A1:F1')
        ws['A1'] = f"Submissions Report ({start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')})"
        ws['A1'].font = Font(bold=True, size=14)
        ws['A1'].alignment = Alignment(horizontal="center")

        # Headers
        headers = ['ID', 'Form Name', 'Submitted By', 'Status', 'Submitted At', 'Department']
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=3, column=col, value=header)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = header_alignment
            cell.border = thin_border

        # Data
        for row, submission in enumerate(submissions, 4):
            ws.cell(row=row, column=1, value=str(submission.id)[:8]).border = thin_border
            ws.cell(row=row, column=2, value=submission.form.name).border = thin_border
            ws.cell(row=row, column=3, value=submission.submitted_by.username if submission.submitted_by else 'N/A').border = thin_border
            ws.cell(row=row, column=4, value=submission.status).border = thin_border
            ws.cell(row=row, column=5, value=submission.submitted_at.strftime('%Y-%m-%d %H:%M') if submission.submitted_at else 'N/A').border = thin_border
            ws.cell(row=row, column=6, value=submission.form.department.name if submission.form.department else 'N/A').border = thin_border

        # Adjust column widths
        ws.column_dimensions['A'].width = 12
        ws.column_dimensions['B'].width = 25
        ws.column_dimensions['C'].width = 18
        ws.column_dimensions['D'].width = 15
        ws.column_dimensions['E'].width = 18
        ws.column_dimensions['F'].width = 18

        # Summary section
        summary_row = len(list(submissions)) + 6
        ws.cell(row=summary_row, column=1, value="Summary").font = Font(bold=True, size=12)
        ws.cell(row=summary_row + 1, column=1, value=f"Total Submissions: {submissions.count()}")
        ws.cell(row=summary_row + 2, column=1, value=f"Report Generated: {timezone.now().strftime('%Y-%m-%d %H:%M')}")

        # Save to response
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)

        response = HttpResponse(
            output.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="submissions_report_{timezone.now().strftime("%Y%m%d")}.xlsx"'
        return response

    def _export_pdf(self, submissions, start_date, end_date):
        """Generate PDF export of submissions."""
        try:
            from reportlab.lib import colors
            from reportlab.lib.pagesizes import A4, landscape
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
            from reportlab.lib.units import inch
        except ImportError:
            return Response(
                {"error": "reportlab is not installed. Run: pip install reportlab"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        output = io.BytesIO()
        doc = SimpleDocTemplate(output, pagesize=landscape(A4), topMargin=0.5*inch, bottomMargin=0.5*inch)
        elements = []
        styles = getSampleStyleSheet()

        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=16,
            spaceAfter=20,
            alignment=1  # Center
        )
        title = Paragraph(
            f"Submissions Report<br/>{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}",
            title_style
        )
        elements.append(title)
        elements.append(Spacer(1, 20))

        # Table data
        data = [['ID', 'Form Name', 'Submitted By', 'Status', 'Submitted At', 'Department']]
        for submission in submissions:
            data.append([
                str(submission.id)[:8],
                submission.form.name[:30] if len(submission.form.name) > 30 else submission.form.name,
                submission.submitted_by.username if submission.submitted_by else 'N/A',
                submission.status,
                submission.submitted_at.strftime('%Y-%m-%d %H:%M') if submission.submitted_at else 'N/A',
                submission.form.department.name if submission.form.department else 'N/A'
            ])

        # Create table
        table = Table(data, colWidths=[1*inch, 2.5*inch, 1.5*inch, 1.2*inch, 1.5*inch, 1.5*inch])

        # Sky blue header color matching design system
        sky_blue = colors.HexColor('#0EA5E9')

        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), sky_blue),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#E2E8F0')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')]),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 1), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
        ]))
        elements.append(table)

        # Summary
        elements.append(Spacer(1, 30))
        summary_style = ParagraphStyle('Summary', parent=styles['Normal'], fontSize=10)
        elements.append(Paragraph(f"<b>Total Submissions:</b> {submissions.count()}", summary_style))
        elements.append(Paragraph(f"<b>Report Generated:</b> {timezone.now().strftime('%Y-%m-%d %H:%M')}", summary_style))

        # Build PDF
        doc.build(elements)
        output.seek(0)

        response = HttpResponse(output.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="submissions_report_{timezone.now().strftime("%Y%m%d")}.pdf"'
        return response

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get submission statistics for dashboard - counts all submissions without pagination."""
        from workflows.models import WorkflowInstance

        # Get base queryset based on user role (same logic as get_queryset)
        user = request.user
        submission_queryset = FormSubmission.objects.all()

        if user.role == 'USER':
            submission_queryset = submission_queryset.filter(submitted_by=user)
        elif user.role == 'MANAGER':
            if user.department:
                submission_queryset = submission_queryset.filter(form__department=user.department)
            else:
                submission_queryset = submission_queryset.none()
        # ADMIN can see all submissions

        # Workflow instances queryset (based on accessible submissions)
        submission_ids = submission_queryset.values_list('id', flat=True)
        workflow_queryset = WorkflowInstance.objects.filter(submission_id__in=submission_ids)

        # Calculate stats
        total = submission_queryset.count()
        submitted = submission_queryset.filter(status='SUBMITTED').count()
        draft = submission_queryset.filter(status='DRAFT').count()
        with_workflow = workflow_queryset.count()
        in_progress = workflow_queryset.filter(status='IN_PROGRESS').count()
        completed = workflow_queryset.filter(status='COMPLETED').count()
        failed = workflow_queryset.filter(status='FAILED').count()
        needs_admin_action = workflow_queryset.filter(status='NEEDS_ADMIN_ACTION').count()

        return Response({
            'total': total,
            'submitted': submitted,
            'draft': draft,
            'withWorkflow': with_workflow,
            'inProgress': in_progress,
            'completed': completed,
            'failed': failed,
            'needsAdminAction': needs_admin_action
        })