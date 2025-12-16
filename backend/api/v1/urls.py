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

# Import ViewSets for forms and workflows
from forms.views import FormViewSet, FormSubmissionViewSet
from workflows.views import WorkflowViewSet, WorkflowStepViewSet, WorkflowInstanceViewSet, WorkflowApprovalViewSet, WorkflowNotificationViewSet

# Create router for all API endpoints
router = DefaultRouter()

# User management
router.register(r'users', UserViewSet, basename='user')
router.register(r'departments', DepartmentViewSet, basename='department')

# Forms management
router.register(r'forms', FormViewSet, basename='form')
router.register(r'submissions', FormSubmissionViewSet, basename='submission')

# Workflow management
router.register(r'workflows', WorkflowViewSet, basename='workflow')
router.register(r'workflow-steps', WorkflowStepViewSet, basename='workflow-step')
router.register(r'workflow-instances', WorkflowInstanceViewSet, basename='workflow-instance')
router.register(r'workflow-approvals', WorkflowApprovalViewSet, basename='workflow-approval')
router.register(r'workflow-notifications', WorkflowNotificationViewSet, basename='workflow-notification')

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

    # All API endpoints (forms, users, departments, workflows, etc.)
    # Note: export/stats endpoints are defined in core/urls.py to avoid routing issues
    path('', include(router.urls)),
]
