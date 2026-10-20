"""
Form models for dynamic form creation and management.
"""

from django.db import models
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
import uuid

User = get_user_model()


class Form(models.Model):
    """
    Main form model for storing form templates.
    """

    class FormStatus(models.TextChoices):
        DRAFT = 'DRAFT', _('Draft')
        ACTIVE = 'ACTIVE', _('Active')
        INACTIVE = 'INACTIVE', _('Inactive')
        ARCHIVED = 'ARCHIVED', _('Archived')

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    code = models.CharField(
        max_length=50,
        unique=True,
        blank=True,  # Allow blank - will be auto-generated if not provided
        help_text=_('Unique form identifier code')
    )
    description = models.TextField(blank=True)
    department = models.ForeignKey(
        'users.Department',
        on_delete=models.CASCADE,
        related_name='forms'
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_forms'
    )
    status = models.CharField(
        max_length=20,
        choices=FormStatus.choices,
        default=FormStatus.DRAFT
    )
    version = models.IntegerField(default=1)
    is_template = models.BooleanField(default=False)
    requires_approval = models.BooleanField(default=True)

    # AI-generated metadata
    ai_generated = models.BooleanField(default=False)
    ai_prompt = models.TextField(blank=True, help_text=_('Original prompt used for AI generation'))

    # Form configuration
    config = models.JSONField(
        default=dict,
        blank=True,
        help_text=_('Additional form configuration (submission limits, deadlines, etc.)')
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'forms'
        verbose_name = _('Form')
        verbose_name_plural = _('Forms')
        ordering = ['-created_at']
        unique_together = [['code', 'version']]
        indexes = [
            models.Index(fields=['department', 'status']),
            models.Index(fields=['created_by']),
        ]

    def __str__(self):
        return f"{self.name} (v{self.version})"

    def create_new_version(self):
        """Create a new version of this form."""
        self.pk = None
        self.id = uuid.uuid4()
        self.version += 1
        self.status = self.FormStatus.DRAFT
        self.save()
        return self


class FormField(models.Model):
    """
    Model for storing form fields with their properties.
    """

    class FieldType(models.TextChoices):
        TEXT = 'TEXT', _('Short Text')
        TEXTAREA = 'TEXTAREA', _('Long Text')
        NUMBER = 'NUMBER', _('Number')
        DATE = 'DATE', _('Date')
        TIME = 'TIME', _('Time')
        DATETIME = 'DATETIME', _('Date and Time')
        EMAIL = 'EMAIL', _('Email')
        PHONE = 'PHONE', _('Phone Number')
        URL = 'URL', _('URL')
        SELECT = 'SELECT', _('Dropdown')
        MULTISELECT = 'MULTISELECT', _('Multiple Choice')
        RADIO = 'RADIO', _('Radio Buttons')
        CHECKBOX = 'CHECKBOX', _('Checkbox')
        FILE = 'FILE', _('File Upload')
        SIGNATURE = 'SIGNATURE', _('Signature')
        RATING = 'RATING', _('Rating')

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    form = models.ForeignKey(
        Form,
        on_delete=models.CASCADE,
        related_name='fields'
    )
    name = models.CharField(max_length=100)
    label = models.CharField(max_length=200)
    field_type = models.CharField(max_length=20, choices=FieldType.choices)
    placeholder = models.CharField(max_length=200, blank=True)
    help_text = models.TextField(blank=True)
    required = models.BooleanField(default=False)
    order = models.IntegerField(default=0)

    # Validation rules
    validation_rules = models.JSONField(
        default=dict,
        blank=True,
        help_text=_('JSON field for validation rules (min, max, regex, etc.)')
    )

    # Options for select/radio/checkbox fields
    options = models.JSONField(
        default=list,
        blank=True,
        help_text=_('Options for select/radio/checkbox fields')
    )

    # Conditional logic
    conditional_logic = models.JSONField(
        default=dict,
        blank=True,
        help_text=_('Conditional display logic based on other fields')
    )

    # Default value
    default_value = models.TextField(blank=True)

    # Field width (for layout)
    width = models.IntegerField(
        default=100,
        validators=[MinValueValidator(25), MaxValueValidator(100)],
        help_text=_('Field width percentage (25, 50, 75, or 100)')
    )

    class Meta:
        db_table = 'form_fields'
        verbose_name = _('Form Field')
        verbose_name_plural = _('Form Fields')
        ordering = ['form', 'order']
        indexes = [
            models.Index(fields=['form', 'order']),
        ]

    def __str__(self):
        return f"{self.form.name} - {self.label}"


class FormSubmission(models.Model):
    """
    Model for storing form submissions.
    """

    class SubmissionStatus(models.TextChoices):
        DRAFT = 'DRAFT', _('Draft')
        SUBMITTED = 'SUBMITTED', _('Submitted')
        IN_REVIEW = 'IN_REVIEW', _('In Review')
        APPROVED = 'APPROVED', _('Approved')
        REJECTED = 'REJECTED', _('Rejected')
        CANCELLED = 'CANCELLED', _('Cancelled')
        WITHDRAWN = 'WITHDRAWN', _('Withdrawn')  # User withdrew their submission

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    form = models.ForeignKey(
        Form,
        on_delete=models.CASCADE,
        related_name='submissions'
    )
    submitted_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='form_submissions'
    )
    submission_number = models.CharField(
        max_length=50,
        unique=True,
        help_text=_('Auto-generated submission number')
    )
    status = models.CharField(
        max_length=20,
        choices=SubmissionStatus.choices,
        default=SubmissionStatus.DRAFT
    )

    # Submission data stored as JSON
    data = models.JSONField(
        default=dict,
        help_text=_('Form field values')
    )

    # Metadata
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'form_submissions'
        verbose_name = _('Form Submission')
        verbose_name_plural = _('Form Submissions')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['form', 'status']),
            models.Index(fields=['submitted_by']),
            models.Index(fields=['submission_number']),
            models.Index(fields=['status']),  # For status filtering
            models.Index(fields=['-submitted_at']),  # For date-based queries (Reports)
            models.Index(fields=['status', '-submitted_at']),  # Combined for Reports
        ]

    def __str__(self):
        return f"{self.submission_number} - {self.form.name}"

    def save(self, *args, **kwargs):
        if not self.submission_number:
            # e.g. LEAVE-20260121-3F9A2C: readable, and unique even for submissions made in the same second
            date = timezone.localdate().strftime('%Y%m%d')
            self.submission_number = f"{self.form.code}-{date}-{uuid.uuid4().hex[:6].upper()}"
        super().save(*args, **kwargs)


class FormFile(models.Model):
    """
    Model for storing files uploaded with form submissions.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    submission = models.ForeignKey(
        FormSubmission,
        on_delete=models.CASCADE,
        related_name='files'
    )
    field = models.ForeignKey(
        FormField,
        on_delete=models.CASCADE,
        related_name='uploaded_files'
    )
    file = models.FileField(upload_to='form_files/%Y/%m/%d/')
    original_name = models.CharField(max_length=255)
    file_size = models.IntegerField()
    mime_type = models.CharField(max_length=100)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'form_files'
        verbose_name = _('Form File')
        verbose_name_plural = _('Form Files')
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.original_name} - {self.submission.submission_number}"
