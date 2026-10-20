"""
URLs for the AI endpoints, mounted at /api/v1/ai/.
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AIFormGenerationViewSet,
    AIHealthCheckView,
    AnalyticsHistoryViewSet,
    ChatHistoryViewSet,
    ConversationalAssistantViewSet,
    NaturalLanguageQueryView,
)

app_name = 'ai_integration'

router = DefaultRouter()
router.register(r'form-generation', AIFormGenerationViewSet, basename='form-generation')
router.register(r'assistant', ConversationalAssistantViewSet, basename='assistant')
router.register(r'chat', ChatHistoryViewSet, basename='chat')
router.register(r'analytics-history', AnalyticsHistoryViewSet, basename='analytics-history')

urlpatterns = [
    path('', include(router.urls)),
    path('query/', NaturalLanguageQueryView.as_view(), name='nl-query'),
    path('health/', AIHealthCheckView.as_view(), name='health-check'),
]
