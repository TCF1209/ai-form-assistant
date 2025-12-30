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
from core.throttling import AIRateThrottle
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
    AIHealthCheckSerializer,
    ChatSessionSerializer,
    ChatMessageSerializer,
    ChatMessageCreateSerializer
)
from .models import ChatSession, ChatMessage
from .services import (
    get_openai_service,
    get_form_generation_service,
    get_conversational_assistant
)

logger = logging.getLogger(__name__)


class AIFormGenerationViewSet(viewsets.ViewSet):
    """ViewSet for AI-powered form generation"""
    permission_classes = [IsAuthenticated]
    throttle_classes = [AIRateThrottle]

    @action(detail=False, methods=['post'])
    def generate(self, request):
        """Generate a form from natural language description"""
        # Check if user has permission to create forms
        if not request.user.role in ['ADMIN', 'MANAGER', 'FORM_MANAGER']:
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
    throttle_classes = [AIRateThrottle]

    @action(detail=False, methods=['post'])
    def search_forms(self, request):
        """AI-powered form search based on user query"""
        query = request.data.get('query', '').strip()

        if not query:
            return Response(
                {"error": "Query is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get all active forms accessible to the user
        forms = Form.objects.filter(status='ACTIVE')

        # If user has a department, prioritize their department's forms
        user_department = request.user.department

        if not forms.exists():
            return Response({
                "forms": [],
                "message": "No forms available",
                "ai_response": "There are no forms available at the moment."
            })

        # Prepare forms data for AI analysis (include fields for extraction)
        forms_data = []
        for form in forms:
            # Get form fields for intelligent extraction
            form_fields = []
            for field in form.fields.all().order_by('order'):
                field_info = {
                    "name": field.name,
                    "label": field.label,
                    "type": field.field_type,
                    "required": field.required,
                }
                # Include options for select/radio fields
                if field.field_type in ['SELECT', 'RADIO', 'MULTISELECT'] and field.options:
                    field_info["options"] = field.options
                form_fields.append(field_info)

            forms_data.append({
                "id": str(form.id),
                "name": form.name,
                "description": form.description or "",
                "department": form.department.name if form.department else "General",
                "code": form.code,
                "fields": form_fields
            })

        # Use OpenAI to find the best matching form
        ai_service = get_openai_service()

        if ai_service.client:
            # AI-powered search with field value extraction
            system_prompt = """You are a smart form search assistant. Based on the user's query:
1. Find the most relevant form(s) from the available forms
2. Extract any field values mentioned in the user's query that can be used to pre-fill the form

Return a JSON object with:
{
    "best_match_id": "form_id or null if no good match",
    "confidence": 0.0-1.0,
    "reasoning": "Brief explanation of why this form matches",
    "alternative_ids": ["other", "relevant", "form_ids"],
    "response_message": "A friendly message to the user about what you found",
    "extracted_fields": {
        "field_name": "extracted_value"
    }
}

IMPORTANT for extracted_fields:
- Only extract values that are clearly stated in the user's query
- Use the exact field "name" (not label) as the key
- For SELECT/RADIO fields, match the value to one of the available options
- For DATE fields, convert to YYYY-MM-DD format if possible
- Leave out fields that have no clear value in the query
- Be generous in extraction - if user mentions something related to a field, extract it
- IMPORTANT: Always translate extracted values to English, even if the user's query is in another language (Chinese, Malay, etc.)
  - Example: "跟我的家人去度假" → "Family vacation"
  - Example: "生病了" → "Sick"
  - Example: "bercuti bersama keluarga" → "Family vacation"

Examples:
- "I need annual leave for vacation" → {"leave_type": "Annual Leave", "reason_for_leave": "vacation"}
- "expense claim for $500 taxi" → {"amount": "500", "expense_type": "Transportation", "description": "taxi"}
- "sick leave tomorrow" → {"leave_type": "Sick Leave"}
- "我打算请年假，跟家人去度假" → {"leave_type": "Annual Leave", "reason_for_leave": "Family vacation"}

If the query is a greeting or not related to forms, return:
{
    "best_match_id": null,
    "confidence": 0,
    "reasoning": "Query is not a form search request",
    "alternative_ids": [],
    "response_message": "Appropriate response to the user",
    "extracted_fields": {}
}"""

            user_prompt = f"""User query: "{query}"

Available forms:
{forms_data}

User's department: {user_department.name if user_department else 'Not specified'}"""

            try:
                import json
                messages = [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ]

                response = ai_service._make_api_call(messages, temperature=0.3)

                if response:
                    ai_result = json.loads(response)

                    # Build response with actual form data
                    result_forms = []

                    if ai_result.get('best_match_id'):
                        best_form = forms.filter(id=ai_result['best_match_id']).first()
                        if best_form:
                            result_forms.append({
                                "id": str(best_form.id),
                                "name": best_form.name,
                                "description": best_form.description,
                                "department_name": best_form.department.name if best_form.department else None,
                                "code": best_form.code,
                                "is_best_match": True
                            })

                    # Add alternatives
                    for alt_id in ai_result.get('alternative_ids', [])[:3]:
                        alt_form = forms.filter(id=alt_id).first()
                        if alt_form and str(alt_form.id) != ai_result.get('best_match_id'):
                            result_forms.append({
                                "id": str(alt_form.id),
                                "name": alt_form.name,
                                "description": alt_form.description,
                                "department_name": alt_form.department.name if alt_form.department else None,
                                "code": alt_form.code,
                                "is_best_match": False
                            })

                    return Response({
                        "forms": result_forms,
                        "ai_response": ai_result.get('response_message', ''),
                        "confidence": ai_result.get('confidence', 0),
                        "reasoning": ai_result.get('reasoning', ''),
                        "extracted_fields": ai_result.get('extracted_fields', {})
                    })
            except Exception as e:
                logger.error(f"AI search error: {e}")
                # Fall back to keyword search

        # Fallback: Simple keyword matching
        query_lower = query.lower()
        scored_forms = []

        for form in forms:
            score = 0
            form_text = f"{form.name} {form.description or ''} {form.code}".lower()

            for word in query_lower.split():
                if len(word) > 2 and word in form_text:
                    score += 10

            if score > 0:
                scored_forms.append({
                    "id": str(form.id),
                    "name": form.name,
                    "description": form.description,
                    "department_name": form.department.name if form.department else None,
                    "code": form.code,
                    "score": score
                })

        scored_forms.sort(key=lambda x: x['score'], reverse=True)

        return Response({
            "forms": scored_forms[:5],
            "ai_response": f"I found {len(scored_forms)} form(s) matching your search." if scored_forms else "I couldn't find a specific form. Here are all available forms.",
            "confidence": 0.7 if scored_forms else 0,
            "extracted_fields": {}  # No extraction in fallback mode
        })

    @action(detail=False, methods=['get'])
    def user_profile(self, request):
        """Get user profile data for auto-fill"""
        user = request.user

        profile_data = {
            "name": f"{user.first_name} {user.last_name}".strip() or user.username,
            "first_name": user.first_name or "",
            "last_name": user.last_name or "",
            "email": user.email or "",
            "employee_id": getattr(user, 'employee_id', '') or "",
            "department": user.department.name if user.department else "",
            "department_id": str(user.department.id) if user.department else "",
            "phone": getattr(user, 'phone_number', '') or "",  # User model uses phone_number
            "position": getattr(user, 'position', '') or "",
        }

        return Response(profile_data)

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
    """
    View for natural language analytics queries using AI-powered interpretation

    This implements the Hybrid Approach:
    1. OpenAI parses user query to understand intent
    2. Backend executes database queries based on intent
    3. OpenAI formats the response in natural language
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [AIRateThrottle]

    def post(self, request):
        """Process natural language query with AI assistance"""
        # Check permission - only ADMIN and MANAGER can access analytics
        if request.user.role not in ['ADMIN', 'MANAGER']:
            return Response(
                {"error": "Only administrators and form managers can access analytics"},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = NLQueryRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        query = serializer.validated_data['query']
        conversation_history = serializer.validated_data.get('conversation_history', [])
        user_role = request.user.role
        user_department = request.user.department if request.user.department else None

        # Get AI service
        ai_service = get_openai_service()

        # Build context for AI
        available_context = self._build_context(user_role, user_department)

        # Step 1: AI parses the query to understand intent (with conversation history for context)
        intent = ai_service.parse_analytics_intent(query, available_context, conversation_history)
        logger.info(f"Analytics query intent: {intent}")
        logger.info(f"Analytics query - entity: {intent.get('entity')}, filters: {intent.get('filters')}")

        # Handle special cases (greetings, help requests, casual messages, gibberish)
        if intent.get('is_greeting'):
            return Response({
                "interpretation": "",
                "filters": {},
                "aggregation": None,
                "visualization": "text",
                "data": [],
                "summary": "Hello! I can help you analyze your forms data. Try asking questions like:\n\n• How many leave requests were submitted last month?\n• Show me pending forms by department\n• What's our approval rate?\n• Show submission trends over time"
            })

        if intent.get('is_help_request'):
            return Response({
                "interpretation": "",
                "filters": {},
                "aggregation": None,
                "visualization": "text",
                "data": [],
                "summary": "I can answer questions about your forms and submissions. Here are some examples:\n\n• \"How many leave requests last month?\" - Count specific form types\n• \"Show pending forms by department\" - Break down by categories\n• \"What's the average approval time?\" - Calculate metrics\n• \"Show submission trends\" - View data over time\n• \"Status breakdown\" - See distribution of statuses"
            })

        if intent.get('is_casual_message'):
            return Response({
                "interpretation": "",
                "filters": {},
                "aggregation": None,
                "visualization": "text",
                "data": [],
                "summary": "You're welcome! Feel free to ask me any questions about your forms data anytime."
            })

        if intent.get('is_gibberish'):
            return Response({
                "interpretation": "",
                "filters": {},
                "aggregation": None,
                "visualization": "text",
                "data": [],
                "summary": "I didn't quite understand that. Try asking something like:\n\n• \"How many submissions this month?\"\n• \"Show pending forms by department\"\n• \"What's our approval rate?\""
            })

        # Step 2: Execute database query based on AI intent
        try:
            query_result = self._execute_query(intent, user_role, user_department)
        except ValueError as e:
            # Data validation error - provide specific feedback
            logger.error(f"Validation error in analytics query: {e}")
            return Response({
                "interpretation": intent.get('interpretation', ''),
                "filters": intent.get('filters', {}),
                "aggregation": None,
                "visualization": "text",
                "data": [],
                "summary": f"I couldn't process that query: {str(e)}\n\nTry being more specific, for example:\n• \"How many leave requests last month?\"\n• \"Show submissions by department\""
            })
        except PermissionError as e:
            # Authorization error
            logger.error(f"Permission error in analytics query: {e}")
            return Response({
                "interpretation": intent.get('interpretation', ''),
                "filters": intent.get('filters', {}),
                "aggregation": None,
                "visualization": "text",
                "data": [],
                "summary": "You don't have permission to access that data. Please contact your administrator if you need access."
            })
        except Exception as e:
            # General error with helpful suggestions
            logger.error(f"Error executing analytics query: {e}")
            error_type = type(e).__name__

            # Provide specific suggestions based on query type
            query_type = intent.get('query_type', 'unknown')
            suggestions = {
                'trend': "• \"Show submission trends\"\n• \"Monthly submissions over time\"",
                'breakdown': "• \"Breakdown by status\"\n• \"Show submissions by department\"",
                'count': "• \"How many submissions this month?\"\n• \"Count approved forms\"",
                'comparison': "• \"Compare departments\"\n• \"Show IT vs Finance submissions\"",
            }
            suggestion_text = suggestions.get(query_type, "• \"How many submissions?\"\n• \"Show status breakdown\"")

            return Response({
                "interpretation": intent.get('interpretation', ''),
                "filters": intent.get('filters', {}),
                "aggregation": None,
                "visualization": "text",
                "data": [],
                "summary": f"I had trouble processing your query. Here's what I understood:\n\n**Query type:** {query_type}\n**Filters:** {intent.get('filters', 'None')}\n\nTry these instead:\n{suggestion_text}"
            })

        # Step 3: AI formats the response (if AI is available)
        if ai_service.client and not intent.get('error'):
            try:
                ai_summary = ai_service.format_analytics_response(
                    query,
                    query_result.get('data', []),
                    intent
                )
                query_result['summary'] = ai_summary
            except Exception as e:
                logger.error(f"Error formatting AI response: {e}")
                # Keep the default summary from _execute_query

        # Always include interpretation for query transparency
        interpretation = intent.get('interpretation', '')
        if interpretation and not interpretation.lower().startswith('user '):
            query_result['interpretation'] = interpretation
        else:
            # Generate a default interpretation based on query type
            query_type = intent.get('query_type', 'overview')
            default_interpretations = {
                'count': 'Counting submissions',
                'trend': 'Showing submission trends over time',
                'breakdown': 'Breaking down data by category',
                'comparison': 'Comparing data across categories',
                'average': 'Calculating average metrics',
                'overview': 'Showing system overview',
                'list': 'Listing items',
            }
            query_result['interpretation'] = default_interpretations.get(query_type, 'Processing your query')

        # Add query metadata for transparency (what the AI understood)
        query_result['query_metadata'] = {
            'query_type': intent.get('query_type', 'unknown'),
            'filters_applied': intent.get('filters', {}),
            'group_by': intent.get('group_by'),
            'entity': intent.get('entity', 'submissions'),
            'confidence': intent.get('confidence', 0.8),
        }

        response_serializer = NLQueryResponseSerializer(query_result)
        return Response(response_serializer.data, status=status.HTTP_200_OK)

    def _build_context(self, user_role, user_department):
        """Build context information for AI to understand the data available"""
        from users.models import Department

        # Get list of departments
        departments = list(Department.objects.filter(is_active=True).values_list('name', flat=True))

        # Get form types from existing forms
        form_types = list(Form.objects.values_list('name', flat=True).distinct()[:20])

        return {
            'departments': departments,
            'form_types': form_types,
            'user_role': user_role,
            'user_department': user_department.name if user_department else None,
            'statuses': ['DRAFT', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED']
        }

    def _get_base_queryset(self, user_role, user_department):
        """Get base queryset filtered by user's access level"""
        queryset = FormSubmission.objects.all()
        if user_role == 'MANAGER' and user_department:
            queryset = queryset.filter(form__department=user_department)
        return queryset

    def _get_forms_queryset(self, user_role, user_department):
        """Get forms queryset filtered by user's access level"""
        queryset = Form.objects.all()
        if user_role == 'MANAGER' and user_department:
            queryset = queryset.filter(department=user_department)
        return queryset

    def _execute_query(self, intent, user_role, user_department):
        """
        Execute database query based on AI-parsed intent

        This is Step 2 of the Hybrid Approach - actual database queries
        """
        from django.db.models import Count, Q
        from django.utils import timezone
        from datetime import timedelta
        from users.models import Department

        base_qs = self._get_base_queryset(user_role, user_department)
        forms_qs = self._get_forms_queryset(user_role, user_department)
        now = timezone.now()

        # Get department info for display
        dept_name = user_department.name if user_department else None
        if user_role == 'MANAGER' and dept_name:
            dept_note = f" (showing data for {dept_name} department only)"
        else:
            dept_note = " (showing data across all departments)"

        query_type = intent.get('query_type', 'overview')
        filters = intent.get('filters') or {}  # Handle None case
        group_by = intent.get('group_by')
        visualization = intent.get('visualization', 'cards')

        # Safely extract filter values (handle None and non-dict cases)
        time_range = filters.get('time_range') if filters else None
        status_filter = filters.get('status') if filters else None
        form_type = filters.get('form_type') if filters else None
        dept_filter = filters.get('department') if filters else None

        # Apply time range filter
        if time_range:
            base_qs = self._apply_time_filter(base_qs, time_range, now)

        # Apply status filter (only for submissions, not forms)
        # Note: For forms queries, status is handled in _execute_forms_count_query
        entity = intent.get('entity', 'submissions')
        if status_filter and entity != 'forms':
            if isinstance(status_filter, list):
                base_qs = base_qs.filter(status__in=status_filter)
            elif isinstance(status_filter, str):
                base_qs = base_qs.filter(status=status_filter)

        # Apply form type filter
        if form_type and isinstance(form_type, str):
            base_qs = base_qs.filter(
                Q(form__name__icontains=form_type) |
                Q(form__code__icontains=form_type)
            )

        # Apply department filter
        if dept_filter and isinstance(dept_filter, str):
            base_qs = base_qs.filter(form__department__name__icontains=dept_filter)
            # Also apply to forms queryset for entity='forms' queries
            forms_qs = forms_qs.filter(department__name__icontains=dept_filter)

        # Execute based on query type (order matters - specific types before breakdown)
        if query_type == 'count':
            # Handle counting forms vs submissions
            if entity == 'forms':
                return self._execute_forms_count_query(forms_qs, intent, dept_note)
            else:
                return self._execute_count_query(base_qs, intent, dept_note)

        elif query_type == 'trend':
            # Trend queries should always show line chart
            return self._execute_trend_query(base_qs, intent, now, dept_note)

        elif query_type == 'comparison':
            # Comparison queries should show bar chart
            return self._execute_comparison_query(base_qs, intent, user_role, user_department, dept_note)

        elif query_type == 'average':
            return self._execute_average_query(base_qs, intent, dept_note)

        elif query_type == 'list' and entity == 'forms':
            # Handle listing forms - check BEFORE breakdown to ensure "show forms" works correctly
            return self._execute_forms_list_query(forms_qs, intent, dept_note)

        elif query_type == 'breakdown' or group_by:
            # Breakdown queries - ranking or donut based on group_by
            return self._execute_breakdown_query(base_qs, intent, group_by, user_role, user_department, dept_note)

        elif query_type == 'list':
            # Handle listing submissions (who submitted, which forms, etc.)
            return self._execute_submissions_list_query(base_qs, intent, dept_note)

        else:
            # Default: overview
            return self._execute_overview_query(base_qs, forms_qs, dept_note)

    def _apply_time_filter(self, queryset, time_range, now):
        """Apply time range filter to queryset"""
        from datetime import timedelta

        if time_range == 'today':
            start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            return queryset.filter(submitted_at__gte=start)

        elif time_range == 'yesterday':
            yesterday = now - timedelta(days=1)
            start = yesterday.replace(hour=0, minute=0, second=0, microsecond=0)
            end = now.replace(hour=0, minute=0, second=0, microsecond=0)
            return queryset.filter(submitted_at__gte=start, submitted_at__lt=end)

        elif time_range == 'this_week':
            start = now - timedelta(days=now.weekday())
            start = start.replace(hour=0, minute=0, second=0, microsecond=0)
            return queryset.filter(submitted_at__gte=start)

        elif time_range == 'last_week':
            end = now - timedelta(days=now.weekday())
            start = end - timedelta(days=7)
            return queryset.filter(submitted_at__gte=start, submitted_at__lt=end)

        elif time_range == 'this_month':
            start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            return queryset.filter(submitted_at__gte=start)

        elif time_range == 'last_month':
            end = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            start = (end - timedelta(days=1)).replace(day=1)
            return queryset.filter(submitted_at__gte=start, submitted_at__lt=end)

        elif time_range == 'this_year':
            start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
            return queryset.filter(submitted_at__gte=start)

        elif time_range == 'last_6_months':
            start = now - timedelta(days=180)
            return queryset.filter(submitted_at__gte=start)

        return queryset

    def _execute_count_query(self, queryset, intent, dept_note):
        """Execute a count query for submissions"""
        count = queryset.count()
        filters = intent.get('filters', {}) or {}

        # Build label - handle None values safely
        form_type = filters.get('form_type')
        time_range = filters.get('time_range')

        form_type_label = form_type.title() if form_type else "Form"
        time_label = f" ({time_range.replace('_', ' ')})" if time_range else ""

        label = f"{form_type_label} Submissions{time_label}"

        return {
            "interpretation": intent.get('interpretation', f"Counting submissions{dept_note}"),
            "filters": filters,
            "aggregation": "count",
            "visualization": "number",
            "data": [{"label": label, "value": count}],
            "summary": f"Found {count} submissions matching your criteria."
        }

    def _execute_forms_count_query(self, forms_queryset, intent, dept_note):
        """Execute a count query for forms (not submissions)"""
        filters = intent.get('filters', {}) or {}
        status_filter = filters.get('status')
        status_label = "Active"  # Default label

        # Map common terms to form statuses
        status_map = {
            'active': 'ACTIVE',
            'draft': 'DRAFT',
            'archived': 'ARCHIVED',
            'inactive': 'INACTIVE'
        }

        logger.info(f"Forms count query - status_filter: {status_filter}, type: {type(status_filter)}")

        try:
            # Normalize status filter to get the actual status to query
            target_status = None

            if status_filter:
                if isinstance(status_filter, list) and len(status_filter) > 0:
                    # Take first status from list
                    first_status = status_filter[0]
                    if isinstance(first_status, str):
                        target_status = status_map.get(first_status.lower(), first_status.upper())
                elif isinstance(status_filter, str):
                    target_status = status_map.get(status_filter.lower(), status_filter.upper())

            # Default to ACTIVE if no valid status found
            if not target_status:
                target_status = 'ACTIVE'

            # Apply the status filter
            forms_queryset = forms_queryset.filter(status=target_status)
            status_label = target_status.title()
            count = forms_queryset.count()

            logger.info(f"Forms count query - target_status: {target_status}, count: {count}")

        except Exception as e:
            logger.error(f"Error in forms count query: {e}, filters: {filters}")
            # Fallback: count all active forms
            count = forms_queryset.filter(status='ACTIVE').count()
            status_label = "Active"

        label = f"{status_label} Forms"

        return {
            "interpretation": intent.get('interpretation', f"Counting forms{dept_note}"),
            "filters": filters,
            "aggregation": "count",
            "visualization": "number",
            "data": [{"label": label, "value": count}],
            "summary": f"There are {count} {status_label.lower()} forms in the system."
        }

    def _execute_forms_list_query(self, forms_queryset, intent, dept_note):
        """Execute a list query for forms"""
        filters = intent.get('filters', {})

        # Default to active forms
        forms_queryset = forms_queryset.filter(status='ACTIVE')

        # Get form data
        forms_data = []
        for form in forms_queryset:
            forms_data.append({
                "name": form.name,
                "department": form.department.name if form.department else "General",
                "submissions": form.submissions.count()
            })

        # Sort by submissions descending (highest first) and limit to 10
        forms_data = sorted(forms_data, key=lambda x: x['submissions'], reverse=True)[:10]

        return {
            "interpretation": intent.get('interpretation', f"Listing forms{dept_note}"),
            "filters": filters,
            "aggregation": "list",
            "visualization": "ranking",
            "data": forms_data if forms_data else [{"name": "No forms", "department": "-", "submissions": 0}],
            "summary": f"Found {len(forms_data)} active forms."
        }

    def _execute_breakdown_query(self, queryset, intent, group_by, user_role, user_department, dept_note):
        """Execute a breakdown/group by query"""
        from django.db.models import Count
        from users.models import Department

        if group_by == 'department':
            # Group by department - show as ranking (optimized with single query)
            # Apply manager filter if needed
            if user_role == 'MANAGER' and user_department:
                queryset = queryset.filter(form__department=user_department)

            # Single optimized query with annotation
            dept_data = list(
                queryset.values('form__department__name')
                .annotate(submissions=Count('id'))
                .filter(form__department__isnull=False, submissions__gt=0)
                .order_by('-submissions')
            )

            # Format results
            formatted_data = [
                {"name": item['form__department__name'], "submissions": item['submissions']}
                for item in dept_data
            ]

            return {
                "interpretation": intent.get('interpretation', f"Breakdown by department{dept_note}"),
                "filters": intent.get('filters', {}),
                "aggregation": "group_by_department",
                "visualization": "ranking",
                "data": formatted_data if formatted_data else [{"name": "No data", "submissions": 0}],
                "summary": f"Breakdown across {len(formatted_data)} departments."
            }

        elif group_by == 'status':
            # Group by status
            status_counts = queryset.values('status').annotate(count=Count('id'))
            total = sum(s['count'] for s in status_counts) or 1

            status_map = {
                'DRAFT': 'Draft',
                'SUBMITTED': 'Submitted',
                'IN_REVIEW': 'In Review',
                'APPROVED': 'Approved',
                'REJECTED': 'Rejected',
                'CANCELLED': 'Cancelled'
            }

            data = []
            for s in status_counts:
                data.append({
                    "status": status_map.get(s['status'], s['status']),
                    "count": s['count'],
                    "percentage": round((s['count'] / total) * 100)
                })

            data.sort(key=lambda x: x['count'], reverse=True)

            return {
                "interpretation": intent.get('interpretation', f"Status breakdown{dept_note}"),
                "filters": intent.get('filters', {}),
                "aggregation": "count_by_status",
                "visualization": "donut",
                "data": data if data else [{"status": "No Data", "count": 0, "percentage": 0}],
                "summary": f"Status distribution across {total} submissions."
            }

        elif group_by == 'form':
            # Group by form type - show as ranking
            form_counts = queryset.values('form__name').annotate(count=Count('id')).order_by('-count')[:10]

            data = [{"form_name": f['form__name'], "submissions": f['count']} for f in form_counts]

            return {
                "interpretation": intent.get('interpretation', f"Breakdown by form type{dept_note}"),
                "filters": intent.get('filters', {}),
                "aggregation": "group_by_form",
                "visualization": "ranking",
                "data": data if data else [{"form_name": "No data", "submissions": 0}],
                "summary": f"Top {len(data)} forms by submission count."
            }

        else:
            # Default breakdown by status
            return self._execute_breakdown_query(queryset, intent, 'status', user_role, user_department, dept_note)

    def _execute_trend_query(self, queryset, intent, now, dept_note):
        """Execute a trend/time series query using optimized database aggregation"""
        from datetime import timedelta
        from django.db.models import Count, Q
        from django.db.models.functions import TruncMonth

        # Calculate date range (last 6 months)
        six_months_ago = (now - timedelta(days=180)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # Single optimized query with aggregation by month
        trend_qs = queryset.filter(
            submitted_at__gte=six_months_ago
        ).annotate(
            month=TruncMonth('submitted_at')
        ).values('month').annotate(
            submissions=Count('id'),
            approved=Count('id', filter=Q(status='APPROVED'))
        ).order_by('month')

        # Convert to dict using year-month string as key (avoids timezone comparison issues)
        trend_results = {}
        for item in trend_qs:
            if item['month']:
                key = item['month'].strftime('%Y-%m')
                trend_results[key] = item

        # Generate all 6 months with zeros for empty months
        trend_data = []
        for i in range(5, -1, -1):
            month_date = now - timedelta(days=i*30)
            month_start = month_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            month_key = month_start.strftime('%Y-%m')
            month_name = month_start.strftime('%b')

            if month_key in trend_results:
                trend_data.append({
                    "month": month_name,
                    "submissions": trend_results[month_key]['submissions'],
                    "approved": trend_results[month_key]['approved']
                })
            else:
                trend_data.append({
                    "month": month_name,
                    "submissions": 0,
                    "approved": 0
                })

        return {
            "interpretation": intent.get('interpretation', f"Submission trends over time{dept_note}"),
            "filters": intent.get('filters', {}),
            "aggregation": "time_series",
            "visualization": "line",
            "data": trend_data,
            "summary": "Trend data for the last 6 months."
        }

    def _execute_average_query(self, queryset, intent, dept_note):
        """Execute an average/metric query using optimized database aggregation"""
        from django.db.models import Avg, Min, Max, F, ExpressionWrapper, DurationField

        # Calculate approval time using database aggregation
        approved_qs = queryset.filter(
            status='APPROVED',
            submitted_at__isnull=False,
            updated_at__isnull=False
        ).annotate(
            approval_duration=ExpressionWrapper(
                F('updated_at') - F('submitted_at'),
                output_field=DurationField()
            )
        )

        # Aggregate stats in single query
        stats = approved_qs.aggregate(
            avg_duration=Avg('approval_duration'),
            min_duration=Min('approval_duration'),
            max_duration=Max('approval_duration')
        )

        # Convert timedelta to days
        def duration_to_days(duration):
            if duration:
                return round(duration.total_seconds() / 86400, 1)
            return 0

        avg_time = duration_to_days(stats.get('avg_duration'))
        min_time = duration_to_days(stats.get('min_duration'))
        max_time = min(duration_to_days(stats.get('max_duration')), 30)  # Cap at 30 days

        has_data = stats.get('avg_duration') is not None

        return {
            "interpretation": intent.get('interpretation', f"Average metrics{dept_note}"),
            "filters": intent.get('filters', {}),
            "aggregation": "average",
            "visualization": "number",
            "data": [
                {"label": "Average Approval Time", "value": avg_time, "unit": "days"},
                {"label": "Fastest", "value": min_time, "unit": "days"},
                {"label": "Slowest", "value": max_time, "unit": "days"}
            ],
            "summary": f"Average approval time is {avg_time} days." if has_data else "No data available to calculate averages."
        }

    def _execute_comparison_query(self, queryset, intent, user_role, user_department, dept_note):
        """Execute a comparison query using optimized database aggregation"""
        from django.db.models import Count

        # Single query with annotation instead of N queries
        dept_data = list(
            queryset.values('form__department__name')
            .annotate(submissions=Count('id'))
            .filter(form__department__isnull=False)
            .order_by('-submissions')
        )

        # Format results
        formatted_data = [
            {"name": item['form__department__name'], "submissions": item['submissions']}
            for item in dept_data
        ]

        return {
            "interpretation": intent.get('interpretation', f"Comparison across departments{dept_note}"),
            "filters": intent.get('filters', {}),
            "aggregation": "comparison",
            "visualization": "bar",
            "data": formatted_data if formatted_data else [{"name": "No data", "submissions": 0}],
            "summary": f"Comparison data across {len(formatted_data)} departments."
        }

    def _execute_overview_query(self, base_qs, forms_qs, dept_note):
        """Execute an overview query - general statistics"""
        total_submissions = base_qs.count()
        total_forms = forms_qs.filter(status='ACTIVE').count()
        pending = base_qs.filter(status__in=['SUBMITTED', 'IN_REVIEW']).count()
        approved = base_qs.filter(status='APPROVED').count()

        approval_rate = round((approved / total_submissions * 100)) if total_submissions > 0 else 0

        return {
            "interpretation": f"System overview{dept_note}",
            "filters": {},
            "aggregation": "overview",
            "visualization": "cards",
            "data": [
                {"label": "Total Submissions", "value": total_submissions, "icon": "document"},
                {"label": "Active Forms", "value": total_forms, "icon": "form"},
                {"label": "Pending Review", "value": pending, "icon": "clock"},
                {"label": "Approval Rate", "value": f"{approval_rate}%", "icon": "check"}
            ],
            "summary": f"Overview: {total_forms} active forms, {total_submissions} submissions, {pending} pending review."
        }

    def _execute_submissions_list_query(self, queryset, intent, dept_note):
        """Execute a list query - returns actual submission records (who submitted, etc.)"""
        # Limit results to avoid overwhelming response
        limit = intent.get('limit', 20)
        submissions = queryset.select_related('form', 'submitted_by', 'form__department').order_by('-submitted_at')[:limit]

        # Build list data with submitter info
        list_data = []
        for sub in submissions:
            submitter_name = "Unknown"
            if sub.submitted_by:
                if sub.submitted_by.first_name and sub.submitted_by.last_name:
                    submitter_name = f"{sub.submitted_by.first_name} {sub.submitted_by.last_name}"
                elif sub.submitted_by.username:
                    submitter_name = sub.submitted_by.username

            list_data.append({
                "submitter": submitter_name,
                "form": sub.form.name if sub.form else "Unknown Form",
                "department": sub.form.department.name if sub.form and sub.form.department else "N/A",
                "status": sub.status,
                "submitted_at": sub.submitted_at.strftime("%Y-%m-%d %H:%M") if sub.submitted_at else "N/A"
            })

        total_count = queryset.count()
        filters = intent.get('filters', {}) or {}
        time_range = filters.get('time_range', '')
        time_label = f" {time_range.replace('_', ' ')}" if time_range else ""

        return {
            "interpretation": intent.get('interpretation', f"List of submissions{time_label}{dept_note}"),
            "filters": filters,
            "aggregation": "list",
            "visualization": "table",
            "data": list_data,
            "summary": f"Found {total_count} submission(s){time_label}. Showing {len(list_data)} most recent." if total_count > len(list_data) else f"Found {total_count} submission(s){time_label}."
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


class ChatHistoryViewSet(viewsets.ViewSet):
    """ViewSet for managing chat history"""
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def current(self, request):
        """Get or create the current active chat session with all messages"""
        # Get or create active session for the user
        session, created = ChatSession.objects.get_or_create(
            user=request.user,
            is_active=True,
            defaults={'title': 'Smart Assistant Chat'}
        )

        # Get all messages for this session
        serializer = ChatSessionSerializer(session)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def add_message(self, request):
        """Add a message to the current chat session"""
        serializer = ChatMessageCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Get or create active session
        session, created = ChatSession.objects.get_or_create(
            user=request.user,
            is_active=True,
            defaults={'title': 'Smart Assistant Chat'}
        )

        # Create the message
        message = ChatMessage.objects.create(
            session=session,
            message_type=serializer.validated_data['message_type'],
            content=serializer.validated_data['content'],
            metadata=serializer.validated_data.get('metadata', {})
        )

        # Update session title based on first user message
        if created or not session.title or session.title == 'Smart Assistant Chat':
            user_messages = session.messages.filter(message_type='USER')
            if user_messages.count() == 1:
                first_msg = user_messages.first().content[:50]
                session.title = first_msg + ('...' if len(user_messages.first().content) > 50 else '')
                session.save()

        # Update session's updated_at timestamp
        session.save()

        return Response(ChatMessageSerializer(message).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def add_messages(self, request):
        """Add multiple messages at once (for batch saving)"""
        messages_data = request.data.get('messages', [])

        if not messages_data:
            return Response(
                {"error": "No messages provided"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get or create active session
        session, created = ChatSession.objects.get_or_create(
            user=request.user,
            is_active=True,
            defaults={'title': 'Smart Assistant Chat'}
        )

        created_messages = []
        for msg_data in messages_data:
            serializer = ChatMessageCreateSerializer(data=msg_data)
            if serializer.is_valid():
                message = ChatMessage.objects.create(
                    session=session,
                    message_type=serializer.validated_data['message_type'],
                    content=serializer.validated_data['content'],
                    metadata=serializer.validated_data.get('metadata', {})
                )
                created_messages.append(message)

        # Update session title if needed
        if created or not session.title or session.title == 'Smart Assistant Chat':
            user_messages = session.messages.filter(message_type='USER')
            if user_messages.exists():
                first_msg = user_messages.first().content[:50]
                session.title = first_msg + ('...' if len(user_messages.first().content) > 50 else '')
                session.save()

        session.save()  # Update timestamp

        return Response({
            "created_count": len(created_messages),
            "messages": ChatMessageSerializer(created_messages, many=True).data
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def clear(self, request):
        """Clear chat history and start a new session"""
        # Deactivate current session
        ChatSession.objects.filter(user=request.user, is_active=True).update(is_active=False)

        # Create a new active session
        new_session = ChatSession.objects.create(
            user=request.user,
            is_active=True,
            title='Smart Assistant Chat'
        )

        return Response({
            "message": "Chat history cleared",
            "session_id": str(new_session.id)
        })

    @action(detail=False, methods=['get'])
    def history(self, request):
        """Get all past chat sessions for the user"""
        sessions = ChatSession.objects.filter(user=request.user).order_by('-updated_at')[:20]
        serializer = ChatSessionSerializer(sessions, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def session(self, request, pk=None):
        """Get a specific chat session by ID"""
        try:
            session = ChatSession.objects.get(pk=pk, user=request.user)
            serializer = ChatSessionSerializer(session)
            return Response(serializer.data)
        except ChatSession.DoesNotExist:
            return Response(
                {"error": "Session not found"},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate a specific chat session (switch to it)"""
        try:
            session = ChatSession.objects.get(pk=pk, user=request.user)
            session.is_active = True
            session.save()  # This will deactivate other sessions
            serializer = ChatSessionSerializer(session)
            return Response(serializer.data)
        except ChatSession.DoesNotExist:
            return Response(
                {"error": "Session not found"},
                status=status.HTTP_404_NOT_FOUND
            )


class AnalyticsHistoryViewSet(viewsets.ViewSet):
    """ViewSet for managing analytics query history"""
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def current(self, request):
        """Get or create the current active analytics session with all messages"""
        from .models import AnalyticsSession
        from .serializers import AnalyticsSessionSerializer

        # Get or create active session for the user
        session, created = AnalyticsSession.objects.get_or_create(
            user=request.user,
            is_active=True,
            defaults={'title': 'Analytics Query'}
        )

        # Get all messages for this session
        serializer = AnalyticsSessionSerializer(session)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def add_message(self, request):
        """Add a message to the current analytics session"""
        from .models import AnalyticsSession, AnalyticsMessage
        from .serializers import AnalyticsMessageCreateSerializer, AnalyticsMessageSerializer

        serializer = AnalyticsMessageCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Get or create active session
        session, created = AnalyticsSession.objects.get_or_create(
            user=request.user,
            is_active=True,
            defaults={'title': 'Analytics Query'}
        )

        # Create the message
        message = AnalyticsMessage.objects.create(
            session=session,
            message_type=serializer.validated_data['message_type'],
            content=serializer.validated_data['content'],
            metadata=serializer.validated_data.get('metadata', {})
        )

        # Update session title based on first user message
        if created or not session.title or session.title == 'Analytics Query':
            user_messages = session.messages.filter(message_type='USER')
            if user_messages.count() == 1:
                first_msg = user_messages.first().content[:50]
                session.title = first_msg + ('...' if len(user_messages.first().content) > 50 else '')
                session.save()

        # Update session's updated_at timestamp
        session.save()

        return Response(AnalyticsMessageSerializer(message).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def add_messages(self, request):
        """Add multiple messages at once (for batch saving)"""
        from .models import AnalyticsSession, AnalyticsMessage
        from .serializers import AnalyticsMessageCreateSerializer, AnalyticsMessageSerializer

        messages_data = request.data.get('messages', [])

        if not messages_data:
            return Response(
                {"error": "No messages provided"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get or create active session
        session, created = AnalyticsSession.objects.get_or_create(
            user=request.user,
            is_active=True,
            defaults={'title': 'Analytics Query'}
        )

        created_messages = []
        for msg_data in messages_data:
            serializer = AnalyticsMessageCreateSerializer(data=msg_data)
            if serializer.is_valid():
                message = AnalyticsMessage.objects.create(
                    session=session,
                    message_type=serializer.validated_data['message_type'],
                    content=serializer.validated_data['content'],
                    metadata=serializer.validated_data.get('metadata', {})
                )
                created_messages.append(message)

        # Update session title if needed
        if created or not session.title or session.title == 'Analytics Query':
            user_messages = session.messages.filter(message_type='USER')
            if user_messages.exists():
                first_msg = user_messages.first().content[:50]
                session.title = first_msg + ('...' if len(user_messages.first().content) > 50 else '')
                session.save()

        session.save()  # Update timestamp

        return Response({
            "created_count": len(created_messages),
            "messages": AnalyticsMessageSerializer(created_messages, many=True).data
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def clear(self, request):
        """Clear analytics history and start a new session"""
        from .models import AnalyticsSession

        # Deactivate current session
        AnalyticsSession.objects.filter(user=request.user, is_active=True).update(is_active=False)

        # Create a new active session
        new_session = AnalyticsSession.objects.create(
            user=request.user,
            is_active=True,
            title='Analytics Query'
        )

        return Response({
            "message": "Analytics history cleared",
            "session_id": str(new_session.id)
        })

    @action(detail=False, methods=['get'])
    def history(self, request):
        """Get all past analytics sessions for the user"""
        from .models import AnalyticsSession
        from .serializers import AnalyticsSessionSerializer

        sessions = AnalyticsSession.objects.filter(user=request.user).order_by('-updated_at')[:20]
        serializer = AnalyticsSessionSerializer(sessions, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def session(self, request, pk=None):
        """Get a specific analytics session by ID"""
        from .models import AnalyticsSession
        from .serializers import AnalyticsSessionSerializer

        try:
            session = AnalyticsSession.objects.get(pk=pk, user=request.user)
            serializer = AnalyticsSessionSerializer(session)
            return Response(serializer.data)
        except AnalyticsSession.DoesNotExist:
            return Response(
                {"error": "Analytics session not found"},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate a specific analytics session (switch to it)"""
        from .models import AnalyticsSession
        from .serializers import AnalyticsSessionSerializer

        try:
            session = AnalyticsSession.objects.get(pk=pk, user=request.user)
            session.is_active = True
            session.save()  # This will deactivate other sessions
            serializer = AnalyticsSessionSerializer(session)
            return Response(serializer.data)
        except AnalyticsSession.DoesNotExist:
            return Response(
                {"error": "Analytics session not found"},
                status=status.HTTP_404_NOT_FOUND
            )