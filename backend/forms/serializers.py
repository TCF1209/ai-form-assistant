"""
Form serializers for REST API.
"""

from rest_framework import serializers
from .models import Form, FormField, FormSubmission, FormFile
from users.models import User, Department
from django.utils import timezone


class FormFieldSerializer(serializers.ModelSerializer):
    """Serializer for form fields."""

    class Meta:
        model = FormField
        fields = [
            'id', 'name', 'label', 'field_type', 'placeholder',
            'help_text', 'required', 'order', 'validation_rules',
            'options', 'conditional_logic', 'default_value', 'width'
        ]
        read_only_fields = ['id']


class FormListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for form lists."""
    department_name = serializers.CharField(source='department.name', read_only=True)
    created_by_name = serializers.SerializerMethodField()
    field_count = serializers.IntegerField(source='fields.count', read_only=True)
    submission_count = serializers.IntegerField(source='submissions.count', read_only=True)

    class Meta:
        model = Form
        fields = [
            'id', 'name', 'code', 'description', 'status',
            'department', 'department_name', 'created_by', 'created_by_name',
            'version', 'is_template', 'requires_approval', 'ai_generated',
            'field_count', 'submission_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_created_by_name(self, obj):
        """Get creator's name with fallback to username."""
        if obj.created_by:
            full_name = obj.created_by.get_full_name()
            if full_name and full_name.strip():
                return full_name
            return obj.created_by.username
        return 'Unknown'


class FormDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for form with all fields."""
    department_name = serializers.CharField(source='department.name', read_only=True)
    created_by_name = serializers.SerializerMethodField()
    fields = FormFieldSerializer(many=True, read_only=True)
    submission_count = serializers.IntegerField(source='submissions.count', read_only=True)

    class Meta:
        model = Form
        fields = [
            'id', 'name', 'code', 'description', 'status',
            'department', 'department_name', 'created_by', 'created_by_name',
            'version', 'is_template', 'requires_approval', 'ai_generated',
            'ai_prompt', 'config', 'fields', 'submission_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def get_created_by_name(self, obj):
        """Get creator's name with fallback to username."""
        if obj.created_by:
            full_name = obj.created_by.get_full_name()
            if full_name and full_name.strip():
                return full_name
            return obj.created_by.username
        return 'Unknown'

    def create(self, validated_data):
        """Create form with current user as creator."""
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class FormSubmissionListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for submission lists."""
    form_detail = serializers.SerializerMethodField()
    submitted_by_detail = serializers.SerializerMethodField()

    class Meta:
        model = FormSubmission
        fields = [
            'id', 'submission_number', 'form', 'form_detail',
            'submitted_by', 'submitted_by_detail', 'status', 'data',
            'created_at', 'submitted_at', 'updated_at'
        ]
        read_only_fields = ['id', 'submission_number', 'created_at', 'updated_at']

    def get_form_detail(self, obj):
        if obj.form:
            return {
                'id': str(obj.form.id),
                'name': obj.form.name,
                'code': obj.form.code,
                'department_name': obj.form.department.name if obj.form.department else None
            }
        return None

    def get_submitted_by_detail(self, obj):
        if obj.submitted_by:
            return {
                'id': str(obj.submitted_by.id),
                'username': obj.submitted_by.username,
                'email': obj.submitted_by.email,
                'full_name': f"{obj.submitted_by.first_name} {obj.submitted_by.last_name}".strip()
            }
        return None


class FormSubmissionDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for form submission."""
    form_detail = serializers.SerializerMethodField()
    submitted_by_detail = serializers.SerializerMethodField()
    files = serializers.SerializerMethodField()

    class Meta:
        model = FormSubmission
        fields = [
            'id', 'submission_number', 'form', 'form_detail',
            'submitted_by', 'submitted_by_detail', 'status', 'data',
            'ip_address', 'user_agent', 'created_at', 'submitted_at', 'updated_at',
            'files'
        ]
        read_only_fields = [
            'id', 'submission_number', 'submitted_by',
            'ip_address', 'user_agent', 'created_at', 'updated_at'
        ]

    def get_form_detail(self, obj):
        if obj.form:
            return {
                'id': str(obj.form.id),
                'name': obj.form.name,
                'code': obj.form.code,
                'department_name': obj.form.department.name if obj.form.department else None
            }
        return None

    def get_submitted_by_detail(self, obj):
        if obj.submitted_by:
            return {
                'id': str(obj.submitted_by.id),
                'username': obj.submitted_by.username,
                'email': obj.submitted_by.email,
                'full_name': f"{obj.submitted_by.first_name} {obj.submitted_by.last_name}".strip()
            }
        return None

    def get_files(self, obj):
        # Get associated files for this submission
        files = obj.files.all()
        return [{
            'id': str(file.id),
            'file_name': file.file_name,
            'file': file.file.url if file.file else None,
            'uploaded_at': file.uploaded_at
        } for file in files]

    def create(self, validated_data):
        """Create submission with current user as submitter."""
        validated_data['submitted_by'] = self.context['request'].user

        # Capture IP and user agent from request
        request = self.context['request']
        validated_data['ip_address'] = self.get_client_ip(request)
        validated_data['user_agent'] = request.META.get('HTTP_USER_AGENT', '')

        # Set submitted_at if status is SUBMITTED
        if validated_data.get('status') == FormSubmission.SubmissionStatus.SUBMITTED:
            validated_data['submitted_at'] = timezone.now()

        return super().create(validated_data)

    def update(self, instance, validated_data):
        """Update submission and set submitted_at if changing to SUBMITTED."""
        old_status = instance.status
        new_status = validated_data.get('status', old_status)

        if old_status != FormSubmission.SubmissionStatus.SUBMITTED and \
           new_status == FormSubmission.SubmissionStatus.SUBMITTED:
            validated_data['submitted_at'] = timezone.now()

        return super().update(instance, validated_data)

    def get_client_ip(self, request):
        """Get client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class FormFileSerializer(serializers.ModelSerializer):
    """Serializer for form files."""

    class Meta:
        model = FormFile
        fields = [
            'id', 'submission', 'field', 'file',
            'original_name', 'file_size', 'mime_type', 'uploaded_at'
        ]
        read_only_fields = ['id', 'uploaded_at']