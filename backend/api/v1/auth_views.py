"""
Authentication views for API v1.
Handles user registration, login, logout, and profile management.
"""

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings

from users.serializers import (
    UserSerializer,
    UserRegistrationSerializer,
    LoginSerializer,
    UserProfileSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer
)
from users.permissions import IsSelfOrAdmin
from users.models import AuditLog
from core.throttling import LoginRateThrottle

User = get_user_model()


class RegisterView(APIView):
    """
    API endpoint for user registration.
    POST /api/v1/auth/register/
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)

        if serializer.is_valid():
            user = serializer.save()

            # Log the registration
            AuditLog.objects.create(
                user=user,
                action=AuditLog.ActionType.CREATE,
                model_name='User',
                object_id=str(user.id),
                object_repr=str(user),
                ip_address=self.get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )

            # Generate tokens for the new user
            refresh = RefreshToken.for_user(user)

            return Response({
                'message': 'User registered successfully',
                'user': UserSerializer(user).data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }
            }, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @staticmethod
    def get_client_ip(request):
        """Get client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class LoginView(APIView):
    """
    API endpoint for user login.
    POST /api/v1/auth/login/
    """
    permission_classes = [AllowAny]
    throttle_classes = [LoginRateThrottle]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)

        if serializer.is_valid():
            user = serializer.validated_data['user']

            # Update last activity
            user.last_activity = timezone.now()
            user.save(update_fields=['last_activity'])

            # Log the login
            AuditLog.objects.create(
                user=user,
                action=AuditLog.ActionType.LOGIN,
                model_name='User',
                object_id=str(user.id),
                object_repr=str(user),
                ip_address=self.get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )

            # Generate tokens
            refresh = RefreshToken.for_user(user)

            return Response({
                'message': 'Login successful',
                'user': UserSerializer(user).data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }
            }, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @staticmethod
    def get_client_ip(request):
        """Get client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class LogoutView(APIView):
    """
    API endpoint for user logout.
    POST /api/v1/auth/logout/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh_token')

            if not refresh_token:
                return Response(
                    {'error': 'Refresh token is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Blacklist the refresh token
            token = RefreshToken(refresh_token)
            token.blacklist()

            # Log the logout
            AuditLog.objects.create(
                user=request.user,
                action=AuditLog.ActionType.LOGOUT,
                model_name='User',
                object_id=str(request.user.id),
                object_repr=str(request.user),
                ip_address=self.get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )

            return Response(
                {'message': 'Logout successful'},
                status=status.HTTP_200_OK
            )

        except TokenError:
            return Response(
                {'error': 'Invalid token'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @staticmethod
    def get_client_ip(request):
        """Get client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class UserProfileView(APIView):
    """
    API endpoint for viewing and updating user profile.
    GET /api/v1/auth/profile/ - Get current user profile
    PUT /api/v1/auth/profile/ - Update current user profile
    PATCH /api/v1/auth/profile/ - Partially update current user profile
    """
    permission_classes = [IsAuthenticated, IsSelfOrAdmin]

    def get(self, request):
        """Get current user profile."""
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request):
        """Update current user profile."""
        serializer = UserProfileSerializer(
            request.user,
            data=request.data,
            partial=False
        )

        if serializer.is_valid():
            user = serializer.save()

            # Log the update
            AuditLog.objects.create(
                user=request.user,
                action=AuditLog.ActionType.UPDATE,
                model_name='User',
                object_id=str(user.id),
                object_repr=str(user),
                changes=request.data,
                ip_address=self.get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )

            return Response({
                'message': 'Profile updated successfully',
                'user': UserSerializer(user).data
            }, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request):
        """Partially update current user profile."""
        serializer = UserProfileSerializer(
            request.user,
            data=request.data,
            partial=True
        )

        if serializer.is_valid():
            user = serializer.save()

            # Log the update
            AuditLog.objects.create(
                user=request.user,
                action=AuditLog.ActionType.UPDATE,
                model_name='User',
                object_id=str(user.id),
                object_repr=str(user),
                changes=request.data,
                ip_address=self.get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )

            return Response({
                'message': 'Profile updated successfully',
                'user': UserSerializer(user).data
            }, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @staticmethod
    def get_client_ip(request):
        """Get client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class PasswordResetRequestView(APIView):
    """
    API endpoint for requesting password reset.
    POST /api/v1/auth/password-reset/
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)

        if serializer.is_valid():
            email = serializer.validated_data['email']

            try:
                user = User.objects.get(email=email)

                # Generate password reset token
                refresh = RefreshToken.for_user(user)
                reset_token = str(refresh.access_token)

                # Send password reset email
                reset_url = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"

                send_mail(
                    subject='Password Reset Request',
                    message=f'Click the link below to reset your password:\n\n{reset_url}\n\nThis link will expire in 60 minutes.',
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False,
                )

                # Log the password reset request
                AuditLog.objects.create(
                    user=user,
                    action=AuditLog.ActionType.UPDATE,
                    model_name='User',
                    object_id=str(user.id),
                    object_repr=str(user),
                    changes={'action': 'password_reset_requested'},
                    ip_address=self.get_client_ip(request),
                    user_agent=request.META.get('HTTP_USER_AGENT', '')
                )

            except User.DoesNotExist:
                # Don't reveal if email exists or not for security
                pass

            return Response({
                'message': 'If an account with that email exists, a password reset link has been sent.'
            }, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @staticmethod
    def get_client_ip(request):
        """Get client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class PasswordResetConfirmView(APIView):
    """
    API endpoint for confirming password reset with token.
    POST /api/v1/auth/password-reset/confirm/
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)

        if serializer.is_valid():
            token = serializer.validated_data['token']
            new_password = serializer.validated_data['new_password']

            try:
                # Verify token and get user
                from rest_framework_simplejwt.tokens import AccessToken
                access_token = AccessToken(token)
                user_id = access_token['user_id']
                user = User.objects.get(id=user_id)

                # Update password
                user.set_password(new_password)
                user.save()

                # Log the password reset
                AuditLog.objects.create(
                    user=user,
                    action=AuditLog.ActionType.UPDATE,
                    model_name='User',
                    object_id=str(user.id),
                    object_repr=str(user),
                    changes={'action': 'password_reset_confirmed'},
                    ip_address=self.get_client_ip(request),
                    user_agent=request.META.get('HTTP_USER_AGENT', '')
                )

                return Response({
                    'message': 'Password has been reset successfully'
                }, status=status.HTTP_200_OK)

            except (TokenError, InvalidToken, User.DoesNotExist):
                return Response(
                    {'error': 'Invalid or expired token'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @staticmethod
    def get_client_ip(request):
        """Get client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class TokenRefreshView(TokenRefreshView):
    """
    API endpoint for refreshing JWT access token.
    POST /api/v1/auth/token/refresh/
    """
    pass


class UserDetailView(APIView):
    """
    API endpoint for viewing specific user details.
    GET /api/v1/auth/users/{id}/ - Get user details
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        """Get user details by ID."""
        try:
            user = User.objects.get(id=user_id)

            # Check if user has permission to view this profile
            # Users can view their own profile, managers can view their department users, admins can view all
            if not (
                request.user == user or
                request.user.is_admin or
                (request.user.is_manager and user.department == request.user.department)
            ):
                return Response(
                    {'error': 'You do not have permission to view this profile'},
                    status=status.HTTP_403_FORBIDDEN
                )

            serializer = UserSerializer(user)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )
