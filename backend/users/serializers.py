"""
Serializers for User and Department models.
"""

from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from .models import User, Department


class DepartmentSerializer(serializers.ModelSerializer):
    """
    Serializer for Department model.
    """
    total_users = serializers.ReadOnlyField()
    active_users = serializers.ReadOnlyField()
    manager_name = serializers.SerializerMethodField()
    parent_name = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = [
            'id', 'name', 'code', 'description', 'parent', 'parent_name',
            'manager', 'manager_name', 'is_active', 'total_users',
            'active_users', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_manager_name(self, obj):
        """Get the manager's full name."""
        return obj.manager.full_name if obj.manager else None

    def get_parent_name(self, obj):
        """Get the parent department's name."""
        return obj.parent.name if obj.parent else None


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for User model - for retrieving user details.
    """
    full_name = serializers.ReadOnlyField()
    department_name = serializers.SerializerMethodField()
    is_admin = serializers.ReadOnlyField()
    is_manager = serializers.ReadOnlyField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'role', 'department', 'department_name', 'phone_number', 'employee_id',
            'profile_picture', 'is_email_verified', 'is_active', 'is_admin',
            'is_manager', 'created_at', 'updated_at', 'last_activity', 'last_login'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'is_email_verified',
            'last_activity', 'last_login'
        ]

    def get_department_name(self, obj):
        """Get the department name."""
        return obj.department.name if obj.department else None


class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration with password validation.
    """
    password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'},
        help_text='Password must be at least 8 characters long.'
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'},
        help_text='Re-enter your password for confirmation.'
    )

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'password', 'password_confirm',
            'first_name', 'last_name', 'phone_number', 'employee_id',
            'department'
        ]
        read_only_fields = ['id']
        extra_kwargs = {
            'email': {'required': True},
            'first_name': {'required': True},
            'last_name': {'required': True},
        }

    def validate_email(self, value):
        """Ensure email is unique."""
        if User.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError(
                "A user with this email already exists."
            )
        return value.lower()

    def validate_username(self, value):
        """Ensure username is unique."""
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError(
                "A user with this username already exists."
            )
        return value

    def validate_employee_id(self, value):
        """Ensure employee ID is unique if provided."""
        if value and User.objects.filter(employee_id=value).exists():
            raise serializers.ValidationError(
                "A user with this employee ID already exists."
            )
        return value

    def validate(self, attrs):
        """Validate that passwords match and meet requirements."""
        password = attrs.get('password')
        password_confirm = attrs.pop('password_confirm', None)

        if password != password_confirm:
            raise serializers.ValidationError({
                'password_confirm': 'Passwords do not match.'
            })

        # Validate password using Django's password validators
        try:
            validate_password(password)
        except ValidationError as e:
            raise serializers.ValidationError({
                'password': list(e.messages)
            })

        return attrs

    def create(self, validated_data):
        """Create a new user with encrypted password."""
        password = validated_data.pop('password')
        user = User.objects.create_user(
            password=password,
            **validated_data
        )
        return user


class LoginSerializer(serializers.Serializer):
    """
    Serializer for user login.
    Accepts email/username and password.
    """
    email_or_username = serializers.CharField(
        required=True,
        help_text='Email address or username'
    )
    password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'}
    )

    def validate(self, attrs):
        """Validate credentials and authenticate user."""
        email_or_username = attrs.get('email_or_username')
        password = attrs.get('password')

        # Try to find user by email or username
        user = None
        if '@' in email_or_username:
            # It's an email
            try:
                user = User.objects.get(email=email_or_username.lower())
                username = user.username
            except User.DoesNotExist:
                raise serializers.ValidationError(
                    'Invalid credentials. Please try again.'
                )
        else:
            # It's a username
            username = email_or_username

        # Authenticate using username and password
        user = authenticate(username=username, password=password)

        if not user:
            raise serializers.ValidationError(
                'Invalid credentials. Please try again.'
            )

        if not user.is_active:
            raise serializers.ValidationError(
                'This account has been deactivated.'
            )

        attrs['user'] = user
        return attrs


class UserProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for updating user profile.
    Users can update their own profile information.
    """
    current_password = serializers.CharField(
        write_only=True,
        required=False,
        style={'input_type': 'password'},
        help_text='Required when changing password'
    )
    new_password = serializers.CharField(
        write_only=True,
        required=False,
        style={'input_type': 'password'},
        help_text='New password (optional)'
    )
    new_password_confirm = serializers.CharField(
        write_only=True,
        required=False,
        style={'input_type': 'password'},
        help_text='Confirm new password'
    )
    department_name = serializers.SerializerMethodField()
    full_name = serializers.ReadOnlyField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'phone_number', 'employee_id', 'profile_picture', 'department',
            'department_name', 'current_password', 'new_password',
            'new_password_confirm', 'updated_at'
        ]
        read_only_fields = ['id', 'username', 'email', 'employee_id', 'updated_at']

    def get_department_name(self, obj):
        """Get the department name."""
        return obj.department.name if obj.department else None

    def validate(self, attrs):
        """Validate password change if new password is provided."""
        new_password = attrs.get('new_password')
        new_password_confirm = attrs.pop('new_password_confirm', None)
        current_password = attrs.pop('current_password', None)

        if new_password:
            # Check if current password is provided
            if not current_password:
                raise serializers.ValidationError({
                    'current_password': 'Current password is required to set a new password.'
                })

            # Verify current password
            user = self.instance
            if not user.check_password(current_password):
                raise serializers.ValidationError({
                    'current_password': 'Current password is incorrect.'
                })

            # Check if passwords match
            if new_password != new_password_confirm:
                raise serializers.ValidationError({
                    'new_password_confirm': 'Passwords do not match.'
                })

            # Validate new password
            try:
                validate_password(new_password, user=user)
            except ValidationError as e:
                raise serializers.ValidationError({
                    'new_password': list(e.messages)
                })

        return attrs

    def update(self, instance, validated_data):
        """Update user profile and optionally change password."""
        new_password = validated_data.pop('new_password', None)

        # Update regular fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # Update password if provided
        if new_password:
            instance.set_password(new_password)

        instance.save()
        return instance


class PasswordResetRequestSerializer(serializers.Serializer):
    """
    Serializer for requesting password reset.
    """
    email = serializers.EmailField(required=True)

    def validate_email(self, value):
        """Check if email exists."""
        try:
            User.objects.get(email=value.lower())
        except User.DoesNotExist:
            # Don't reveal if email exists or not for security
            pass
        return value.lower()


class PasswordResetConfirmSerializer(serializers.Serializer):
    """
    Serializer for confirming password reset with token.
    """
    token = serializers.CharField(required=True)
    new_password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'}
    )
    new_password_confirm = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'}
    )

    def validate(self, attrs):
        """Validate passwords match and meet requirements."""
        new_password = attrs.get('new_password')
        new_password_confirm = attrs.get('new_password_confirm')

        if new_password != new_password_confirm:
            raise serializers.ValidationError({
                'new_password_confirm': 'Passwords do not match.'
            })

        # Validate password using Django's password validators
        try:
            validate_password(new_password)
        except ValidationError as e:
            raise serializers.ValidationError({
                'new_password': list(e.messages)
            })

        return attrs
