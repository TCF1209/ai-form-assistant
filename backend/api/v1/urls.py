"""
URL configuration for API v1.
"""

from django.urls import path, include
from rest_framework_simplejwt.views import TokenVerifyView

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

app_name = 'api_v1'

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

    # Additional app endpoints will be added here
    # path('forms/', include('forms.urls')),
    # path('workflows/', include('workflows.urls')),
    # path('analytics/', include('analytics.urls')),
]
