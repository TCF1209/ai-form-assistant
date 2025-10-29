"""
URL configuration for workflow endpoints.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'workflows'

# Create a router for ViewSets
router = DefaultRouter()
router.register(r'workflows', views.WorkflowViewSet, basename='workflow')
router.register(r'workflow-steps', views.WorkflowStepViewSet, basename='workflow-step')
router.register(r'workflow-instances', views.WorkflowInstanceViewSet, basename='workflow-instance')
router.register(r'workflow-approvals', views.WorkflowApprovalViewSet, basename='workflow-approval')
router.register(r'workflow-notifications', views.WorkflowNotificationViewSet, basename='workflow-notification')

urlpatterns = [
    path('', include(router.urls)),
]