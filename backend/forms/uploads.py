"""
Validation and storage of files attached to form submissions.
"""
from pathlib import Path

from django.conf import settings
from rest_framework.exceptions import ValidationError

from .models import FormField, FormFile


def validate_uploads(form, files):
    """
    Check every uploaded file against the form's FILE fields, the allowed extensions and the
    size limit. Returns [(FormField, UploadedFile), ...] or raises ValidationError keyed by field.
    """
    if not files:
        return []

    file_fields = {f.name: f for f in form.fields.filter(field_type=FormField.FieldType.FILE)}
    allowed = settings.ALLOWED_FILE_EXTENSIONS
    max_mb = settings.MAX_UPLOAD_SIZE // (1024 * 1024)

    uploads, errors = [], {}
    for name, upload in files.items():
        field = file_fields.get(name)
        extension = Path(upload.name).suffix.lower().lstrip('.')
        if field is None:
            errors[name] = 'This form has no file field with that name.'
        elif extension not in allowed:
            errors[name] = f"'.{extension}' files are not allowed. Allowed types: {', '.join(allowed)}."
        elif upload.size > settings.MAX_UPLOAD_SIZE:
            errors[name] = f'The file is larger than {max_mb} MB.'
        else:
            uploads.append((field, upload))

    if errors:
        raise ValidationError(errors)
    return uploads


def save_uploads(submission, uploads):
    """Store validated uploads, replacing an earlier file for the same field."""
    for field, upload in uploads:
        FormFile.objects.filter(submission=submission, field=field).delete()
        FormFile.objects.create(
            submission=submission,
            field=field,
            file=upload,
            original_name=upload.name,
            file_size=upload.size,
            mime_type=getattr(upload, 'content_type', '') or '',
        )
