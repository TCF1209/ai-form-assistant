"""
URL configuration for API v1.
"""

from django.urls import path, include
from rest_framework_simplejwt.views import TokenVerifyView
from rest_framework.routers import DefaultRouter

from .auth_views import (
    RegisterView,
    LoginView,
    LogoutView,
    UserProfileView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
    TokenRefreshView,
    UserDetailView,
)

# Import ViewSets for user management
from users.views import UserViewSet, DepartmentViewSet

app_name = 'api_v1'

# Create router for user management
router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'departments', DepartmentViewSet, basename='department')

# Authentication URLs
auth_urlpatterns = [
    # User Registration and Authentication
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),

    # JWT Token Management
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('token/verify/', TokenVerifyView.as_view(), name='token_verify'),

    # User Profile
    path('profile/', UserProfileView.as_view(), name='user_profile'),
    path('users/<uuid:user_id>/', UserDetailView.as_view(), name='user_detail'),

    # Password Reset
    path('password-reset/', PasswordResetRequestView.as_view(), name='password_reset_request'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
]

urlpatterns = [
    # Authentication endpoints
    path('auth/', include(auth_urlpatterns)),

    # AI Integration endpoints
    path('ai/', include('ai_integration.urls')),

    # User and Department management endpoints (directly included)
    path('', include(router.urls)),

    # Additional app endpoints will be added here
    # path('forms/', include('forms.urls')),
    # path('workflows/', include('workflows.urls')),
    # path('analytics/', include('analytics.urls')),
]
