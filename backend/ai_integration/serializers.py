"""
Serializers for AI Integration endpoints
"""
from rest_framework import serializers


class FormGenerationRequestSerializer(serializers.Serializer):
    """Serializer for form generation request"""
    description = serializers.CharField(
        help_text="Natural language description of the form to generate",
        min_length=10,
        max_length=1000  # Aligned with frontend validation
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