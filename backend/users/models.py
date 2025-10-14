"""
User models for the AI-Powered Office Assistant application.
"""

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _
import uuid


class User(AbstractUser):
    """
    Custom User model extending Django's AbstractUser.
    Adds additional fields for our application.
    """

    # User Roles
    class UserRole(models.TextChoices):
        ADMIN = 'ADMIN', _('System Administrator')
        MANAGER = 'MANAGER', _('Form Manager')
        USER = 'USER', _('Regular User')

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(_('email address'), unique=True)
    role = models.CharField(
        max_length=10,
        choices=UserRole.choices,
        default=UserRole.USER,
        help_text=_('User role determining permissions')
    )
    department = models.ForeignKey(
        'Department',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='users'
    )
    phone_number = models.CharField(max_length=20, blank=True)
    employee_id = models.CharField(
        max_length=50,
        unique=True,
        null=True,
        blank=True,
        help_text=_('Employee identification number')
    )
    profile_picture = models.ImageField(
        upload_to='profile_pictures/',
        null=True,
        blank=True
    )
    is_email_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_activity = models.DateTimeField(null=True, blank=True)

    # Override username to use email as the main identifier
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']

    class Meta:
        db_table = 'users'
        verbose_name = _('User')
        verbose_name_plural = _('Users')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['role']),
            models.Index(fields=['department']),
        ]

    def __str__(self):
        return f"{self.get_full_name()} ({self.email})"

    @property
    def full_name(self):
        """Returns the user's full name."""
        return self.get_full_name()

    @property
    def is_admin(self):
        """Check if user is an admin."""
        return self.role == self.UserRole.ADMIN

    @property
    def is_manager(self):
        """Check if user is a manager."""
        return self.role == self.UserRole.MANAGER

    @property
    def is_regular_user(self):
        """Check if user is a regular user."""
        return self.role == self.UserRole.USER

    def can_manage_department(self, department):
        """Check if user can manage a specific department."""
        if self.is_admin:
            return True
        if self.is_manager and self.department == department:
            return True
        return False


class Department(models.Model):
    """
    Department model for organizing users and forms.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(
        max_length=20,
        unique=True,
        help_text=_('Department code/abbreviation')
    )
    description = models.TextField(blank=True)
    parent = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sub_departments'
    )
    manager = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='managed_departments'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'departments'
        verbose_name = _('Department')
        verbose_name_plural = _('Departments')
        ordering = ['name']
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['code']),
        ]

    def __str__(self):
        return f"{self.name} ({self.code})"

    @property
    def total_users(self):
        """Get total number of users in this department."""
        return self.users.count()

    @property
    def active_users(self):
        """Get number of active users in this department."""
        return self.users.filter(is_active=True).count()

    def get_all_sub_departments(self):
        """Get all sub-departments recursively."""
        sub_deps = list(self.sub_departments.all())
        for dep in self.sub_departments.all():
            sub_deps.extend(dep.get_all_sub_departments())
        return sub_deps


class AuditLog(models.Model):
    """
    Model to track all user actions for audit purposes.
    """

    class ActionType(models.TextChoices):
        CREATE = 'CREATE', _('Create')
        UPDATE = 'UPDATE', _('Update')
        DELETE = 'DELETE', _('Delete')
        VIEW = 'VIEW', _('View')
        LOGIN = 'LOGIN', _('Login')
        LOGOUT = 'LOGOUT', _('Logout')
        APPROVE = 'APPROVE', _('Approve')
        REJECT = 'REJECT', _('Reject')
        SUBMIT = 'SUBMIT', _('Submit')
        EXPORT = 'EXPORT', _('Export')

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='audit_logs'
    )
    action = models.CharField(max_length=20, choices=ActionType.choices)
    model_name = models.CharField(max_length=50, blank=True)
    object_id = models.CharField(max_length=100, blank=True)
    object_repr = models.TextField(blank=True)
    changes = models.JSONField(
        default=dict,
        blank=True,
        help_text=_('JSON field storing what was changed')
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'audit_logs'
        verbose_name = _('Audit Log')
        verbose_name_plural = _('Audit Logs')
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['action', '-timestamp']),
            models.Index(fields=['model_name', 'object_id']),
        ]

    def __str__(self):
        return f"{self.user} - {self.action} - {self.timestamp}"
