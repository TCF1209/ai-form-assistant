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
    DepartmentSerializer,
    AuditLogSerializer
)
from django_filters.rest_framework import DjangoFilterBackend
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


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for AuditLog model.
    Provides read-only access to audit logs for admins only.
    """
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['action', 'model_name', 'user']
    search_fields = ['object_repr', 'user__email', 'user__first_name', 'user__last_name', 'model_name']
    ordering_fields = ['timestamp', 'action', 'model_name']
    ordering = ['-timestamp']

    def get_queryset(self):
        """
        Filter audit logs with select_related for optimization.
        Excludes LOGIN/LOGOUT by default unless include_security=true.
        """
        queryset = super().get_queryset().select_related('user')

        # Exclude security logs (LOGIN/LOGOUT) by default
        include_security = self.request.query_params.get('include_security', 'false').lower() == 'true'
        action_filter = self.request.query_params.get('action')

        # Only exclude if not explicitly filtering by action and not including security
        if not include_security and not action_filter:
            queryset = queryset.exclude(action__in=['LOGIN', 'LOGOUT'])

        # Date range filtering
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')

        if start_date:
            queryset = queryset.filter(timestamp__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(timestamp__date__lte=end_date)

        return queryset

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Get audit log statistics.
        GET /api/v1/audit-logs/stats/
        """
        from django.db.models import Count
        from django.db.models.functions import TruncDate

        queryset = self.get_queryset()

        # Action breakdown
        action_stats = queryset.values('action').annotate(count=Count('id'))

        # Model breakdown
        model_stats = queryset.values('model_name').annotate(count=Count('id')).order_by('-count')[:10]

        # Daily activity (last 30 days)
        from datetime import timedelta
        thirty_days_ago = timezone.now() - timedelta(days=30)
        daily_stats = queryset.filter(timestamp__gte=thirty_days_ago).annotate(
            date=TruncDate('timestamp')
        ).values('date').annotate(count=Count('id')).order_by('date')

        # Most active users
        user_stats = queryset.values(
            'user__email', 'user__first_name', 'user__last_name'
        ).annotate(count=Count('id')).order_by('-count')[:10]

        return Response({
            'total_logs': queryset.count(),
            'action_breakdown': {item['action']: item['count'] for item in action_stats},
            'model_breakdown': list(model_stats),
            'daily_activity': [
                {'date': item['date'].strftime('%Y-%m-%d') if item['date'] else None, 'count': item['count']}
                for item in daily_stats
            ],
            'most_active_users': list(user_stats)
        })

    @action(detail=False, methods=['get'])
    def actions(self, request):
        """
        Get list of available action types.
        GET /api/v1/audit-logs/actions/
        """
        actions = [
            {'value': choice[0], 'label': choice[1]}
            for choice in AuditLog.ActionType.choices
        ]
        return Response(actions)

    @action(detail=False, methods=['get'])
    def models(self, request):
        """
        Get list of models that have been logged.
        GET /api/v1/audit-logs/models/
        """
        models = self.get_queryset().values_list('model_name', flat=True).distinct()
        return Response(list(models))

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def log_export(self, request):
        """
        Log an export action.
        POST /api/v1/audit-logs/log_export/
        """
        export_type = request.data.get('export_type', 'unknown')  # 'excel' or 'pdf'
        report_name = request.data.get('report_name', 'Report')

        # Get client IP
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')

        AuditLog.objects.create(
            user=request.user,
            action=AuditLog.ActionType.EXPORT,
            model_name='Report',
            object_id='',
            object_repr=f'{report_name} ({export_type.upper()})',
            changes={'export_type': export_type, 'report_name': report_name},
            ip_address=ip,
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )

        return Response({'message': 'Export logged successfully'})
