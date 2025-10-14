"""
Admin configuration for users app.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _
from .models import User, Department, AuditLog


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """
    Admin interface for User model.
    """
    list_display = ['email', 'username', 'first_name', 'last_name', 'role', 'department', 'is_active', 'created_at']
    list_filter = ['role', 'is_active', 'is_staff', 'department', 'created_at']
    search_fields = ['email', 'username', 'first_name', 'last_name', 'employee_id']
    ordering = ['-created_at']

    fieldsets = (
        (None, {'fields': ('username', 'email', 'password')}),
        (_('Personal info'), {'fields': ('first_name', 'last_name', 'phone_number', 'employee_id', 'profile_picture')}),
        (_('Organization'), {'fields': ('role', 'department')}),
        (_('Permissions'), {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        (_('Important dates'), {'fields': ('last_login', 'date_joined', 'last_activity')}),
        (_('Verification'), {'fields': ('is_email_verified',)}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'password1', 'password2', 'first_name', 'last_name', 'role', 'department'),
        }),
    )

    readonly_fields = ['last_login', 'date_joined', 'created_at', 'updated_at']


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    """
    Admin interface for Department model.
    """
    list_display = ['name', 'code', 'manager', 'parent', 'is_active', 'total_users', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'code', 'description']
    ordering = ['name']

    fieldsets = (
        (None, {'fields': ('name', 'code', 'description')}),
        (_('Hierarchy'), {'fields': ('parent', 'manager')}),
        (_('Status'), {'fields': ('is_active',)}),
        (_('Timestamps'), {'fields': ('created_at', 'updated_at')}),
    )

    readonly_fields = ['created_at', 'updated_at']


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    """
    Admin interface for AuditLog model.
    """
    list_display = ['user', 'action', 'model_name', 'object_repr', 'timestamp', 'ip_address']
    list_filter = ['action', 'model_name', 'timestamp']
    search_fields = ['user__email', 'user__username', 'object_repr', 'ip_address']
    ordering = ['-timestamp']
    readonly_fields = ['user', 'action', 'model_name', 'object_id', 'object_repr', 'changes', 'ip_address', 'user_agent', 'timestamp']

    fieldsets = (
        (None, {'fields': ('user', 'action', 'model_name')}),
        (_('Object Information'), {'fields': ('object_id', 'object_repr', 'changes')}),
        (_('Request Information'), {'fields': ('ip_address', 'user_agent', 'timestamp')}),
    )

    def has_add_permission(self, request):
        """Prevent manual creation of audit logs."""
        return False

    def has_change_permission(self, request, obj=None):
        """Prevent modification of audit logs."""
        return False

    def has_delete_permission(self, request, obj=None):
        """Prevent deletion of audit logs (admin only)."""
        return request.user.is_superuser
