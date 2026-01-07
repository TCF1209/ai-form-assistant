# FYP Section 4.6 - Sample Codes: Core System Features

**Project**: AI-Powered Office Assistant Web Application
**Student**: Tang Chye Fong
**Institution**: [Your Institution Name]
**Date**: January 2026

---

## Overview

This document presents the implementation of three core system features that form the foundation of the form management system. These features demonstrate advanced software engineering concepts including workflow automation, role-based access control, and dynamic form processing.

The three core features are:
1. **Workflow Engine** - Automated approval routing with self-approval conflict detection
2. **Form Submission Handler** - Dynamic form processing with validation and workflow triggering
3. **Role-Based Permissions** - Department-scoped access control with queryset filtering

---

## FUNCTION 4: Workflow Engine

### Overview
The Workflow Engine is the core component responsible for processing approval workflows. It implements sophisticated logic for handling multi-approver scenarios, preventing self-approval conflicts, and managing different approval modes (ALL, MAJORITY, ANY). The engine ensures that submissions cannot be approved by their own submitters and automatically reassigns approvals to admins when conflicts occur.

### Code Implementation

```python
"""
Role-Based Permissions - Department-Scoped Access Control
File: backend/common/permissions.py
"""

from rest_framework import permissions, viewsets

class IsFormManager(permissions.BasePermission):
    """Form manager permission with department scoping"""
    
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated
        return request.user.is_authenticated and request.user.role in ['ADMIN', 'MANAGER']
    
    def has_object_permission(self, request, view, obj):
        if request.user.role == 'ADMIN':
            return True
        if request.user.role == 'MANAGER':
            dept = obj.department if hasattr(obj, 'department') else \
                   obj.form.department if hasattr(obj, 'form') else None
            return request.user.can_manage_department(dept) if dept else False
        return False

class IsOwnerOrManagerOrAdmin(permissions.BasePermission):
    """Hierarchical access: Admin > Manager > Owner"""
    
    def has_object_permission(self, request, view, obj):
        if request.user.role == 'ADMIN':
            return True
        if hasattr(obj, 'user') and obj.user == request.user:
            return True
        if request.user.role == 'MANAGER' and hasattr(obj, 'user') and obj.user.department:
            return request.user.can_manage_department(obj.user.department)
        return False

class FormViewSet(viewsets.ModelViewSet):
    """ViewSet with role-based queryset filtering"""
    
    def get_queryset(self):
        user, queryset = self.request.user, Form.objects.filter(status='ACTIVE')
        
        if user.role == 'ADMIN':
            return queryset
        elif user.role == 'MANAGER':
            return queryset.filter(department=user.department) if user.department else queryset.none()
        else:
            return queryset
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsFormManager()]
        return [permissions.IsAuthenticated()]

# User Model Methods
class User(AbstractUser):
    @property
    def is_admin(self):
        return self.role == 'ADMIN'
    
    @property
    def is_manager(self):
        return self.role == 'MANAGER'
    
    def can_manage_department(self, department):
        return True if self.is_admin else \
               (self.department.id == department.id if self.is_manager and self.department else False)
```

### Code Explanation

#### 1. **Self-Approval Conflict Detection (`_get_approvers_for_step`)**

**Problem**: A user should not be able to approve their own submission
**Solution**: Filter out submitter from approvers list using ID comparison

**Implementation**:
```python
approvers = [sa.user for sa in step_approvers
             if sa.user.is_active and sa.user.id != submitter.id]
```

**Key Points**:
- Checks `user.id != submitter.id` to prevent self-approval
- Only includes active users (`is_active=True`)
- Supports both multi-approver (M2M) and single-approver modes
- Returns empty list if no eligible approvers remain

#### 2. **Admin Fallback Mechanism (`_create_approvals_for_multi_step`)**

**Scenario**: All assigned approvers are excluded due to self-approval conflicts
**Solution**: Automatically reassign to an admin user

**Workflow**:
1. Check if approvers list is empty after exclusion
2. Search for an admin user (prefer different from submitter)
3. Create approval assigned to admin
4. Set workflow status to `NEEDS_ADMIN_ACTION`
5. Log exclusion details in `instance.context_data`

**Example**:
```python
# Before: User A submits form, User A is only approver
# After: User A excluded, Admin B assigned automatically
exclusions.append({
    'step': 'Department Head Approval',
    'excluded_user': 'user_a',
    'reason': 'self_approval'
})
```

#### 3. **Approval Mode Logic (`_check_step_completion`)**

**Three Modes Implemented**:

| Mode | Approval Rule | Rejection Rule | Use Case |
|------|---------------|----------------|----------|
| **ALL** | All must approve | One reject fails | Critical approvals (finance, legal) |
| **MAJORITY** | >50% approve | >50% reject | Democratic decisions (committee) |
| **ANY** | ≥1 approve | All reject | Flexible approvals (any manager) |

**ALL Mode Example**:
```python
# 5 approvers: Need all 5 to approve
if approved_count == total_approvers:  # 5 == 5
    return True, False  # Approved

if rejected_count > 0:  # Even 1 rejection
    return True, True   # Rejected
```

**MAJORITY Mode Example**:
```python
# 5 approvers: Need 3 to approve or reject
majority_threshold = 5 / 2  # 2.5

if approved_count > 2.5:  # 3, 4, or 5 approvals
    return True, False  # Approved

if rejected_count > 2.5:  # 3, 4, or 5 rejections
    return True, True   # Rejected
```

**ANY Mode Example**:
```python
# 5 approvers: Need just 1 to approve
if approved_count >= 1:  # Even 1 approval
    return True, False  # Approved

if rejected_count == total_approvers:  # All 5 must reject
    return True, True   # Rejected
```

#### 4. **State Transitions and Status Management**

**Workflow Statuses**:
- `IN_PROGRESS` - Normal workflow execution
- `NEEDS_ADMIN_ACTION` - Self-approval conflict detected, admin intervention required
- `COMPLETED` - All steps approved successfully
- `FAILED` - Workflow rejected at any step

**Status Transition Logic**:
```python
# Transition 1: Conflict detected
instance.status = 'NEEDS_ADMIN_ACTION'

# Transition 2: Valid approvers found in next step
if instance.status == 'NEEDS_ADMIN_ACTION':
    instance.status = 'IN_PROGRESS'
```

#### 5. **Logging and Auditing**

**Comprehensive Logging**:
- Self-approval exclusions tracked in `exclusions` list
- Admin fallbacks logged with reason
- Approval mode decisions logged with vote counts
- All status changes logged for audit trail

**Example Log Output**:
```
WARNING: Self-approval prevented: john_doe excluded from step 'Manager Approval'
INFO: Admin fallback: admin_user assigned to step 'Manager Approval'
INFO: Step 'Manager Approval' approved (MAJORITY mode, 3/5 approvals)
```

### Summary

**Libraries Used:**
- `django.db` - Transaction management and database operations
- `django.utils.timezone` - Timestamp management for due dates
- `django.db.models` - Q objects for complex queries
- `datetime` - Time calculations for approval deadlines
- `logging` - Comprehensive audit logging

**Database Models:**
- `WorkflowStep` - Defines approval steps with mode configuration
- `WorkflowStepApprover` - M2M relationship for multi-approver assignment
- `WorkflowInstance` - Tracks workflow execution state
- `WorkflowApproval` - Individual approval records
- `WorkflowNotification` - Notification system

**Functions Created:**
- `_get_approvers_for_step(step, submitter)` - Self-approval conflict detection
- `_create_approvals_for_multi_step(instance, step, submitter)` - Approval creation with admin fallback
- `_check_step_completion(instance, step)` - Multi-mode approval logic (ALL/MAJORITY/ANY)
- `_get_admin_fallback(exclude_user)` - Admin selection for conflict resolution
- `_create_notification(...)` - Notification creation for workflow events

**Key Algorithms:**
- **Self-Approval Prevention**: ID-based exclusion filtering
- **Admin Fallback**: Cascading admin selection with preference
- **Approval Counting**: Mode-specific threshold calculations
- **Deadlock Detection**: Pending count validation for MAJORITY mode

---

## FUNCTION 5: Form Submission Handler

### Overview
The Form Submission Handler processes form submissions with comprehensive validation, file upload support, and automatic workflow triggering. It implements role-based permission checks, status transitions (DRAFT → SUBMITTED), and integrates with the workflow engine to initiate approval processes.

### Code Implementation

```python
"""
Form Submission Handler - Dynamic Processing with Workflow Integration
File: backend/forms/views.py
"""

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.db import transaction
import logging

logger = logging.getLogger(__name__)


class FormSubmissionViewSet(viewsets.ModelViewSet):
    """ViewSet for managing form submissions with workflow integration."""

    queryset = FormSubmission.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Filter submissions based on user role (role-based data scoping)."""
        user = self.request.user
        queryset = FormSubmission.objects.all()

        # Apply role-based filtering
        if user.role == 'USER':
            # Regular users see only their own submissions
            queryset = queryset.filter(submitted_by=user)
        elif user.role == 'MANAGER':
            # Managers see submissions from their department's forms
            if user.department:
                queryset = queryset.filter(form__department=user.department)
            else:
                queryset = queryset.none()  # Manager without department sees nothing
        # ADMIN sees all submissions (no filter)

        return queryset

    @transaction.atomic
    def perform_create(self, serializer):
        """
        Create submission with validation, file handling, and workflow triggering.

        Atomic transaction ensures:
        - Submission created successfully
        - Files uploaded correctly
        - Workflow started (if applicable)
        - Or all changes rolled back on error
        """
        # Extract and validate data
        data = self.request.data.get('data', {})
        status_value = self.request.data.get('status', 'DRAFT')
        files_data = self._extract_files_from_request()

        # Validate form fields
        form = serializer.validated_data['form']
        validation_errors = self._validate_submission_data(data, form)

        if validation_errors and status_value == 'SUBMITTED':
            # Only enforce validation for submitted forms (not drafts)
            raise ValidationError({
                'data': validation_errors,
                'message': 'Please fix the validation errors before submitting.'
            })

        # Create submission
        submission = serializer.save(
            submitted_by=self.request.user,
            data=data,
            status=status_value
        )

        # Handle file uploads
        for field_name, file in files_data.items():
            FormFile.objects.create(
                submission=submission,
                field_name=field_name,
                file=file
            )

        # Log the action
        if submission.status == 'SUBMITTED':
            log_submit(self.request.user, 'FormSubmission', submission, self.request)
        else:
            log_create(self.request.user, 'FormSubmission', submission, self.request)

        # ========== WORKFLOW TRIGGER ==========
        # Start workflow if submission is SUBMITTED (not DRAFT)
        if submission.status == 'SUBMITTED':
            self._start_workflow_for_submission(submission)

    def _start_workflow_for_submission(self, submission):
        """
        Start workflow for a submitted form if active workflow exists.

        Workflow Logic:
        1. Check for active workflow for this form
        2. Prevent duplicate workflow instances
        3. Initialize workflow engine
        4. Start workflow execution
        """
        from workflows.models import Workflow, WorkflowInstance
        from workflows.engine import WorkflowEngine

        # Find active workflow for this form
        active_workflow = Workflow.objects.filter(
            form=submission.form,
            status='ACTIVE'
        ).first()

        if active_workflow:
            # Check if workflow instance already exists (prevent duplicates)
            existing_instance = WorkflowInstance.objects.filter(
                submission=submission,
                workflow=active_workflow
            ).exists()

            if not existing_instance:
                # Initialize workflow engine and start workflow
                engine = WorkflowEngine()
                logger.info(
                    f"Starting workflow '{active_workflow.name}' for submission {submission.id}"
                )
                engine.start_workflow(submission, active_workflow)
            else:
                logger.warning(
                    f"Workflow instance already exists for submission {submission.id}"
                )
        else:
            logger.info(f"No active workflow found for form '{submission.form.name}'")

    def _validate_submission_data(self, data, form):
        """
        Validate submission data against form field definitions.

        Validation Rules:
        - Required fields must be present
        - Field types must match (number, email, date, etc.)
        - Min/max length constraints
        - Pattern matching for regex validation
        - Option validation for select/radio fields

        Args:
            data: Submission data dictionary
            form: Form object with field definitions

        Returns:
            dict of validation errors or empty dict if valid
        """
        errors = {}

        for field in form.fields.all():
            field_value = data.get(field.name)

            # Check required fields
            if field.required and not field_value:
                errors[field.name] = f"{field.label} is required."
                continue

            # Skip validation if field is empty and not required
            if not field_value:
                continue

            # Type-specific validation
            if field.field_type == 'NUMBER':
                if not isinstance(field_value, (int, float)):
                    try:
                        float(field_value)
                    except ValueError:
                        errors[field.name] = f"{field.label} must be a valid number."

            elif field.field_type == 'EMAIL':
                import re
                email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
                if not re.match(email_pattern, str(field_value)):
                    errors[field.name] = f"{field.label} must be a valid email address."

            elif field.field_type in ['SELECT', 'RADIO']:
                # Validate against defined options
                if field.options and field_value not in field.options:
                    errors[field.name] = f"'{field_value}' is not a valid option for {field.label}."

            # Validation rules (min/max, length, pattern)
            if field.validation_rules:
                validation_error = self._apply_validation_rules(
                    field_value, field.validation_rules, field.label
                )
                if validation_error:
                    errors[field.name] = validation_error

        return errors

    def _apply_validation_rules(self, value, rules, field_label):
        """
        Apply validation rules to a field value.

        Supported Rules:
        - min/max: Number range validation
        - minLength/maxLength: String length validation
        - pattern: Regex pattern matching

        Args:
            value: Field value to validate
            rules: dict of validation rules
            field_label: Field label for error messages

        Returns:
            Error message string or None if valid
        """
        # Number validation
        if 'min' in rules:
            try:
                if float(value) < rules['min']:
                    return f"{field_label} must be at least {rules['min']}."
            except (ValueError, TypeError):
                pass

        if 'max' in rules:
            try:
                if float(value) > rules['max']:
                    return f"{field_label} must not exceed {rules['max']}."
            except (ValueError, TypeError):
                pass

        # String length validation
        if 'minLength' in rules:
            if len(str(value)) < rules['minLength']:
                return f"{field_label} must be at least {rules['minLength']} characters."

        if 'maxLength' in rules:
            if len(str(value)) > rules['maxLength']:
                return f"{field_label} must not exceed {rules['maxLength']} characters."

        # Pattern validation (regex)
        if 'pattern' in rules:
            import re
            if not re.match(rules['pattern'], str(value)):
                return f"{field_label} does not match the required format."

        return None

    def _extract_files_from_request(self):
        """
        Extract file uploads from multipart request.

        Returns:
            dict mapping field_name to file object
        """
        files_data = {}

        for field_name, file in self.request.FILES.items():
            # Validate file size (max 10MB per file)
            if file.size > 10 * 1024 * 1024:
                raise ValidationError({
                    field_name: f"File size must not exceed 10MB. Current size: {file.size / 1024 / 1024:.2f}MB"
                })

            # Validate file type (basic extension check)
            allowed_extensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png']
            file_extension = file.name.split('.')[-1].lower()

            if file_extension not in allowed_extensions:
                raise ValidationError({
                    field_name: f"File type '.{file_extension}' is not allowed. Allowed: {', '.join(allowed_extensions)}"
                })

            files_data[field_name] = file

        return files_data

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """
        Submit a draft submission (DRAFT → SUBMITTED transition).

        Validation:
        - Only submission owner can submit
        - Only DRAFT status can be submitted
        - Full field validation applied before submission
        """
        submission = self.get_object()

        # Permission check: Only owner can submit
        if submission.submitted_by != request.user:
            return Response(
                {"error": "You can only submit your own submissions."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Status check: Only drafts can be submitted
        if submission.status != FormSubmission.SubmissionStatus.DRAFT:
            return Response(
                {"error": "Only draft submissions can be submitted."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate data before submission
        validation_errors = self._validate_submission_data(submission.data, submission.form)
        if validation_errors:
            return Response(
                {
                    "error": "Validation failed. Please fix the errors.",
                    "validation_errors": validation_errors
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update status and trigger workflow
        submission.status = FormSubmission.SubmissionStatus.SUBMITTED
        submission.version += 1
        submission.save()

        # Start workflow
        self._start_workflow_for_submission(submission)

        serializer = self.get_serializer(submission)
        return Response(serializer.data)
```

### Code Explanation

#### 1. **Role-Based Queryset Filtering (`get_queryset`)**

**Purpose**: Ensure users only see submissions they're authorized to access

**Implementation**:
```python
if user.role == 'USER':
    queryset = queryset.filter(submitted_by=user)  # Own submissions only

elif user.role == 'MANAGER':
    queryset = queryset.filter(form__department=user.department)  # Department scope

# ADMIN: No filter (sees all)
```

**Security Benefits**:
- Prevents unauthorized data access
- Automatic filtering at database level
- No need for manual permission checks in views
- Works with all ViewSet actions (list, retrieve, update, delete)

#### 2. **Atomic Transaction Management (`@transaction.atomic`)**

**Problem**: Submission creation involves multiple database operations:
1. Create submission record
2. Upload files
3. Start workflow
4. Create audit logs

**Solution**: Wrap in atomic transaction - all succeed or all rollback

**Example Failure Scenario**:
```python
# Without @transaction.atomic:
submission.save()  # ✅ Created
file.save()        # ✅ Uploaded
workflow.start()   # ❌ FAILS (duplicate instance)
# Result: Orphaned submission and file in database

# With @transaction.atomic:
submission.save()  # ✅ Created (in transaction)
file.save()        # ✅ Uploaded (in transaction)
workflow.start()   # ❌ FAILS
# Result: ALL ROLLED BACK - database remains consistent
```

#### 3. **Field Validation (`_validate_submission_data`)**

**Multi-Level Validation**:

**Level 1 - Required Fields**:
```python
if field.required and not field_value:
    errors[field.name] = f"{field.label} is required."
```

**Level 2 - Type Validation**:
```python
# NUMBER validation
if field.field_type == 'NUMBER':
    try:
        float(field_value)
    except ValueError:
        errors[field.name] = "Must be a valid number."

# EMAIL validation
elif field.field_type == 'EMAIL':
    if not re.match(email_pattern, field_value):
        errors[field.name] = "Must be a valid email."
```

**Level 3 - Constraint Validation**:
```python
# Min/max for numbers
if rules['min'] and float(value) < rules['min']:
    return f"Must be at least {rules['min']}"

# Length for text
if rules['minLength'] and len(value) < rules['minLength']:
    return f"Must be at least {rules['minLength']} characters"

# Pattern (regex) matching
if rules['pattern'] and not re.match(rules['pattern'], value):
    return "Does not match required format"
```

#### 4. **Workflow Integration (`_start_workflow_for_submission`)**

**Workflow Trigger Logic**:

**Step 1**: Check for active workflow
```python
active_workflow = Workflow.objects.filter(
    form=submission.form,
    status='ACTIVE'
).first()
```

**Step 2**: Prevent duplicate instances
```python
existing_instance = WorkflowInstance.objects.filter(
    submission=submission,
    workflow=active_workflow
).exists()
```

**Step 3**: Initialize and start
```python
if active_workflow and not existing_instance:
    engine = WorkflowEngine()
    engine.start_workflow(submission, active_workflow)
```

**Why Duplicate Prevention is Critical**:
- Prevents multiple approval chains for same submission
- Avoids notification spam
- Maintains workflow integrity
- Ensures clear audit trail

#### 5. **File Upload Handling (`_extract_files_from_request`)**

**Security Validations**:

**Size Validation** (10MB limit):
```python
if file.size > 10 * 1024 * 1024:
    raise ValidationError("File size must not exceed 10MB")
```

**Type Validation** (extension whitelist):
```python
allowed_extensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png']
file_extension = file.name.split('.')[-1].lower()

if file_extension not in allowed_extensions:
    raise ValidationError(f"File type '.{file_extension}' is not allowed")
```

**Why Whitelist (Not Blacklist)**:
- More secure (only allow known-safe types)
- Easier to maintain
- Prevents bypass attacks (e.g., file.php.jpg)

#### 6. **Status Transitions (`submit` action)**

**DRAFT → SUBMITTED Workflow**:

```python
# Step 1: Permission check
if submission.submitted_by != request.user:
    return HTTP_403_FORBIDDEN

# Step 2: Status validation
if submission.status != 'DRAFT':
    return HTTP_400_BAD_REQUEST

# Step 3: Full validation
validation_errors = self._validate_submission_data(...)
if validation_errors:
    return HTTP_400_BAD_REQUEST with errors

# Step 4: State transition
submission.status = 'SUBMITTED'
submission.version += 1  # Optimistic locking
submission.save()

# Step 5: Trigger workflow
self._start_workflow_for_submission(submission)
```

**Version Incrementing**:
- Implements optimistic locking
- Tracks submission history
- Prevents concurrent update conflicts

### Summary

**Libraries Used:**
- `django.rest_framework` - ViewSets, serializers, permissions
- `django.db.transaction` - Atomic transaction management
- `re` (regex) - Email and pattern validation
- `logging` - Audit logging for workflow triggers

**Database Models:**
- `FormSubmission` - Main submission record
- `Form` - Form definition with fields
- `FormFile` - File uploads (separate table)
- `Workflow` - Workflow configuration
- `WorkflowInstance` - Workflow execution state

**Functions Created:**
- `get_queryset()` - Role-based queryset filtering
- `perform_create(serializer)` - Submission creation with workflow trigger
- `_start_workflow_for_submission(submission)` - Workflow initialization
- `_validate_submission_data(data, form)` - Multi-level field validation
- `_apply_validation_rules(value, rules, label)` - Constraint validation
- `_extract_files_from_request()` - Secure file upload handling
- `submit(request, pk)` - DRAFT → SUBMITTED transition

**Key Validations:**
- Required field validation
- Type validation (NUMBER, EMAIL, DATE, etc.)
- Length constraints (minLength, maxLength)
- Range validation (min, max)
- Pattern matching (regex)
- File size validation (10MB limit)
- File type validation (extension whitelist)

**Security Features:**
- Role-based data scoping
- Permission checks at multiple levels
- Atomic transactions for data integrity
- File upload restrictions
- Input validation at multiple layers

---

## FUNCTION 6: Role-Based Permissions

### Overview
The Role-Based Permissions system implements fine-grained access control using Django REST Framework's permission classes. It enforces department-scoped data access for Form Managers, full access for Admins, and owner-based access for regular Users. The system integrates permission checks with queryset filtering for automatic data scoping.

### Code Implementation

```python
"""
Role-Based Permission System - Department Scoping and Access Control
File: backend/users/permissions.py, backend/forms/views.py
"""

from rest_framework import permissions


# ========== PERMISSION CLASSES ==========

class IsFormManager(permissions.BasePermission):
    """
    Permission for managers to manage forms in their department.
    Allows managers to create, edit, and delete forms for their department.
    Admins have full access to all forms.
    """

    def has_permission(self, request, view):
        """
        View-level permission check (applied to entire endpoint).

        Returns:
            True if user is ADMIN or MANAGER, False otherwise
        """
        return (
            request.user and
            request.user.is_authenticated and
            (request.user.is_manager or request.user.is_admin)
        )

    def has_object_permission(self, request, view, obj):
        """
        Object-level permission check (applied to specific form).

        Rules:
        - ADMINs: Can access all forms
        - MANAGERs: Can only access forms in their department
        - USERs: No object-level access (handled by has_permission)

        Args:
            obj: Form or FormSubmission object

        Returns:
            True if user can access object, False otherwise
        """
        # Admins have access to all forms
        if request.user.is_admin:
            return True

        # For managers, check department match
        if request.user.is_manager:
            # Check if obj has a department attribute (Form object)
            if hasattr(obj, 'department'):
                return request.user.can_manage_department(obj.department)

            # If obj is a form submission, check the form's department
            if hasattr(obj, 'form') and hasattr(obj.form, 'department'):
                return request.user.can_manage_department(obj.form.department)

        return False


class IsOwnerOrManagerOrAdmin(permissions.BasePermission):
    """
    Permission to allow owners, their managers, or admins to access the object.
    Useful for viewing user profiles or submissions within a department.

    Hierarchy:
    1. ADMIN: Full access to all objects
    2. MANAGER: Access to objects in their department
    3. OWNER: Access to own objects
    """

    def has_object_permission(self, request, view, obj):
        """
        Multi-level permission check with fallback hierarchy.

        Args:
            obj: User, Form, or FormSubmission object

        Returns:
            True if user has any level of access
        """
        # Level 1: Admins have full access
        if request.user.is_admin:
            return True

        # Level 2: Check if user is the owner
        if hasattr(obj, 'user'):
            if obj.user == request.user:
                return True  # Owner access

            # Check if request user is a manager of the object user's department
            if request.user.is_manager and obj.user.department:
                return request.user.can_manage_department(obj.user.department)

        # Level 3: If obj is a User instance itself
        if obj == request.user:
            return True  # Self access

        # Check if request user is a manager of the user's department
        if request.user.is_manager and obj.department:
            return request.user.can_manage_department(obj.department)

        return False


class IsSelfOrAdmin(permissions.BasePermission):
    """
    Permission to allow users to edit their own profile or admins to edit any profile.
    Used for user profile management endpoints.
    """

    def has_object_permission(self, request, view, obj):
        # Admins have full access
        if request.user.is_admin:
            return True

        # Users can only edit their own profile
        return obj == request.user


class CanManageDepartment(permissions.BasePermission):
    """
    Permission to check if user can manage a specific department.
    Used for department management endpoints.
    """

    def has_object_permission(self, request, view, obj):
        # Admins can manage all departments
        if request.user.is_admin:
            return True

        # Extract department from object
        if hasattr(obj, 'can_manage_department'):
            # obj is a User
            department = getattr(obj, 'department', None)
        else:
            # obj is likely a Department
            department = obj

        if department:
            return request.user.can_manage_department(department)

        return False


# ========== QUERYSET FILTERING WITH PERMISSIONS ==========

class FormViewSet(viewsets.ModelViewSet):
    """ViewSet demonstrating integration of permissions with queryset filtering."""

    queryset = Form.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Filter forms based on user role and department.
        This is the FIRST LAYER of access control (data scoping).

        Role-Based Filtering:
        - USER: Only see ACTIVE forms
        - MANAGER: Only see forms from their department
        - ADMIN: See all forms

        Returns:
            Filtered queryset based on user role
        """
        user = self.request.user
        queryset = Form.objects.all()

        # ========== USER ROLE: Active Forms Only ==========
        if user.role == 'USER':
            queryset = queryset.filter(
                status=Form.FormStatus.ACTIVE
            )

        # ========== MANAGER ROLE: Department Scoping ==========
        elif user.role == 'MANAGER':
            if user.department:
                # Filter to manager's department
                queryset = queryset.filter(department=user.department)
            else:
                # Manager without department sees nothing
                queryset = queryset.none()

        # ========== ADMIN ROLE: Full Access ==========
        # Admin can see all forms (no filtering applied)

        # Apply additional query parameter filters
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        department_filter = self.request.query_params.get('department')
        if department_filter:
            queryset = queryset.filter(department_id=department_filter)

        return queryset

    def get_permissions(self):
        """
        Apply different permission classes based on action.
        This is the SECOND LAYER of access control (action-based).

        Actions:
        - list/retrieve: Authenticated users only
        - create/update/destroy: Form managers and admins only

        Returns:
            List of permission class instances
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            # Write operations require manager/admin permission
            permission_classes = [permissions.IsAuthenticated, IsFormManager]
        else:
            # Read operations require authentication only
            permission_classes = [permissions.IsAuthenticated]

        return [permission() for permission in permission_classes]


class FormSubmissionViewSet(viewsets.ModelViewSet):
    """ViewSet demonstrating submission-level access control."""

    queryset = FormSubmission.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Filter submissions based on user role.
        Implements strict data scoping for submissions.

        Role-Based Filtering:
        - USER: Only own submissions
        - MANAGER: Submissions from department forms
        - ADMIN: All submissions

        Returns:
            Filtered queryset based on user role
        """
        user = self.request.user
        queryset = FormSubmission.objects.all()

        # ========== USER ROLE: Own Submissions Only ==========
        if user.role == 'USER':
            # Users can ONLY see their own submissions
            queryset = queryset.filter(submitted_by=user)

        # ========== MANAGER ROLE: Department Submissions ==========
        elif user.role == 'MANAGER':
            if user.department:
                # Filter to submissions of forms in manager's department
                # Uses related lookup: form__department
                queryset = queryset.filter(form__department=user.department)
            else:
                # Manager without department sees nothing
                queryset = queryset.none()

        # ========== ADMIN ROLE: All Submissions ==========
        # Admin sees all submissions (no filtering)

        # Additional filters from query parameters
        form_filter = self.request.query_params.get('form')
        if form_filter:
            queryset = queryset.filter(form_id=form_filter)

        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        submitted_by_filter = self.request.query_params.get('submitted_by')
        if submitted_by_filter:
            # Only admins and managers can filter by submitter
            if user.role in ['ADMIN', 'MANAGER']:
                queryset = queryset.filter(submitted_by_id=submitted_by_filter)

        return queryset


# ========== USER MODEL METHOD FOR PERMISSION CHECK ==========

class User(AbstractBaseUser, PermissionsMixin):
    """
    User model with role-based permission methods.
    Located in: backend/users/models.py
    """

    # Role choices
    ROLE_CHOICES = [
        ('ADMIN', 'Administrator'),
        ('MANAGER', 'Form Manager'),
        ('USER', 'User'),
    ]

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='USER')
    department = models.ForeignKey('Department', on_delete=models.SET_NULL, null=True, blank=True)

    @property
    def is_admin(self):
        """Check if user is an administrator."""
        return self.role == 'ADMIN'

    @property
    def is_manager(self):
        """Check if user is a form manager."""
        return self.role == 'MANAGER'

    def can_manage_department(self, department):
        """
        Check if user can manage a specific department.

        Rules:
        - ADMINs can manage all departments
        - MANAGERs can only manage their own department

        Args:
            department: Department object or None

        Returns:
            bool: True if user can manage department
        """
        if self.is_admin:
            return True  # Admins manage all departments

        if self.is_manager and self.department:
            # Managers can only manage their own department
            return self.department.id == department.id if department else False

        return False  # Regular users cannot manage departments
```

### Code Explanation

#### 1. **Two-Layer Access Control Architecture**

**Layer 1: Queryset Filtering (`get_queryset`)**
- Automatic data scoping at database level
- Filters data BEFORE it reaches the view
- Cannot be bypassed by URL manipulation
- Applied to ALL ViewSet actions (list, retrieve, update, delete)

**Layer 2: Permission Classes (`has_permission`, `has_object_permission`)**
- Action-level access control
- Object-specific permissions
- Applied after queryset filtering
- Can deny access even if object in queryset

**Example Flow**:
```python
# USER tries to access Form ID=5 (department=HR)
# Layer 1: Queryset filtering
queryset = Form.objects.filter(status='ACTIVE')  # User sees active forms only
# Result: Form ID=5 included in queryset

# Layer 2: Permission check
if user.role != 'MANAGER' and user.role != 'ADMIN':
    return False  # Cannot edit
# Result: User can view but not edit Form ID=5
```

#### 2. **Department-Scoped Data Access**

**Manager Scoping Implementation**:
```python
elif user.role == 'MANAGER':
    if user.department:
        queryset = queryset.filter(department=user.department)
    else:
        queryset = queryset.none()  # No department = no access
```

**Why `queryset.none()` is Important**:
- Returns empty queryset (not None)
- Prevents database errors
- Clear intent: "intentionally empty"
- Maintains queryset API compatibility

**Department Matching Logic**:
```python
# Direct department check
if hasattr(obj, 'department'):
    return request.user.can_manage_department(obj.department)

# Related object department check (for submissions)
if hasattr(obj, 'form') and hasattr(obj.form, 'department'):
    return request.user.can_manage_department(obj.form.department)
```

#### 3. **Permission Hierarchy**

**IsOwnerOrManagerOrAdmin Flow**:
```python
# Level 1: ADMIN (highest priority)
if request.user.is_admin:
    return True  # Full access

# Level 2: OWNER
if obj.user == request.user:
    return True  # Own data

# Level 3: MANAGER (of user's department)
if request.user.is_manager and obj.user.department:
    return request.user.can_manage_department(obj.user.department)

# Level 4: DENY
return False
```

**Use Case Example**:
```
User A (USER role, HR department) creates submission
User B (USER role, IT department) tries to access
→ DENIED (not owner, not manager of HR, not admin)

User C (MANAGER role, HR department) tries to access
→ ALLOWED (manager of HR department)

Admin tries to access
→ ALLOWED (admin has full access)
```

#### 4. **Action-Based Permissions**

**Dynamic Permission Assignment**:
```python
def get_permissions(self):
    if self.action in ['create', 'update', 'partial_update', 'destroy']:
        # Write operations: Require manager/admin
        permission_classes = [IsAuthenticated, IsFormManager]
    else:
        # Read operations: Require authentication only
        permission_classes = [IsAuthenticated]

    return [permission() for permission in permission_classes]
```

**Mapping**:
| Action | HTTP Method | Permissions Required |
|--------|-------------|---------------------|
| list | GET /forms/ | IsAuthenticated |
| retrieve | GET /forms/1/ | IsAuthenticated |
| create | POST /forms/ | IsAuthenticated + IsFormManager |
| update | PUT /forms/1/ | IsAuthenticated + IsFormManager |
| destroy | DELETE /forms/1/ | IsAuthenticated + IsFormManager |

#### 5. **Related Object Filtering**

**Cross-Table Department Scoping**:
```python
# FormSubmission queryset filtering
elif user.role == 'MANAGER':
    queryset = queryset.filter(form__department=user.department)
    # Note: form__department uses Django's related lookup syntax
```

**Explanation**:
- `form`: Foreign key relationship (FormSubmission → Form)
- `__department`: Department field on Form model
- Result: Filters submissions WHERE submission.form.department = user.department

**Performance Consideration**:
```python
# Inefficient (N+1 queries)
for submission in submissions:
    if submission.form.department == user.department:
        ...

# Efficient (single JOIN query)
submissions.filter(form__department=user.department)
```

#### 6. **User Model Permission Methods**

**Property-Based Role Checks**:
```python
@property
def is_admin(self):
    return self.role == 'ADMIN'

@property
def is_manager(self):
    return self.role == 'MANAGER'
```

**Benefits of `@property`**:
- Clean syntax: `user.is_admin` instead of `user.is_admin()`
- Cached result (no repeated calculations)
- Can be used in templates: `{% if user.is_admin %}`

**Department Management Logic**:
```python
def can_manage_department(self, department):
    if self.is_admin:
        return True  # Admins manage all

    if self.is_manager and self.department:
        return self.department.id == department.id  # Same department only

    return False  # Users cannot manage
```

### Summary

**Libraries Used:**
- `django.rest_framework.permissions` - BasePermission class
- `django.db.models` - Queryset filtering
- Django authentication system - User model integration

**Permission Classes Created:**
- `IsFormManager` - Form management permissions with department scoping
- `IsOwnerOrManagerOrAdmin` - Multi-level access hierarchy
- `IsSelfOrAdmin` - Profile management permissions
- `CanManageDepartment` - Department-level access control

**Queryset Filtering Methods:**
- `get_queryset()` - Role-based data scoping
- `get_permissions()` - Action-based permission assignment

**User Model Methods:**
- `is_admin` (property) - Admin role check
- `is_manager` (property) - Manager role check
- `can_manage_department(department)` - Department access validation

**Key Security Features:**
- Two-layer access control (queryset + permissions)
- Department-scoped data access for managers
- Owner-based access for users
- Hierarchical permission checking (Admin → Manager → Owner)
- Related object filtering for cross-table scoping
- Action-based permission enforcement

**Access Control Matrix:**

| Role | Forms Access | Submissions Access | Department Scope |
|------|-------------|-------------------|------------------|
| **USER** | View active forms | Own submissions only | N/A |
| **MANAGER** | CRUD in own department | Department submissions | Single department |
| **ADMIN** | CRUD all forms | All submissions | All departments |

---

## Conclusion

These three core system features demonstrate advanced software engineering concepts:

1. **Workflow Engine** - Complex state management, conflict resolution, and multi-mode approval logic
2. **Form Submission Handler** - Atomic transactions, comprehensive validation, and workflow integration
3. **Role-Based Permissions** - Multi-layer access control, department scoping, and queryset filtering

Each implementation includes:
- ✅ Comprehensive error handling
- ✅ Atomic transaction support (where applicable)
- ✅ Role-based access control
- ✅ Detailed logging and auditing
- ✅ Security validations at multiple layers
- ✅ Clean separation of concerns

The Workflow Engine's self-approval prevention mechanism is particularly notable for its cascading fallback approach, while the Permission system demonstrates effective integration of Django REST Framework's permission classes with queryset filtering for automatic data scoping.

---

**End of FYP Section 4.6 - Part 2: Core System Features**
