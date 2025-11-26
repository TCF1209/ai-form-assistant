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
        # Check permission - only ADMIN and MANAGER can access analytics
        if request.user.role not in ['ADMIN', 'MANAGER']:
            return Response(
                {"error": "Only administrators and form managers can access analytics"},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = NLQueryRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        query = serializer.validated_data['query'].lower()

        # Build context based on user's role and department
        user_role = request.user.role
        user_department = request.user.department.name if request.user.department else None

        # Generate mock analytics response based on query
        query_result = self._generate_mock_analytics(query, user_role, user_department)

        response_serializer = NLQueryResponseSerializer(query_result)
        return Response(response_serializer.data, status=status.HTTP_200_OK)

    def _generate_mock_analytics(self, query, user_role, user_department):
        """Generate mock analytics data based on the query"""
        import random
        from datetime import datetime, timedelta

        # Keywords to detect query intent
        leave_keywords = ['leave', 'vacation', 'time off', 'absence', 'annual', 'medical', 'sick']
        pending_keywords = ['pending', 'waiting', 'awaiting', 'queue', 'unprocessed']
        department_keywords = ['department', 'team', 'division', 'unit', 'group']
        count_keywords = ['how many', 'count', 'number', 'total', 'submitted', 'requests']
        time_keywords = ['month', 'week', 'last', 'this', 'today', 'yesterday', 'average', 'time']
        approval_keywords = ['approval', 'approved', 'rejected', 'review', 'processing']
        top_keywords = ['most', 'top', 'highest', 'maximum', 'best', 'popular']

        # Department names for mock data
        departments = ['HR', 'IT', 'Finance', 'Marketing', 'Operations', 'Sales', 'Engineering']

        # Filter departments based on role
        if user_role == 'MANAGER' and user_department:
            departments = [user_department]
            dept_note = f" (showing data for {user_department} department only)"
        else:
            dept_note = " (showing data across all departments)"

        # Detect query type and generate appropriate response
        if any(kw in query for kw in leave_keywords) and any(kw in query for kw in count_keywords):
            # Leave request count queries
            if 'month' in query or 'last month' in query:
                count = random.randint(15, 45)
                return {
                    "interpretation": f"You're asking about leave requests submitted last month{dept_note}",
                    "filters": {
                        "form_type": "Leave Request",
                        "time_range": "last_month",
                        "departments": departments
                    },
                    "aggregation": "count",
                    "visualization": "number",
                    "data": [
                        {"label": "Leave Requests (Last Month)", "value": count, "trend": "+12%"}
                    ],
                    "summary": f"There were {count} leave requests submitted last month. This is 12% more than the previous month."
                }
            elif 'week' in query:
                count = random.randint(5, 15)
                return {
                    "interpretation": f"You're asking about leave requests submitted this week{dept_note}",
                    "filters": {
                        "form_type": "Leave Request",
                        "time_range": "this_week",
                        "departments": departments
                    },
                    "aggregation": "count",
                    "visualization": "number",
                    "data": [
                        {"label": "Leave Requests (This Week)", "value": count}
                    ],
                    "summary": f"There have been {count} leave requests submitted this week so far."
                }
            else:
                count = random.randint(80, 150)
                return {
                    "interpretation": f"You're asking about total leave requests{dept_note}",
                    "filters": {
                        "form_type": "Leave Request",
                        "departments": departments
                    },
                    "aggregation": "count",
                    "visualization": "number",
                    "data": [
                        {"label": "Total Leave Requests", "value": count}
                    ],
                    "summary": f"There are {count} leave requests in total across the system."
                }

        elif any(kw in query for kw in pending_keywords):
            # Pending forms queries
            if any(kw in query for kw in department_keywords):
                return {
                    "interpretation": f"You're asking about pending forms by department{dept_note}",
                    "filters": {
                        "status": "PENDING",
                        "departments": departments
                    },
                    "aggregation": "group_by_department",
                    "visualization": "bar",
                    "data": [
                        {"department": dept, "pending": random.randint(3, 25)}
                        for dept in departments
                    ],
                    "summary": f"Here's the breakdown of pending forms across departments."
                }
            else:
                pending_count = random.randint(10, 40)
                return {
                    "interpretation": f"You're asking about pending forms{dept_note}",
                    "filters": {
                        "status": "PENDING",
                        "departments": departments
                    },
                    "aggregation": "count",
                    "visualization": "number",
                    "data": [
                        {"label": "Pending Forms", "value": pending_count, "urgent": random.randint(2, 8)}
                    ],
                    "summary": f"There are {pending_count} forms currently pending review."
                }

        elif any(kw in query for kw in top_keywords) and any(kw in query for kw in department_keywords):
            # Department comparison queries
            dept_data = [
                {"department": dept, "submissions": random.randint(20, 100)}
                for dept in departments
            ]
            dept_data.sort(key=lambda x: x['submissions'], reverse=True)
            top_dept = dept_data[0]
            return {
                "interpretation": f"You're asking which department has the most submissions{dept_note}",
                "filters": {
                    "group_by": "department",
                    "departments": departments
                },
                "aggregation": "count_by_department",
                "visualization": "bar",
                "data": dept_data,
                "summary": f"The {top_dept['department']} department leads with {top_dept['submissions']} submissions."
            }

        elif any(kw in query for kw in approval_keywords) and any(kw in query for kw in time_keywords):
            # Approval time analytics
            avg_time = round(random.uniform(1.5, 4.5), 1)
            return {
                "interpretation": f"You're asking about average approval time{dept_note}",
                "filters": {
                    "metric": "approval_time",
                    "departments": departments
                },
                "aggregation": "average",
                "visualization": "number",
                "data": [
                    {"label": "Average Approval Time", "value": avg_time, "unit": "days"},
                    {"label": "Fastest", "value": round(random.uniform(0.5, 1.5), 1), "unit": "days"},
                    {"label": "Slowest", "value": round(random.uniform(5.0, 10.0), 1), "unit": "days"}
                ],
                "summary": f"The average approval time is {avg_time} days. Fastest approval was within a few hours, while some complex requests took up to a week."
            }

        elif 'trend' in query or 'over time' in query or 'history' in query:
            # Trend queries
            months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
            return {
                "interpretation": f"You're asking about submission trends over time{dept_note}",
                "filters": {
                    "time_range": "6_months",
                    "departments": departments
                },
                "aggregation": "time_series",
                "visualization": "line",
                "data": [
                    {"month": month, "submissions": random.randint(30, 80), "approved": random.randint(20, 60)}
                    for month in months
                ],
                "summary": "Here's the submission trend over the last 6 months."
            }

        elif 'status' in query or 'breakdown' in query:
            # Status breakdown
            submitted = random.randint(20, 50)
            approved = random.randint(40, 80)
            rejected = random.randint(5, 15)
            pending = random.randint(10, 30)
            return {
                "interpretation": f"You're asking about form status breakdown{dept_note}",
                "filters": {
                    "group_by": "status",
                    "departments": departments
                },
                "aggregation": "count_by_status",
                "visualization": "pie",
                "data": [
                    {"status": "Submitted", "count": submitted, "percentage": 20},
                    {"status": "Approved", "count": approved, "percentage": 50},
                    {"status": "Rejected", "count": rejected, "percentage": 10},
                    {"status": "Pending", "count": pending, "percentage": 20}
                ],
                "summary": f"Out of all forms: {approved} approved, {submitted} submitted, {pending} pending review, and {rejected} rejected."
            }

        elif 'expense' in query or 'claim' in query:
            # Expense related queries
            total_amount = random.randint(5000, 25000)
            claim_count = random.randint(15, 50)
            return {
                "interpretation": f"You're asking about expense claims{dept_note}",
                "filters": {
                    "form_type": "Expense Claim",
                    "departments": departments
                },
                "aggregation": "sum",
                "visualization": "number",
                "data": [
                    {"label": "Total Claims", "value": claim_count},
                    {"label": "Total Amount", "value": total_amount, "unit": "$"},
                    {"label": "Average Claim", "value": round(total_amount / claim_count, 2), "unit": "$"}
                ],
                "summary": f"There are {claim_count} expense claims totaling ${total_amount:,}."
            }

        else:
            # Default: general statistics
            total_submissions = random.randint(100, 300)
            total_forms = random.randint(10, 25)
            pending = random.randint(15, 40)
            return {
                "interpretation": f"Here's an overview of the forms system{dept_note}",
                "filters": {
                    "departments": departments
                },
                "aggregation": "overview",
                "visualization": "cards",
                "data": [
                    {"label": "Total Submissions", "value": total_submissions, "icon": "document"},
                    {"label": "Active Forms", "value": total_forms, "icon": "form"},
                    {"label": "Pending Review", "value": pending, "icon": "clock"},
                    {"label": "Approval Rate", "value": f"{random.randint(75, 95)}%", "icon": "check"}
                ],
                "summary": f"The system currently has {total_forms} active forms with {total_submissions} total submissions. {pending} are pending review."
            }


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