"""
Serializers for AI Integration endpoints
"""
from rest_framework import serializers
from forms.models import Form, FormField


class FormGenerationRequestSerializer(serializers.Serializer):
    """Serializer for form generation request"""
    description = serializers.CharField(
        help_text="Natural language description of the form to generate",
        min_length=10,
        max_length=2000
    )
    department = serializers.CharField(
        required=False,
        help_text="Department context for form generation"
    )


class FormGenerationResponseSerializer(serializers.Serializer):
    """Serializer for form generation response"""
    success = serializers.BooleanField()
    form_data = serializers.DictField(required=False)
    ai_confidence = serializers.FloatField(required=False)
    error = serializers.CharField(required=False)


class ConversationStartRequestSerializer(serializers.Serializer):
    """Serializer for starting a conversation session"""
    form_id = serializers.UUIDField(help_text="ID of the form to fill")


class ConversationMessageSerializer(serializers.Serializer):
    """Serializer for conversation messages"""
    session_id = serializers.CharField(help_text="Conversation session ID")
    message = serializers.CharField(help_text="User's message", max_length=1000)


class ConversationResponseSerializer(serializers.Serializer):
    """Serializer for conversation responses"""
    message = serializers.CharField(help_text="AI assistant's response")
    filled_fields = serializers.DictField(
        help_text="Fields extracted from conversation",
        required=False
    )
    progress = serializers.FloatField(
        help_text="Form completion progress (0-1)",
        required=False
    )
    is_complete = serializers.BooleanField(
        help_text="Whether all required fields are filled",
        required=False
    )
    next_field = serializers.CharField(
        help_text="Next field to ask about",
        required=False,
        allow_null=True
    )
    confidence = serializers.FloatField(
        help_text="AI confidence score (0-1)",
        required=False
    )
    error = serializers.CharField(required=False)
    session_id = serializers.CharField(required=False)


class ConversationMessageItemSerializer(serializers.Serializer):
    """Serializer for a single conversation message in history"""
    role = serializers.ChoiceField(choices=['user', 'assistant'])
    content = serializers.CharField(max_length=2000, allow_blank=True, default='')


class NLQueryRequestSerializer(serializers.Serializer):
    """Serializer for natural language query requests"""
    query = serializers.CharField(
        help_text="Natural language analytics query",
        min_length=1,  # Allow short queries - AI will handle gibberish detection
        max_length=500
    )
    context = serializers.DictField(
        help_text="Additional context for the query",
        required=False
    )
    conversation_history = ConversationMessageItemSerializer(
        many=True,
        required=False,
        help_text="Recent conversation history for context"
    )


class NLQueryResponseSerializer(serializers.Serializer):
    """Serializer for natural language query responses"""
    interpretation = serializers.CharField(
        help_text="What the query means"
    )
    filters = serializers.DictField(
        help_text="Extracted filters from query"
    )
    aggregation = serializers.CharField(
        required=False,
        help_text="Type of aggregation (count, sum, average, etc.)"
    )
    visualization = serializers.CharField(
        required=False,
        help_text="Suggested visualization type"
    )
    data = serializers.ListField(
        required=False,
        help_text="Query results"
    )
    summary = serializers.CharField(
        required=False,
        help_text="Human-readable summary of the results"
    )
    error = serializers.CharField(required=False)
    query_metadata = serializers.DictField(
        required=False,
        help_text="Query transparency metadata (what AI understood)"
    )


class RecommendationRequestSerializer(serializers.Serializer):
    """Serializer for recommendation requests"""
    user_context = serializers.DictField(
        help_text="User context and history",
        required=False
    )
    recommendation_type = serializers.ChoiceField(
        choices=['forms', 'workflows', 'actions', 'all'],
        default='all',
        help_text="Type of recommendations to generate"
    )


class RecommendationSerializer(serializers.Serializer):
    """Serializer for individual recommendations"""
    type = serializers.CharField(help_text="Recommendation type")
    title = serializers.CharField(help_text="Recommendation title")
    description = serializers.CharField(help_text="Why this is recommended")
    priority = serializers.ChoiceField(choices=['high', 'medium', 'low'])
    action = serializers.CharField(
        help_text="Specific action to take",
        required=False
    )
    metadata = serializers.DictField(required=False)


class WorkflowOptimizationRequestSerializer(serializers.Serializer):
    """Serializer for workflow optimization requests"""
    workflow_id = serializers.UUIDField(
        help_text="ID of the workflow to optimize"
    )
    include_metrics = serializers.BooleanField(
        default=True,
        help_text="Include performance metrics in analysis"
    )


class WorkflowOptimizationResponseSerializer(serializers.Serializer):
    """Serializer for workflow optimization responses"""
    bottlenecks = serializers.ListField(
        child=serializers.CharField(),
        help_text="Identified bottlenecks"
    )
    suggestions = serializers.ListField(
        help_text="Optimization suggestions"
    )
    estimated_improvement = serializers.CharField(
        help_text="Estimated improvement from optimizations",
        required=False
    )
    error = serializers.CharField(required=False)


class AIHealthCheckSerializer(serializers.Serializer):
    """Serializer for AI service health check"""
    status = serializers.CharField()
    openai_configured = serializers.BooleanField()
    model = serializers.CharField(required=False)
    cache_enabled = serializers.BooleanField()
    error = serializers.CharField(required=False)


# ============================================
# Chat History Serializers
# ============================================

class ChatMessageSerializer(serializers.Serializer):
    """Serializer for individual chat messages"""
    id = serializers.UUIDField(read_only=True)
    message_type = serializers.ChoiceField(choices=['USER', 'ASSISTANT', 'SYSTEM'])
    content = serializers.CharField()
    metadata = serializers.DictField(required=False, default=dict)
    created_at = serializers.DateTimeField(read_only=True)


class ChatSessionSerializer(serializers.Serializer):
    """Serializer for chat sessions"""
    id = serializers.UUIDField(read_only=True)
    title = serializers.CharField(required=False, allow_blank=True)
    is_active = serializers.BooleanField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    messages = ChatMessageSerializer(many=True, read_only=True)
    message_count = serializers.SerializerMethodField()

    def get_message_count(self, obj):
        return obj.messages.count() if hasattr(obj, 'messages') else 0


class ChatMessageCreateSerializer(serializers.Serializer):
    """Serializer for creating a new chat message"""
    message_type = serializers.ChoiceField(
        choices=['USER', 'ASSISTANT', 'SYSTEM'],
        default='USER'
    )
    content = serializers.CharField(max_length=5000)
    metadata = serializers.DictField(required=False, default=dict)


# ============================================
# Analytics Query History Serializers
# ============================================

class AnalyticsMessageSerializer(serializers.Serializer):
    """Serializer for individual analytics messages"""
    id = serializers.UUIDField(read_only=True)
    message_type = serializers.ChoiceField(choices=['USER', 'ASSISTANT', 'SYSTEM'])
    content = serializers.CharField()
    metadata = serializers.DictField(required=False, default=dict)
    created_at = serializers.DateTimeField(read_only=True)


class AnalyticsSessionSerializer(serializers.Serializer):
    """Serializer for analytics sessions"""
    id = serializers.UUIDField(read_only=True)
    title = serializers.CharField(required=False, allow_blank=True)
    is_active = serializers.BooleanField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    messages = AnalyticsMessageSerializer(many=True, read_only=True)
    message_count = serializers.SerializerMethodField()

    def get_message_count(self, obj):
        return obj.messages.count() if hasattr(obj, 'messages') else 0


class AnalyticsMessageCreateSerializer(serializers.Serializer):
    """Serializer for creating a new analytics message"""
    message_type = serializers.ChoiceField(
        choices=['USER', 'ASSISTANT', 'SYSTEM'],
        default='USER'
    )
    content = serializers.CharField(max_length=5000)
    metadata = serializers.DictField(required=False, default=dict)