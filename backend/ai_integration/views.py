"""
Views for AI Integration endpoints
"""
import logging
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from forms.models import Form, FormSubmission
from workflows.models import Workflow, WorkflowInstance
from .serializers import (
    FormGenerationRequestSerializer,
    FormGenerationResponseSerializer,
    ConversationStartRequestSerializer,
    ConversationMessageSerializer,
    ConversationResponseSerializer,
    NLQueryRequestSerializer,
    NLQueryResponseSerializer,
    RecommendationRequestSerializer,
    RecommendationSerializer,
    WorkflowOptimizationRequestSerializer,
    WorkflowOptimizationResponseSerializer,
    AIHealthCheckSerializer
)
from .services import (
    get_openai_service,
    get_form_generation_service,
    get_conversational_assistant
)

logger = logging.getLogger(__name__)


class AIFormGenerationViewSet(viewsets.ViewSet):
    """ViewSet for AI-powered form generation"""
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'])
    def generate(self, request):
        """Generate a form from natural language description"""
        # Check if user has permission to create forms
        if not request.user.role in ['ADMIN', 'FORM_MANAGER']:
            return Response(
                {"error": "Only administrators and form managers can generate forms"},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = FormGenerationRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Get department from user if form manager
        department = None
        if request.user.role == 'FORM_MANAGER' and request.user.department:
            department = request.user.department.name
        elif serializer.validated_data.get('department'):
            department = serializer.validated_data['department']

        # Generate form using AI
        form_service = get_form_generation_service()
        result = form_service.generate_from_description(
            serializer.validated_data['description'],
            department
        )

        # Serialize response
        response_serializer = FormGenerationResponseSerializer(result)
        return Response(
            response_serializer.data,
            status=status.HTTP_200_OK if result['success'] else status.HTTP_400_BAD_REQUEST
        )

    @action(detail=True, methods=['post'])
    def enhance(self, request, pk=None):
        """Enhance an existing form with AI suggestions"""
        # Check permission
        if not request.user.role in ['ADMIN', 'FORM_MANAGER']:
            return Response(
                {"error": "Only administrators and form managers can enhance forms"},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get form
        try:
            form = Form.objects.get(pk=pk)
        except Form.DoesNotExist:
            return Response(
                {"error": "Form not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check department access for form managers
        if request.user.role == 'FORM_MANAGER' and form.created_by.department != request.user.department:
            return Response(
                {"error": "You can only enhance forms from your department"},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get form data with fields
        form_data = {
            "title": form.title,
            "description": form.description,
            "fields": list(form.fields.values('name', 'label', 'field_type', 'required'))
        }

        # Enhance form
        form_service = get_form_generation_service()
        enhanced_data = form_service.enhance_existing_form(form_data)

        return Response(enhanced_data, status=status.HTTP_200_OK)


class ConversationalAssistantViewSet(viewsets.ViewSet):
    """ViewSet for conversational form filling assistance"""
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'])
    def start_session(self, request):
        """Start a new conversation session for form filling"""
        serializer = ConversationStartRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Get form
        try:
            form = Form.objects.get(pk=serializer.validated_data['form_id'])
        except Form.DoesNotExist:
            return Response(
                {"error": "Form not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check if user can submit this form
        if form.status != 'ACTIVE':
            return Response(
                {"error": "Form is not active"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get form structure
        form_structure = {
            "title": form.title,
            "description": form.description,
            "fields": list(form.fields.values(
                'name', 'label', 'field_type', 'required',
                'validation_rules', 'options', 'placeholder', 'help_text'
            ))
        }

        # Start conversation session
        assistant = get_conversational_assistant()
        session_id = assistant.start_session(
            str(request.user.id),
            str(form.id),
            form_structure
        )

        # Get initial greeting
        session_data = assistant.get_session_data(session_id)
        initial_message = session_data['conversation'][0]['content'] if session_data['conversation'] else ""

        response_data = {
            "session_id": session_id,
            "message": initial_message,
            "filled_fields": {},
            "progress": 0,
            "is_complete": False
        }

        response_serializer = ConversationResponseSerializer(response_data)
        return Response(response_serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def send_message(self, request):
        """Send a message in the conversation"""
        serializer = ConversationMessageSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Process message
        assistant = get_conversational_assistant()
        result = assistant.process_message(
            serializer.validated_data['session_id'],
            serializer.validated_data['message']
        )

        # Check for errors
        if 'error' in result:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

        response_serializer = ConversationResponseSerializer(result)
        return Response(response_serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def end_session(self, request):
        """End conversation session and get filled data"""
        session_id = request.data.get('session_id')
        if not session_id:
            return Response(
                {"error": "Session ID required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        assistant = get_conversational_assistant()
        filled_data = assistant.end_session(session_id)

        if not filled_data:
            return Response(
                {"error": "Session not found or already ended"},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response({
            "filled_fields": filled_data,
            "message": "Session ended successfully"
        }, status=status.HTTP_200_OK)


class NaturalLanguageQueryView(APIView):
    """View for natural language analytics queries"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Process natural language query"""
        serializer = NLQueryRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Build context based on user's role and department
        context = serializer.validated_data.get('context', {})
        context['user_role'] = request.user.role
        if request.user.department:
            context['department'] = request.user.department.name

        # Get available data context
        available_data = {
            "forms": Form.objects.filter(status='ACTIVE').count(),
            "submissions": FormSubmission.objects.count(),
            "departments": request.user.department.name if request.user.department else "All",
            "date_range": "Last 30 days"  # Default
        }

        # Process query
        ai_service = get_openai_service()
        query_result = ai_service.translate_nl_query(
            serializer.validated_data['query'],
            available_data
        )

        # Execute query based on interpretation (simplified for now)
        if 'error' not in query_result:
            # TODO: Implement actual database query execution based on AI interpretation
            # For now, return mock data
            query_result['data'] = self._execute_interpreted_query(query_result)

        response_serializer = NLQueryResponseSerializer(query_result)
        return Response(response_serializer.data, status=status.HTTP_200_OK)

    def _execute_interpreted_query(self, interpretation):
        """Execute the interpreted query (placeholder implementation)"""
        # This would be replaced with actual database queries
        # based on the AI's interpretation
        if interpretation.get('aggregation') == 'count':
            return [{"count": 42, "label": "Total"}]
        elif interpretation.get('visualization') == 'bar':
            return [
                {"label": "Jan", "value": 10},
                {"label": "Feb", "value": 15},
                {"label": "Mar", "value": 20}
            ]
        return []


class RecommendationView(APIView):
    """View for AI-powered recommendations"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Get AI recommendations"""
        serializer = RecommendationRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Build user data
        user_data = {
            "user_id": str(request.user.id),
            "role": request.user.role,
            "department": request.user.department.name if request.user.department else None,
            "recent_submissions": list(
                FormSubmission.objects.filter(submitted_by=request.user)
                .order_by('-submitted_at')[:5]
                .values('form__title', 'status', 'submitted_at')
            ),
            "frequently_used_forms": self._get_frequently_used_forms(request.user)
        }

        # Build context
        context = serializer.validated_data.get('user_context', {})
        context['recommendation_type'] = serializer.validated_data['recommendation_type']

        # Get recommendations
        ai_service = get_openai_service()
        recommendations = ai_service.generate_recommendations(user_data, context)

        # Serialize recommendations
        recommendation_serializers = [RecommendationSerializer(rec) for rec in recommendations]
        return Response({
            "recommendations": [s.data for s in recommendation_serializers if s.is_valid()],
            "count": len(recommendations)
        }, status=status.HTTP_200_OK)

    def _get_frequently_used_forms(self, user):
        """Get user's frequently used forms"""
        from django.db.models import Count

        return list(
            FormSubmission.objects.filter(submitted_by=user)
            .values('form__title')
            .annotate(usage_count=Count('form'))
            .order_by('-usage_count')[:3]
        )


class WorkflowOptimizationView(APIView):
    """View for workflow optimization suggestions"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Get workflow optimization suggestions"""
        serializer = WorkflowOptimizationRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Get workflow
        try:
            workflow = Workflow.objects.get(pk=serializer.validated_data['workflow_id'])
        except Workflow.DoesNotExist:
            return Response(
                {"error": "Workflow not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check permission
        if request.user.role == 'FORM_MANAGER' and workflow.form.created_by.department != request.user.department:
            return Response(
                {"error": "You can only optimize workflows from your department"},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get workflow data
        workflow_data = {
            "id": str(workflow.id),
            "name": workflow.name,
            "steps": list(workflow.steps.values('name', 'step_type', 'order', 'conditions')),
            "total_steps": workflow.steps.count()
        }

        # Get performance metrics if requested
        performance_metrics = {}
        if serializer.validated_data['include_metrics']:
            # Calculate metrics
            instances = WorkflowInstance.objects.filter(workflow=workflow)
            completed_instances = instances.filter(status='COMPLETED')

            if completed_instances.exists():
                from django.db.models import Avg, Count
                from datetime import timedelta

                performance_metrics = {
                    "total_instances": instances.count(),
                    "completed": completed_instances.count(),
                    "average_completion_time": "2 days",  # Placeholder
                    "bottleneck_steps": [],  # Would require more complex analysis
                    "approval_rate": (completed_instances.count() / instances.count() * 100) if instances.count() > 0 else 0
                }

        # Get AI optimization suggestions
        ai_service = get_openai_service()
        optimization_result = ai_service.optimize_workflow(workflow_data, performance_metrics)

        response_serializer = WorkflowOptimizationResponseSerializer(optimization_result)
        return Response(response_serializer.data, status=status.HTTP_200_OK)


class AIHealthCheckView(APIView):
    """View for checking AI service health"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Check AI service health status"""
        ai_service = get_openai_service()

        health_data = {
            "status": "healthy" if ai_service.client else "not configured",
            "openai_configured": bool(ai_service.api_key),
            "cache_enabled": True,  # Assuming Django cache is configured
        }

        if ai_service.client:
            health_data["model"] = ai_service.model
        else:
            health_data["error"] = "OpenAI API key not configured"

        serializer = AIHealthCheckSerializer(health_data)
        return Response(
            serializer.data,
            status=status.HTTP_200_OK if health_data["status"] == "healthy" else status.HTTP_503_SERVICE_UNAVAILABLE
        )