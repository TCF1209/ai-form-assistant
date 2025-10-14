"""
Custom permissions for the users app.
"""

from rest_framework import permissions


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object to edit it.
    Read permissions are allowed to any authenticated user.
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed for any authenticated user
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions are only allowed to the owner of the object
        # Check if obj has a user attribute or if obj is a User instance
        if hasattr(obj, 'user'):
            return obj.user == request.user

        # If obj is a User instance itself
        return obj == request.user


class IsAdmin(permissions.BasePermission):
    """
    Permission to only allow admin users to access the view.
    """

    def has_permission(self, request, view):
        # Check if user is authenticated and is an admin
        return (
            request.user and
            request.user.is_authenticated and
            request.user.is_admin
        )

    def has_object_permission(self, request, view, obj):
        # Same check for object-level permissions
        return (
            request.user and
            request.user.is_authenticated and
            request.user.is_admin
        )


class IsManager(permissions.BasePermission):
    """
    Permission to only allow manager users to access the view.
    Admins are also granted access.
    """

    def has_permission(self, request, view):
        # Check if user is authenticated and is a manager or admin
        return (
            request.user and
            request.user.is_authenticated and
            (request.user.is_manager or request.user.is_admin)
        )

    def has_object_permission(self, request, view, obj):
        # Same check for object-level permissions
        return (
            request.user and
            request.user.is_authenticated and
            (request.user.is_manager or request.user.is_admin)
        )


class IsFormManager(permissions.BasePermission):
    """
    Permission for managers to manage forms in their department.
    Allows managers to create, edit, and delete forms for their department.
    Admins have full access to all forms.
    """

    def has_permission(self, request, view):
        # Check if user is authenticated and is a manager or admin
        return (
            request.user and
            request.user.is_authenticated and
            (request.user.is_manager or request.user.is_admin)
        )

    def has_object_permission(self, request, view, obj):
        # Admins have access to all forms
        if request.user.is_admin:
            return True

        # For managers, check if the form belongs to their department
        if request.user.is_manager:
            # Check if obj has a department attribute
            if hasattr(obj, 'department'):
                return request.user.can_manage_department(obj.department)

            # If obj is a form submission, check the form's department
            if hasattr(obj, 'form') and hasattr(obj.form, 'department'):
                return request.user.can_manage_department(obj.form.department)

        return False


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Permission to allow owners or admins to access the object.
    """

    def has_object_permission(self, request, view, obj):
        # Admins have full access
        if request.user.is_admin:
            return True

        # Check if user is the owner
        if hasattr(obj, 'user'):
            return obj.user == request.user

        # If obj is a User instance itself
        return obj == request.user


class IsOwnerOrManagerOrAdmin(permissions.BasePermission):
    """
    Permission to allow owners, their managers, or admins to access the object.
    Useful for viewing user profiles or submissions within a department.
    """

    def has_object_permission(self, request, view, obj):
        # Admins have full access
        if request.user.is_admin:
            return True

        # Check if user is the owner
        if hasattr(obj, 'user'):
            if obj.user == request.user:
                return True

            # Check if request user is a manager of the object user's department
            if request.user.is_manager and obj.user.department:
                return request.user.can_manage_department(obj.user.department)

        # If obj is a User instance itself
        if obj == request.user:
            return True

        # Check if request user is a manager of the user's department
        if request.user.is_manager and obj.department:
            return request.user.can_manage_department(obj.department)

        return False


class ReadOnly(permissions.BasePermission):
    """
    Permission to only allow read-only access.
    """

    def has_permission(self, request, view):
        return request.method in permissions.SAFE_METHODS

    def has_object_permission(self, request, view, obj):
        return request.method in permissions.SAFE_METHODS


class IsSelfOrAdmin(permissions.BasePermission):
    """
    Permission to allow users to edit their own profile or admins to edit any profile.
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
    """

    def has_object_permission(self, request, view, obj):
        # Admins can manage all departments
        if request.user.is_admin:
            return True

        # Check if the object is a Department
        if hasattr(obj, 'can_manage_department'):
            # obj is a User
            department = getattr(obj, 'department', None)
        else:
            # obj is likely a Department
            department = obj

        if department:
            return request.user.can_manage_department(department)

        return False
