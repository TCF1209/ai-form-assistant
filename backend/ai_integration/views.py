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

        # Prepare forms data for AI analysis
        forms_data = []
        for form in forms:
            forms_data.append({
                "id": str(form.id),
                "name": form.name,
                "description": form.description or "",
                "department": form.department.name if form.department else "General",
                "code": form.code
            })

        # Use OpenAI to find the best matching form
        ai_service = get_openai_service()

        if ai_service.client:
            # AI-powered search
            system_prompt = """You are a form search assistant. Based on the user's query, find the most relevant form(s) from the available forms.

Return a JSON object with:
{
    "best_match_id": "form_id or null if no good match",
    "confidence": 0.0-1.0,
    "reasoning": "Brief explanation of why this form matches",
    "alternative_ids": ["other", "relevant", "form_ids"],
    "response_message": "A friendly message to the user about what you found"
}

If the query is a greeting or not related to forms, return:
{
    "best_match_id": null,
    "confidence": 0,
    "reasoning": "Query is not a form search request",
    "alternative_ids": [],
    "response_message": "Appropriate response to the user"
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
                        "reasoning": ai_result.get('reasoning', '')
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
            "confidence": 0.7 if scored_forms else 0
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
            "phone": getattr(user, 'phone', '') or "",
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
        user_department = request.user.department if request.user.department else None

        # Generate analytics response using real database queries
        query_result = self._process_analytics_query(query, user_role, user_department)

        response_serializer = NLQueryResponseSerializer(query_result)
        return Response(response_serializer.data, status=status.HTTP_200_OK)

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

    def _process_analytics_query(self, query, user_role, user_department):
        """Process analytics query using real database data"""
        from django.db.models import Count, Avg, Q
        from django.db.models.functions import TruncMonth
        from django.utils import timezone
        from datetime import timedelta
        from users.models import Department

        # Get department info for display
        dept_name = user_department.name if user_department else None
        if user_role == 'MANAGER' and dept_name:
            dept_note = f" (showing data for {dept_name} department only)"
        else:
            dept_note = " (showing data across all departments)"

        # Keywords to detect query intent
        leave_keywords = ['leave', 'vacation', 'time off', 'absence', 'annual', 'medical', 'sick']
        pending_keywords = ['pending', 'waiting', 'awaiting', 'queue', 'unprocessed', 'in review', 'in_review']
        department_keywords = ['department', 'team', 'division', 'unit', 'group']
        count_keywords = ['how many', 'count', 'number', 'total', 'submitted', 'requests']
        time_keywords = ['month', 'week', 'last', 'this', 'today', 'yesterday', 'average', 'time']
        approval_keywords = ['approval', 'approved', 'rejected', 'review', 'processing']
        top_keywords = ['most', 'top', 'highest', 'maximum', 'best', 'popular']

        base_qs = self._get_base_queryset(user_role, user_department)
        forms_qs = self._get_forms_queryset(user_role, user_department)
        now = timezone.now()

        # Detect query type and process with real data
        if any(kw in query for kw in leave_keywords) and any(kw in query for kw in count_keywords):
            # Leave request count queries
            leave_qs = base_qs.filter(
                Q(form__name__icontains='leave') |
                Q(form__code__icontains='leave')
            )

            if 'month' in query or 'last month' in query:
                last_month_start = (now.replace(day=1) - timedelta(days=1)).replace(day=1)
                last_month_end = now.replace(day=1) - timedelta(days=1)
                count = leave_qs.filter(
                    submitted_at__gte=last_month_start,
                    submitted_at__lte=last_month_end
                ).count()

                # Get previous month for comparison
                prev_month_start = (last_month_start - timedelta(days=1)).replace(day=1)
                prev_count = leave_qs.filter(
                    submitted_at__gte=prev_month_start,
                    submitted_at__lt=last_month_start
                ).count()

                trend = ""
                if prev_count > 0:
                    change = ((count - prev_count) / prev_count) * 100
                    trend = f"+{change:.0f}%" if change > 0 else f"{change:.0f}%"

                return {
                    "interpretation": f"You're asking about leave requests submitted last month{dept_note}",
                    "filters": {"form_type": "Leave Request", "time_range": "last_month"},
                    "aggregation": "count",
                    "visualization": "number",
                    "data": [{"label": "Leave Requests (Last Month)", "value": count, "trend": trend}],
                    "summary": f"There were {count} leave requests submitted last month." + (f" This is {trend} compared to the previous month." if trend else "")
                }
            elif 'week' in query:
                week_start = now - timedelta(days=now.weekday())
                count = leave_qs.filter(submitted_at__gte=week_start).count()
                return {
                    "interpretation": f"You're asking about leave requests submitted this week{dept_note}",
                    "filters": {"form_type": "Leave Request", "time_range": "this_week"},
                    "aggregation": "count",
                    "visualization": "number",
                    "data": [{"label": "Leave Requests (This Week)", "value": count}],
                    "summary": f"There have been {count} leave requests submitted this week so far."
                }
            else:
                count = leave_qs.count()
                return {
                    "interpretation": f"You're asking about total leave requests{dept_note}",
                    "filters": {"form_type": "Leave Request"},
                    "aggregation": "count",
                    "visualization": "number",
                    "data": [{"label": "Total Leave Requests", "value": count}],
                    "summary": f"There are {count} leave requests in total."
                }

        elif any(kw in query for kw in pending_keywords):
            # Pending/In Review forms queries
            pending_statuses = ['SUBMITTED', 'IN_REVIEW']

            if any(kw in query for kw in department_keywords):
                # Group by department
                dept_data = []
                departments = Department.objects.filter(is_active=True)
                if user_role == 'MANAGER' and user_department:
                    departments = departments.filter(id=user_department.id)

                for dept in departments:
                    count = FormSubmission.objects.filter(
                        form__department=dept,
                        status__in=pending_statuses
                    ).count()
                    if count > 0:
                        dept_data.append({"department": dept.name, "pending": count})

                dept_data.sort(key=lambda x: x['pending'], reverse=True)

                return {
                    "interpretation": f"You're asking about pending forms by department{dept_note}",
                    "filters": {"status": "PENDING"},
                    "aggregation": "group_by_department",
                    "visualization": "bar",
                    "data": dept_data if dept_data else [{"department": "No data", "pending": 0}],
                    "summary": f"Here's the breakdown of pending forms across {len(dept_data)} departments."
                }
            else:
                pending_count = base_qs.filter(status__in=pending_statuses).count()
                in_review = base_qs.filter(status='IN_REVIEW').count()
                return {
                    "interpretation": f"You're asking about pending forms{dept_note}",
                    "filters": {"status": "PENDING"},
                    "aggregation": "count",
                    "visualization": "number",
                    "data": [
                        {"label": "Pending Forms", "value": pending_count},
                        {"label": "In Review", "value": in_review}
                    ],
                    "summary": f"There are {pending_count} forms currently pending review ({in_review} are actively being reviewed)."
                }

        elif any(kw in query for kw in top_keywords) and any(kw in query for kw in department_keywords):
            # Department comparison queries
            dept_data = []
            departments = Department.objects.filter(is_active=True)

            for dept in departments:
                count = FormSubmission.objects.filter(form__department=dept).count()
                dept_data.append({"department": dept.name, "submissions": count})

            dept_data.sort(key=lambda x: x['submissions'], reverse=True)

            if dept_data:
                top_dept = dept_data[0]
                summary = f"The {top_dept['department']} department leads with {top_dept['submissions']} submissions."
            else:
                summary = "No submission data available."

            return {
                "interpretation": f"You're asking which department has the most submissions{dept_note}",
                "filters": {"group_by": "department"},
                "aggregation": "count_by_department",
                "visualization": "bar",
                "data": dept_data if dept_data else [{"department": "No data", "submissions": 0}],
                "summary": summary
            }

        elif any(kw in query for kw in approval_keywords) and any(kw in query for kw in time_keywords):
            # Approval time analytics - calculate from submitted_at to updated_at for approved forms
            approved_qs = base_qs.filter(status='APPROVED', submitted_at__isnull=False)

            times = []
            for sub in approved_qs:
                if sub.submitted_at and sub.updated_at:
                    diff = (sub.updated_at - sub.submitted_at).total_seconds() / 86400  # days
                    times.append(diff)

            if times:
                avg_time = round(sum(times) / len(times), 1)
                min_time = round(min(times), 1)
                max_time = round(min(max(times), 30), 1)  # Cap at 30 days for display
            else:
                avg_time, min_time, max_time = 0, 0, 0

            return {
                "interpretation": f"You're asking about average approval time{dept_note}",
                "filters": {"metric": "approval_time"},
                "aggregation": "average",
                "visualization": "number",
                "data": [
                    {"label": "Average Approval Time", "value": avg_time, "unit": "days"},
                    {"label": "Fastest", "value": min_time, "unit": "days"},
                    {"label": "Slowest", "value": max_time, "unit": "days"}
                ],
                "summary": f"The average approval time is {avg_time} days. Fastest: {min_time} days, Slowest: {max_time} days." if times else "No approved submissions to calculate approval time."
            }

        elif 'trend' in query or 'over time' in query or 'history' in query:
            # Trend queries - last 6 months
            trend_data = []
            for i in range(5, -1, -1):
                month_date = now - timedelta(days=i*30)
                month_start = month_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                if i > 0:
                    next_month = (month_date + timedelta(days=32)).replace(day=1)
                else:
                    next_month = now + timedelta(days=1)

                month_name = month_start.strftime('%b')
                submissions = base_qs.filter(
                    submitted_at__gte=month_start,
                    submitted_at__lt=next_month
                ).count()
                approved = base_qs.filter(
                    submitted_at__gte=month_start,
                    submitted_at__lt=next_month,
                    status='APPROVED'
                ).count()
                trend_data.append({"month": month_name, "submissions": submissions, "approved": approved})

            return {
                "interpretation": f"You're asking about submission trends over time{dept_note}",
                "filters": {"time_range": "6_months"},
                "aggregation": "time_series",
                "visualization": "line",
                "data": trend_data,
                "summary": "Here's the submission trend over the last 6 months."
            }

        elif 'status' in query or 'breakdown' in query:
            # Status breakdown
            status_counts = base_qs.values('status').annotate(count=Count('id'))
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

            # Sort by count
            data.sort(key=lambda x: x['count'], reverse=True)

            approved = next((d['count'] for d in data if d['status'] == 'Approved'), 0)
            submitted = next((d['count'] for d in data if d['status'] == 'Submitted'), 0)

            return {
                "interpretation": f"You're asking about form status breakdown{dept_note}",
                "filters": {"group_by": "status"},
                "aggregation": "count_by_status",
                "visualization": "pie",
                "data": data if data else [{"status": "No Data", "count": 0, "percentage": 0}],
                "summary": f"Out of {total} total submissions: {approved} approved, {submitted} awaiting review."
            }

        elif 'expense' in query or 'claim' in query:
            # Expense related queries
            expense_qs = base_qs.filter(
                Q(form__name__icontains='expense') |
                Q(form__code__icontains='expense') |
                Q(form__name__icontains='claim') |
                Q(form__code__icontains='claim')
            )
            claim_count = expense_qs.count()

            return {
                "interpretation": f"You're asking about expense claims{dept_note}",
                "filters": {"form_type": "Expense Claim"},
                "aggregation": "count",
                "visualization": "number",
                "data": [
                    {"label": "Total Claims", "value": claim_count},
                    {"label": "Approved", "value": expense_qs.filter(status='APPROVED').count()},
                    {"label": "Pending", "value": expense_qs.filter(status__in=['SUBMITTED', 'IN_REVIEW']).count()}
                ],
                "summary": f"There are {claim_count} expense claims in the system."
            }

        else:
            # Default: general statistics from real data
            total_submissions = base_qs.count()
            total_forms = forms_qs.filter(status='ACTIVE').count()
            pending = base_qs.filter(status__in=['SUBMITTED', 'IN_REVIEW']).count()
            approved = base_qs.filter(status='APPROVED').count()

            approval_rate = round((approved / total_submissions * 100)) if total_submissions > 0 else 0

            return {
                "interpretation": f"Here's an overview of the forms system{dept_note}",
                "filters": {},
                "aggregation": "overview",
                "visualization": "cards",
                "data": [
                    {"label": "Total Submissions", "value": total_submissions, "icon": "document"},
                    {"label": "Active Forms", "value": total_forms, "icon": "form"},
                    {"label": "Pending Review", "value": pending, "icon": "clock"},
                    {"label": "Approval Rate", "value": f"{approval_rate}%", "icon": "check"}
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