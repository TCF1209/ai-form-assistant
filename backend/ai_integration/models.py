"""
Models for AI Integration - Chat History Storage
"""
from django.db import models
from django.conf import settings
import uuid


class ChatSession(models.Model):
    """
    Represents a chat session for the Smart Assistant.
    Each user can have one active session at a time.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='chat_sessions'
    )
    title = models.CharField(
        max_length=255,
        blank=True,
        help_text='Auto-generated title based on first message'
    )
    is_active = models.BooleanField(
        default=True,
        help_text='Whether this is the current active session'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'chat_sessions'
        verbose_name = 'Chat Session'
        verbose_name_plural = 'Chat Sessions'
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['user', '-updated_at']),
            models.Index(fields=['user', 'is_active']),
        ]

    def __str__(self):
        return f"Chat Session - {self.user.email} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"

    def save(self, *args, **kwargs):
        # If this session is being set as active, deactivate other sessions for this user
        if self.is_active:
            ChatSession.objects.filter(user=self.user, is_active=True).exclude(pk=self.pk).update(is_active=False)
        super().save(*args, **kwargs)


class ChatMessage(models.Model):
    """
    Individual chat messages within a session.
    """
    class MessageType(models.TextChoices):
        USER = 'USER', 'User Message'
        ASSISTANT = 'ASSISTANT', 'Assistant Message'
        SYSTEM = 'SYSTEM', 'System Message'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(
        ChatSession,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    message_type = models.CharField(
        max_length=10,
        choices=MessageType.choices,
        default=MessageType.USER
    )
    content = models.TextField()
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text='Additional data like form recommendations, confidence scores, etc.'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'chat_messages'
        verbose_name = 'Chat Message'
        verbose_name_plural = 'Chat Messages'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['session', 'created_at']),
        ]

    def __str__(self):
        return f"{self.message_type}: {self.content[:50]}..."


class AnalyticsSession(models.Model):
    """
    Represents a chat session for the Analytics Query feature.
    Each user can have one active session at a time.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='analytics_sessions'
    )
    title = models.CharField(
        max_length=255,
        blank=True,
        help_text='Auto-generated title based on first query'
    )
    is_active = models.BooleanField(
        default=True,
        help_text='Whether this is the current active session'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'analytics_sessions'
        verbose_name = 'Analytics Session'
        verbose_name_plural = 'Analytics Sessions'
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['user', '-updated_at']),
            models.Index(fields=['user', 'is_active']),
        ]

    def __str__(self):
        return f"Analytics Session - {self.user.email} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"

    def save(self, *args, **kwargs):
        # If this session is being set as active, deactivate other sessions for this user
        if self.is_active:
            AnalyticsSession.objects.filter(user=self.user, is_active=True).exclude(pk=self.pk).update(is_active=False)
        super().save(*args, **kwargs)


class AnalyticsMessage(models.Model):
    """
    Individual messages/queries within an analytics session.
    Stores both user queries and AI responses with visualization data.
    """
    class MessageType(models.TextChoices):
        USER = 'USER', 'User Query'
        ASSISTANT = 'ASSISTANT', 'Assistant Response'
        SYSTEM = 'SYSTEM', 'System Message'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(
        AnalyticsSession,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    message_type = models.CharField(
        max_length=10,
        choices=MessageType.choices,
        default=MessageType.USER
    )
    content = models.TextField(
        help_text='The query text or summary response'
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text='Additional data: visualization type, data, filters, interpretation, etc.'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'analytics_messages'
        verbose_name = 'Analytics Message'
        verbose_name_plural = 'Analytics Messages'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['session', 'created_at']),
        ]

    def __str__(self):
        return f"{self.message_type}: {self.content[:50]}..."
