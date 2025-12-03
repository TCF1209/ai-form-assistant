"""
URLs for AI Integration endpoints
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    AIFormGenerationViewSet,
    ConversationalAssistantViewSet,
    NaturalLanguageQueryView,
    RecommendationView,
    WorkflowOptimizationView,
    AIHealthCheckView,
    ChatHistoryViewSet
)

app_name = 'ai_integration'

# Create router for ViewSets
router = DefaultRouter()
router.register(r'form-generation', AIFormGenerationViewSet, basename='form-generation')
router.register(r'assistant', ConversationalAssistantViewSet, basename='assistant')
router.register(r'chat', ChatHistoryViewSet, basename='chat')

# Define URL patterns
urlpatterns = [
    # Include router URLs
    path('', include(router.urls)),

    # API Views
    path('query/', NaturalLanguageQueryView.as_view(), name='nl-query'),
    path('recommendations/', RecommendationView.as_view(), name='recommendations'),
    path('workflow-optimization/', WorkflowOptimizationView.as_view(), name='workflow-optimization'),
    path('health/', AIHealthCheckView.as_view(), name='health-check'),
]