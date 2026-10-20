"""
Unit tests for Users app.
Tests authentication, permissions, and user management.
"""

from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User, Department, AuditLog


class AuthenticationTests(APITestCase):
    """Test authentication endpoints (login, register, logout, token refresh)."""

    def setUp(self):
        """Set up test data."""
        self.client = APIClient()

        # Create a department
        self.department = Department.objects.create(
            name='Test Department',
            code='TEST',
            description='Test department for unit tests'
        )

        # Create test user
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='TestPass123!',
            first_name='Test',
            last_name='User',
            role='USER',
            department=self.department
        )

    def test_user_registration_success(self):
        """Test successful user registration."""
        url = '/api/v1/auth/register/'
        data = {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'NewPass123!',
            'password_confirm': 'NewPass123!',
            'first_name': 'New',
            'last_name': 'User'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('tokens', response.data)
        self.assertIn('access', response.data['tokens'])
        self.assertIn('refresh', response.data['tokens'])

    def test_user_registration_password_mismatch(self):
        """Test registration fails with mismatched passwords."""
        url = '/api/v1/auth/register/'
        data = {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'NewPass123!',
            'password_confirm': 'DifferentPass123!',
            'first_name': 'New',
            'last_name': 'User'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_user_registration_duplicate_email(self):
        """Test registration fails with existing email."""
        url = '/api/v1/auth/register/'
        data = {
            'username': 'anotheruser',
            'email': 'test@example.com',  # Already exists
            'password': 'NewPass123!',
            'password_confirm': 'NewPass123!',
            'first_name': 'Another',
            'last_name': 'User'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_user_login_success(self):
        """Test successful user login."""
        url = '/api/v1/auth/login/'
        data = {
            'email_or_username': 'test@example.com',
            'password': 'TestPass123!'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('tokens', response.data)
        self.assertIn('user', response.data)

    def test_user_login_wrong_password(self):
        """Test login fails with wrong password."""
        url = '/api/v1/auth/login/'
        data = {
            'email_or_username': 'test@example.com',
            'password': 'WrongPassword123!'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_user_login_nonexistent_user(self):
        """Test login fails with non-existent user."""
        url = '/api/v1/auth/login/'
        data = {
            'email_or_username': 'nonexistent@example.com',
            'password': 'TestPass123!'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_user_logout_success(self):
        """Test successful user logout."""
        # First login to get tokens
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

        url = '/api/v1/auth/logout/'
        data = {'refresh_token': str(refresh)}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_token_refresh_success(self):
        """Test successful token refresh."""
        refresh = RefreshToken.for_user(self.user)

        url = '/api/v1/auth/token/refresh/'
        data = {'refresh': str(refresh)}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)

    def test_get_profile_authenticated(self):
        """Test getting profile when authenticated."""
        self.client.force_authenticate(user=self.user)

        url = '/api/v1/auth/profile/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'test@example.com')

    def test_get_profile_unauthenticated(self):
        """Test getting profile when not authenticated."""
        url = '/api/v1/auth/profile/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class PermissionTests(APITestCase):
    """Test role-based permissions."""

    def setUp(self):
        """Set up test data with different user roles."""
        self.client = APIClient()

        # Create departments
        self.dept1 = Department.objects.create(
            name='Department 1',
            code='DEPT1'
        )
        self.dept2 = Department.objects.create(
            name='Department 2',
            code='DEPT2'
        )

        # Create users with different roles
        self.admin = User.objects.create_user(
            username='admin',
            email='admin@example.com',
            password='AdminPass123!',
            role='ADMIN',
            department=self.dept1
        )

        self.manager = User.objects.create_user(
            username='manager',
            email='manager@example.com',
            password='ManagerPass123!',
            role='MANAGER',
            department=self.dept1
        )

        self.user = User.objects.create_user(
            username='user',
            email='user@example.com',
            password='UserPass123!',
            role='USER',
            department=self.dept1
        )

    def test_admin_can_access_audit_logs(self):
        """Test admin can access audit logs."""
        self.client.force_authenticate(user=self.admin)

        url = '/api/v1/audit-logs/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_manager_cannot_access_audit_logs(self):
        """Test manager cannot access audit logs."""
        self.client.force_authenticate(user=self.manager)

        url = '/api/v1/audit-logs/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_user_cannot_access_audit_logs(self):
        """Test regular user cannot access audit logs."""
        self.client.force_authenticate(user=self.user)

        url = '/api/v1/audit-logs/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_view_all_users(self):
        """Test admin can view all users."""
        self.client.force_authenticate(user=self.admin)

        url = '/api/v1/users/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Admin should see all users
        self.assertGreaterEqual(len(response.data), 3)

    def test_manager_can_view_department_users(self):
        """Test manager can view users in their department."""
        self.client.force_authenticate(user=self.manager)

        url = '/api/v1/users/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_user_can_view_users_list(self):
        """Test regular user can access users list."""
        self.client.force_authenticate(user=self.user)

        url = '/api/v1/users/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # User should be able to access the endpoint (paginated response)
        self.assertIn('results', response.data)


class DepartmentTests(APITestCase):
    """Test department CRUD operations."""

    def setUp(self):
        """Set up test data."""
        self.client = APIClient()

        self.department = Department.objects.create(
            name='Test Department',
            code='TEST'
        )

        self.admin = User.objects.create_user(
            username='admin',
            email='admin@example.com',
            password='AdminPass123!',
            role='ADMIN'
        )

        self.user = User.objects.create_user(
            username='user',
            email='user@example.com',
            password='UserPass123!',
            role='USER'
        )

    def test_list_departments(self):
        """Test listing departments."""
        self.client.force_authenticate(user=self.admin)

        url = '/api/v1/departments/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_department_as_admin(self):
        """Test admin can create department."""
        self.client.force_authenticate(user=self.admin)

        url = '/api/v1/departments/'
        data = {
            'name': 'New Department',
            'code': 'NEW',
            'description': 'A new department'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_department_as_user_forbidden(self):
        """Test regular user cannot create department."""
        self.client.force_authenticate(user=self.user)

        url = '/api/v1/departments/'
        data = {
            'name': 'New Department',
            'code': 'NEW'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class AuditLogTests(APITestCase):
    """Test audit log functionality."""

    def setUp(self):
        """Set up test data."""
        self.client = APIClient()

        self.admin = User.objects.create_user(
            username='admin',
            email='admin@example.com',
            password='AdminPass123!',
            role='ADMIN'
        )

        # Create some audit log entries
        AuditLog.objects.create(
            user=self.admin,
            action=AuditLog.ActionType.CREATE,
            model_name='Form',
            object_id='test-id',
            object_repr='Test Form'
        )
        AuditLog.objects.create(
            user=self.admin,
            action=AuditLog.ActionType.LOGIN,
            model_name='User',
            object_id=str(self.admin.id),
            object_repr=str(self.admin)
        )

    def test_audit_log_list(self):
        """Test listing audit logs."""
        self.client.force_authenticate(user=self.admin)

        url = '/api/v1/audit-logs/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_audit_log_excludes_security_by_default(self):
        """Test audit logs exclude LOGIN/LOGOUT by default."""
        self.client.force_authenticate(user=self.admin)

        url = '/api/v1/audit-logs/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Check that LOGIN actions are excluded
        for log in response.data.get('results', response.data):
            self.assertNotIn(log['action'], ['LOGIN', 'LOGOUT'])

    def test_audit_log_security_only(self):
        """Test audit logs can show only security logs."""
        self.client.force_authenticate(user=self.admin)

        url = '/api/v1/audit-logs/?security_only=true'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Check that only LOGIN/LOGOUT actions are shown
        for log in response.data.get('results', response.data):
            self.assertIn(log['action'], ['LOGIN', 'LOGOUT'])

    def test_audit_log_stats(self):
        """Test audit log statistics endpoint."""
        self.client.force_authenticate(user=self.admin)

        url = '/api/v1/audit-logs/stats/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_logs', response.data)
        self.assertIn('action_breakdown', response.data)

    def test_log_export_endpoint(self):
        """Test logging export actions."""
        self.client.force_authenticate(user=self.admin)

        url = '/api/v1/audit-logs/log_export/'
        data = {
            'export_type': 'excel',
            'report_name': 'Test Report'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify the log was created
        log = AuditLog.objects.filter(action=AuditLog.ActionType.EXPORT).first()
        self.assertIsNotNone(log)
        self.assertEqual(log.object_repr, 'Test Report (EXCEL)')
