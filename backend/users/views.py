"""
Views for the users app.
Includes ViewSets for User and Department models.
"""

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.utils import timezone

from .models import User, Department, AuditLog
from .serializers import (
    UserSerializer,
    UserRegistrationSerializer,
    UserProfileSerializer,
    DepartmentSerializer
)
from .permissions import (
    IsAdmin,
    IsManager,
    IsSelfOrAdmin,
    CanManageDepartment
)

User = get_user_model()


class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for User model.
    Provides CRUD operations for users.
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['email', 'first_name', 'last_name', 'username', 'employee_id']
    ordering_fields = ['created_at', 'email', 'first_name', 'last_name']
    ordering = ['-created_at']

    def get_permissions(self):
        """
        Set permissions based on action.
        """
        if self.action == 'create':
            # Only admins can create users via this endpoint
            permission_classes = [IsAdmin]
        elif self.action in ['update', 'partial_update', 'destroy']:
            # Only admins can modify users
            permission_classes = [IsAdmin]
        elif self.action == 'me':
            # Any authenticated user can access their own profile
            permission_classes = [IsAuthenticated]
        else:
            # List and retrieve require authentication
            permission_classes = [IsAuthenticated]

        return [permission() for permission in permission_classes]

    def get_queryset(self):
        """
        Filter queryset based on user role.
        Admins see all users, managers see their department users, regular users see only themselves.
        """
        user = self.request.user

        if user.is_admin:
            # Admins can see all users
            return User.objects.all()
        elif user.is_manager and user.department:
            # Managers can see users in their department
            return User.objects.filter(department=user.department)
        else:
            # Regular users can only see themselves
            return User.objects.filter(id=user.id)

    @action(detail=False, methods=['get'])
    def me(self, request):
        """
        Get current user's profile.
        GET /api/v1/users/me/
        """
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """
        Activate a user account.
        POST /api/v1/users/{id}/activate/
        """
        user = self.get_object()
        user.is_active = True
        user.save()

        # Log the action
        AuditLog.objects.create(
            user=request.user,
            action=AuditLog.ActionType.UPDATE,
            model_name='User',
            object_id=str(user.id),
            object_repr=str(user),
            changes={'is_active': True},
            ip_address=self.get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )

        return Response({
            'message': 'User activated successfully',
            'user': UserSerializer(user).data
        })

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """
        Deactivate a user account.
        POST /api/v1/users/{id}/deactivate/
        """
        user = self.get_object()
        user.is_active = False
        user.save()

        # Log the action
        AuditLog.objects.create(
            user=request.user,
            action=AuditLog.ActionType.UPDATE,
            model_name='User',
            object_id=str(user.id),
            object_repr=str(user),
            changes={'is_active': False},
            ip_address=self.get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )

        return Response({
            'message': 'User deactivated successfully',
            'user': UserSerializer(user).data
        })

    @action(detail=True, methods=['post'])
    def assign_role(self, request, pk=None):
        """
        Assign role to a user.
        POST /api/v1/users/{id}/assign_role/
        """
        user = self.get_object()
        role = request.data.get('role')

        if role not in [User.UserRole.ADMIN, User.UserRole.MANAGER, User.UserRole.USER]:
            return Response(
                {'error': 'Invalid role. Must be ADMIN, MANAGER, or USER'},
                status=status.HTTP_400_BAD_REQUEST
            )

        old_role = user.role
        user.role = role
        user.save()

        # Log the action
        AuditLog.objects.create(
            user=request.user,
            action=AuditLog.ActionType.UPDATE,
            model_name='User',
            object_id=str(user.id),
            object_repr=str(user),
            changes={'role': {'from': old_role, 'to': role}},
            ip_address=self.get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )

        return Response({
            'message': f'Role updated successfully to {role}',
            'user': UserSerializer(user).data
        })

    @action(detail=True, methods=['post'])
    def assign_department(self, request, pk=None):
        """
        Assign department to a user.
        POST /api/v1/users/{id}/assign_department/
        """
        user = self.get_object()
        department_id = request.data.get('department_id')

        try:
            department = Department.objects.get(id=department_id) if department_id else None
        except Department.DoesNotExist:
            return Response(
                {'error': 'Department not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        old_department = user.department
        user.department = department
        user.save()

        # Log the action
        AuditLog.objects.create(
            user=request.user,
            action=AuditLog.ActionType.UPDATE,
            model_name='User',
            object_id=str(user.id),
            object_repr=str(user),
            changes={'department': {
                'from': str(old_department) if old_department else None,
                'to': str(department) if department else None
            }},
            ip_address=self.get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )

        return Response({
            'message': 'Department updated successfully',
            'user': UserSerializer(user).data
        })

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Get user statistics.
        GET /api/v1/users/stats/
        Only accessible by admins and managers.
        """
        if not (request.user.is_admin or request.user.is_manager):
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        queryset = self.get_queryset()

        stats = {
            'total_users': queryset.count(),
            'active_users': queryset.filter(is_active=True).count(),
            'inactive_users': queryset.filter(is_active=False).count(),
            'admins': queryset.filter(role=User.UserRole.ADMIN).count(),
            'managers': queryset.filter(role=User.UserRole.MANAGER).count(),
            'regular_users': queryset.filter(role=User.UserRole.USER).count(),
        }

        return Response(stats)

    @staticmethod
    def get_client_ip(request):
        """Get client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class DepartmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Department model.
    Provides CRUD operations for departments.
    """
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'code', 'description']
    ordering_fields = ['name', 'code', 'created_at']
    ordering = ['name']

    def get_permissions(self):
        """
        Set permissions based on action.
        Only admins can create, update, or delete departments.
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAdmin]
        else:
            permission_classes = [IsAuthenticated]

        return [permission() for permission in permission_classes]

    def get_queryset(self):
        """
        Filter queryset based on user role.
        Admins see all departments, others see only active departments.
        """
        user = self.request.user

        if user.is_admin:
            return Department.objects.all()
        else:
            return Department.objects.filter(is_active=True)

    @action(detail=True, methods=['get'])
    def users(self, request, pk=None):
        """
        Get all users in a department.
        GET /api/v1/departments/{id}/users/
        """
        department = self.get_object()

        # Check permission
        if not (request.user.is_admin or
                (request.user.is_manager and request.user.department == department)):
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        users = department.users.all()
        serializer = UserSerializer(users, many=True)

        return Response({
            'department': DepartmentSerializer(department).data,
            'users': serializer.data,
            'total': users.count()
        })

    @action(detail=True, methods=['get'])
    def sub_departments(self, request, pk=None):
        """
        Get all sub-departments.
        GET /api/v1/departments/{id}/sub_departments/
        """
        department = self.get_object()
        sub_deps = department.get_all_sub_departments()
        serializer = DepartmentSerializer(sub_deps, many=True)

        return Response({
            'department': DepartmentSerializer(department).data,
            'sub_departments': serializer.data,
            'total': len(sub_deps)
        })

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Get department statistics.
        GET /api/v1/departments/stats/
        Only accessible by admins.
        """
        if not request.user.is_admin:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        queryset = self.get_queryset()

        stats = {
            'total_departments': queryset.count(),
            'active_departments': queryset.filter(is_active=True).count(),
            'inactive_departments': queryset.filter(is_active=False).count(),
        }

        return Response(stats)
