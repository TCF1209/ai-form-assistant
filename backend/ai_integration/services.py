"""
AI Integration Services for OpenAI API
Handles all AI-powered features including form generation, conversational assistance, and NL analytics
"""
import os
import json
import logging
from typing import Dict, List, Optional
from django.conf import settings
from django.core.cache import cache

# Try to import openai, but don't fail if it's not installed
try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    OpenAI = None
    logger = logging.getLogger(__name__)
    logger.warning("OpenAI package not installed. AI features will use mock data.")

logger = logging.getLogger(__name__)


def parse_json_response(text):
    """Parse a JSON reply from the model, tolerating a ```json ... ``` fence around it."""
    cleaned = text.strip()
    if cleaned.startswith('```'):
        cleaned = cleaned.split('\n', 1)[1] if '\n' in cleaned else cleaned[3:]
        if cleaned.rstrip().endswith('```'):
            cleaned = cleaned.rstrip()[:-3]
    return json.loads(cleaned.strip())


class OpenAIService:
    """Service for handling OpenAI API interactions"""

    def __init__(self):
        """Initialize OpenAI client with API key from settings"""
        self.api_key = getattr(settings, 'OPENAI_API_KEY', None)
        if not self.api_key:
            self.api_key = os.environ.get('OPENAI_API_KEY')

        if OPENAI_AVAILABLE and self.api_key and OpenAI:
            self.client = OpenAI(api_key=self.api_key)
            self.model = getattr(settings, 'OPENAI_MODEL', 'gpt-3.5-turbo')
            self.max_tokens = getattr(settings, 'OPENAI_MAX_TOKENS', 2000)
            self.temperature = getattr(settings, 'OPENAI_TEMPERATURE', 0.7)
        else:
            if not OPENAI_AVAILABLE:
                logger.warning("OpenAI package not installed - using mock mode")
            elif not self.api_key:
                logger.warning("OpenAI API key not configured")
            self.client = None

    def _get_cache_key(self, prompt: str, context: str = "") -> str:
        """Generate cache key for prompt using secure hash"""
        import hashlib
        content = (prompt + context).encode('utf-8')
        return f"openai:{hashlib.sha256(content).hexdigest()[:32]}"

    def _make_api_call(self, messages: List[Dict], **kwargs) -> Optional[str]:
        """Make API call to OpenAI with error handling"""
        if not self.client:
            logger.error("OpenAI client not initialized")
            return None

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=kwargs.get('max_tokens', self.max_tokens),
                temperature=kwargs.get('temperature', self.temperature),
                **{k: v for k, v in kwargs.items() if k not in ['max_tokens', 'temperature']}
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"OpenAI API error: {str(e)}")
            return None

    def generate_form_structure(self, description: str, context: Optional[Dict] = None) -> Optional[Dict]:
        """
        Generate form structure from natural language description

        Args:
            description: Natural language description of the form
            context: Additional context (department, existing forms, etc.)

        Returns:
            Dict containing form structure or None if error
        """
        cache_key = self._get_cache_key(description, str(context))
        cached_result = cache.get(cache_key)
        if cached_result:
            return cached_result

        system_prompt = """You are an expert form designer. Generate a complete form structure from the description.

IMPORTANT VALIDATION RULES:
1. If the input contains inappropriate language, profanity, or offensive content, return:
   {"error": "inappropriate_content", "message": "Please provide an appropriate form description without offensive language."}

2. If the input is gibberish, random characters, or meaningless text (like "asdfgh", "qwerty", etc.), return:
   {"error": "invalid_input", "message": "Please provide a valid description of the form you want to create."}

3. If the input is a greeting or casual message (like "hello", "hi", "how are you"), return:
   {"error": "not_form_related", "message": "Please describe what kind of form you would like to create. For example: 'Create a leave application form' or 'Create an IT support ticket form'."}

4. If the input is unclear but seems like a legitimate attempt, make reasonable assumptions and generate a basic form.

MULTI-LANGUAGE INPUT - ENGLISH OUTPUT:
- Accept input in ANY language (English, Chinese, Malay, etc.)
- ALWAYS generate form content in ENGLISH regardless of input language
- Form title, description, field labels, options, and help text MUST be in ENGLISH
- Example: Input "创建请假申请表" → Output title: "Leave Application Form" (ENGLISH)
- Example: Input "Buat borang cuti" → Output title: "Leave Application Form" (ENGLISH)

For valid form requests, return a JSON object with this structure:
{
    "title": "Form Title",
    "description": "Brief form description",
    "fields": [
        {
            "name": "field_name_in_english_lowercase_with_underscores",
            "label": "Field Label in English",
            "type": "text|number|email|date|time|phone|url|select|multiselect|checkbox|radio|file|textarea",
            "required": true/false,
            "validation": {
                "min": number (for number fields),
                "max": number (for number fields),
                "minLength": number (for text fields),
                "maxLength": number (for text fields),
                "pattern": "regex pattern" (optional)
            },
            "options": ["Option1 in English", "Option2 in English"] (for select/radio/multiselect),
            "placeholder": "Placeholder text in English",
            "helpText": "Help text in English",
            "conditions": [
                {
                    "field": "name_of_dependent_field",
                    "operator": "equals|not_equals|contains|is_empty|is_not_empty",
                    "value": "value to compare"
                }
            ]
        }
    ],
    "workflow": {
        "requiresApproval": true/false,
        "approvalSteps": ["step1", "step2"]
    }
}

CONDITIONAL LOGIC GUIDELINES:
- Use "conditions" to show/hide fields based on other field values
- Common patterns:
  - Show "Other" text field when user selects "Other" in a dropdown
  - Show "Reason" field when leave type is "Emergency" or "Medical"
  - Show additional fields based on yes/no answers
- Only add conditions when logically appropriate (don't overuse)
- A field with conditions will only appear when ALL conditions are met

FIELD TYPE GUIDELINES:
- text: Short single-line text input
- textarea: Long multi-line text input
- number: Numeric input
- email: Email address
- date: Date picker
- time: Time picker
- phone: Phone number
- url: Web URL
- select: Single-choice dropdown
- multiselect: Multiple-choice selection
- radio: Radio buttons (single choice)
- checkbox: Checkbox (yes/no or multiple options)
- file: File upload"""

        user_prompt = f"Create a form based on this description: {description}"
        if context:
            user_prompt += f"\nAdditional context: {json.dumps(context)}"

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        response = self._make_api_call(messages, temperature=0.3, response_format={"type": "json_object"})
        if not response:
            return None

        try:
            form_structure = parse_json_response(response)
            # Cache for 1 hour
            cache.set(cache_key, form_structure, 3600)
            return form_structure
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI response: {e}")
            return None


    def parse_analytics_intent(self, query: str, available_context: Dict, conversation_history: List[Dict] = None) -> Dict:
        """
        Parse natural language analytics query to understand user intent

        Step 1 of the Hybrid Approach: AI interprets what the user is asking for

        Args:
            query: Natural language query from user
            available_context: Context about available data (forms, departments, etc.)
            conversation_history: Recent conversation messages for context understanding

        Returns:
            Dict with structured intent that backend can use to query database
        """
        system_prompt = """You are an analytics query interpreter for a form management system.
Your job is to understand what the user is asking and return a structured intent that can be used to query a database.

IMPORTANT: You must return ONLY a valid JSON object, no other text.

CRITICAL - INTERPRETATION LANGUAGE (MUST FOLLOW):
1. Look ONLY at the CURRENT "User query:" to determine language for interpretation field
2. COMPLETELY IGNORE languages in conversation history - they may be different
3. If CURRENT query is in ENGLISH → interpretation MUST be in ENGLISH
4. If CURRENT query is in CHINESE → interpretation MUST be in CHINESE
5. If CURRENT query is in MALAY → interpretation MUST be in MALAY

Examples:
- Query: "Show forms from HR" → interpretation: "Showing forms from HR department" (ENGLISH)
- Query: "How about IT?" (after Malay conversation) → interpretation: "Showing data for IT department" (ENGLISH, NOT Malay)
- Query: "上个月有多少请假申请?" → interpretation: "显示上个月的请假申请数量" (CHINESE)
- Query: "Berapa banyak borang?" → interpretation: "Menunjukkan jumlah borang" (MALAY)

The system has TWO different concepts:
1. FORMS - The form templates (like "Leave Request Form", "Expense Claim Form")
   - Forms have statuses: DRAFT, ACTIVE, INACTIVE, ARCHIVED
   - "Active forms" means forms that are currently available for use (status=ACTIVE)

2. SUBMISSIONS - User submissions/entries for those forms
   - Submissions have statuses: DRAFT, SUBMITTED, IN_REVIEW, APPROVED, REJECTED, CANCELLED
   - "Pending submissions" means submissions waiting for review (SUBMITTED, IN_REVIEW)

CRITICAL DISTINCTION:
- "How many active forms?" → entity: "forms" (asking about form templates)
- "How many submissions?" → entity: "submissions" (asking about user submissions)
- "How many leave requests?" → entity: "submissions" (asking about submissions of leave forms)
- "Show forms from HR department" → entity: "forms", query_type: "list" (asking for list of form templates in HR)
- "Show submissions from HR department" → entity: "submissions" (asking for submission stats from HR)
- "What forms are available in IT?" → entity: "forms", query_type: "list" (listing forms, NOT submission stats)

CONVERSATION CONTEXT:
- If the user asks a follow-up question like "how about yesterday?" or "what about last week?", use the previous conversation to understand what entity/form type they're referring to.
- Example: If user first asks "How many leave requests last month?" and then asks "how about yesterday?", they still mean leave request submissions, just for yesterday.
- Carry forward the entity, form_type, and other relevant filters from previous messages when the current query is ambiguous.

QUERY TYPE CLASSIFICATION (VERY IMPORTANT - read carefully):

1. "trend" - Use when user asks about changes OVER TIME:
   - Keywords: "trend", "over time", "monthly", "weekly", "history", "growth", "decline"
   - Examples: "show trends", "submissions over time", "monthly submissions", "how has it changed"
   - DO NOT set group_by for trend queries, time grouping is automatic

2. "comparison" - Use when user explicitly wants to COMPARE categories:
   - Keywords: "compare", "vs", "versus", "comparison", "difference between"
   - Examples: "compare departments", "IT vs Finance", "compare submissions by department"
   - This shows a BAR CHART for side-by-side comparison

3. "breakdown" - Use when user wants to see distribution/breakdown:
   - Keywords: "breakdown", "by department", "by status", "distribution", "split"
   - Examples: "breakdown by status", "show by department", "status distribution"
   - This shows RANKING (for department/form) or DONUT (for status)

4. "count" - Use for simple counting questions:
   - Keywords: "how many", "count", "total", "number of"
   - Examples: "how many submissions", "total approved", "count leave requests"

5. "average" - Use for average/metric questions:
   - Keywords: "average", "mean", "typical", "approval time"

6. "list" - Use when user wants to see a LIST of specific items or people:
   - Keywords: "who", "which", "list", "show me", "what are", "show forms"
   - Examples: "who submitted forms last week?", "list pending submissions", "which forms were approved?"
   - IMPORTANT: "Who submitted..." should ALWAYS be query_type: "list"
   - IMPORTANT: "Show forms from [department]" → query_type: "list", entity: "forms", NO group_by
   - IMPORTANT: "What forms are in [department]?" → query_type: "list", entity: "forms", NO group_by
   - When listing FORMS (entity: "forms"), do NOT set group_by - just list the form names
   - This returns a TABLE with actual records, not aggregated counts

Analyze the user's query and return a JSON object with this structure:
{
    "query_type": "count|list|trend|comparison|breakdown|average|overview",
    "is_greeting": false,
    "is_help_request": false,
    "is_casual_message": false,
    "is_gibberish": false,
    "entity": "submissions|forms|departments|workflows",
    "filters": {
        "status": ["APPROVED", "REJECTED"] or null,
        "form_type": "leave|expense|it_support|travel|etc" or null,
        "department": "department_name" or null,
        "time_range": "today|this_week|last_week|this_month|last_month|this_year|last_6_months|yesterday" or null
    },
    "group_by": "status|department|form|month|week" or null,
    "aggregation": "count|sum|average" or null,
    "visualization": "number|bar|pie|line|table|cards|ranking|donut",
    "sort": "asc|desc" or null,
    "limit": number or null,
    "interpretation": "A user-friendly description of what they're asking. This will be shown to the user, so make it natural and helpful.",
    "confidence": 0.9
}

CONFIDENCE SCORING (0.0-1.0):
- 1.0: Crystal clear, unambiguous query (e.g., "How many approved leave requests last month?")
- 0.8-0.9: Clear query with some inference needed (e.g., "Show me leave request trends")
- 0.6-0.7: Somewhat ambiguous, had to make assumptions (e.g., "Show me the data")
- 0.4-0.5: Very ambiguous, multiple interpretations possible (e.g., "Compare them")
- 0.0-0.3: Cannot understand at all or gibberish

Set confidence based on:
- How specific the query is
- Whether you had to infer entity, filters, or time range
- Whether the query matches known patterns
- Whether conversation context was needed to understand

Special cases - set the appropriate flag to true:
- is_greeting: User says hi, hello, hey, good morning, etc.
- is_help_request: User asks what you can do, how to use, help, etc.
- is_casual_message: User says thank you, thanks, ok, alright, bye, no more questions, etc.
- is_gibberish: User types random characters or meaningless text like "asdfgh", "xxxxx", etc.

IMPORTANT for interpretation field:
- Write it as if you're talking to the user naturally
- For analytics queries: "Showing leave requests from last month" NOT "User is asking about leave requests"
- For casual messages: Leave interpretation empty or null, the system will handle the response

Examples:
- "How many active forms?" → query_type: "count", entity: "forms"
- "How many leave requests last month?" → query_type: "count", entity: "submissions", filters: {form_type: "leave", time_range: "last_month"}
- "Show submission trends" → query_type: "trend" (NOT breakdown!)
- "Submissions over time" → query_type: "trend"
- "Monthly submissions" → query_type: "trend"
- "Compare submissions by department" → query_type: "comparison" (NOT breakdown!)
- "Compare IT vs Finance" → query_type: "comparison"
- "Breakdown by status" → query_type: "breakdown", group_by: "status"
- "Show by department" → query_type: "breakdown", group_by: "department"
- "How many approved vs rejected?" → query_type: "breakdown", group_by: "status"
- "Most submitted form" → query_type: "breakdown", group_by: "form"
- "Who submitted forms last week?" → query_type: "list", entity: "submissions", filters: {time_range: "last_week"}, visualization: "table"
- "Who submitted leave requests?" → query_type: "list", entity: "submissions", filters: {form_type: "leave"}, visualization: "table"
- "List pending submissions" → query_type: "list", entity: "submissions", filters: {status: ["SUBMITTED", "IN_REVIEW"]}, visualization: "table"
- "Which forms were approved today?" → query_type: "list", entity: "submissions", filters: {status: ["APPROVED"], time_range: "today"}, visualization: "table"
- "Show forms from Administration" → query_type: "list", entity: "forms", filters: {department: "Administration"}, group_by: null, visualization: "ranking"
- "What forms are in HR department?" → query_type: "list", entity: "forms", filters: {department: "HR"}, group_by: null, visualization: "ranking"
- "List all forms" → query_type: "list", entity: "forms", group_by: null, visualization: "ranking"
- "thank you" → is_casual_message: true
"""

        # Build conversation context string
        conversation_context = ""
        if conversation_history and len(conversation_history) > 0:
            conversation_context = "\n\nRecent conversation for context:\n"
            for msg in conversation_history:
                role = msg.get('role', 'user').capitalize()
                content = msg.get('content', '')
                conversation_context += f"{role}: {content}\n"

        user_prompt = f"""User query: "{query}"

Available context:
- Departments: {json.dumps(available_context.get('departments', []))}
- Form types: {json.dumps(available_context.get('form_types', []))}
- User role: {available_context.get('user_role', 'USER')}
- User department: {available_context.get('user_department', 'Not specified')}
{conversation_context}
Parse this query and return the structured intent as JSON."""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        response = self._make_api_call(messages, temperature=0.1, response_format={"type": "json_object"})

        if not response:
            return {
                "query_type": "overview",
                "is_greeting": False,
                "is_help_request": False,
                "entity": "submissions",
                "filters": {},
                "interpretation": "Unable to parse query, showing overview",
                "error": "AI service unavailable"
            }

        try:
            return parse_json_response(response)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse analytics intent: {e}, response: {response}")
            return {
                "query_type": "overview",
                "is_greeting": False,
                "is_help_request": False,
                "entity": "submissions",
                "filters": {},
                "interpretation": "Could not parse query",
                "error": "Failed to parse AI response"
            }

    def format_analytics_response(self, query: str, data: Dict, intent: Dict) -> str:
        """
        Format analytics results into a natural language summary

        Step 3 of the Hybrid Approach: AI formats the response in natural language

        Args:
            query: Original user query
            data: The actual data retrieved from database
            intent: The parsed intent from step 1

        Returns:
            Natural language summary of the analytics results
        """
        system_prompt = """You are an analytics assistant that explains data insights in natural language.
Given the user's query and the actual data from the database, provide a clear, concise summary.

CRITICAL - RESPONSE LANGUAGE (MUST FOLLOW):
1. Look ONLY at the "User asked:" line below to determine response language
2. IGNORE any other languages in "Query interpretation" or data - they may be in wrong language
3. If user asked in ENGLISH (like "Show forms", "How many") → Respond in ENGLISH ONLY
4. If user asked in CHINESE (like "显示表单", "有多少") → Respond in CHINESE ONLY
5. If user asked in MALAY (like "Tunjukkan borang", "Berapa banyak") → Respond in MALAY ONLY

Examples:
- "Show forms from Administration" → Response: "The Administration department has 4 forms..." (ENGLISH)
- "显示管理部门的表单" → Response: "管理部门有4个表单..." (CHINESE)
- "Tunjukkan borang dari Pentadbiran" → Response: "Jabatan Pentadbiran mempunyai..." (MALAY)

Guidelines:
- Be conversational but professional
- Highlight key insights and trends
- If comparing periods, mention the change (increase/decrease)
- Keep the response to 1-3 sentences for simple queries
- For complex queries, use up to 4-5 sentences
- Don't include technical details about how data was retrieved
- Use actual numbers from the data provided
- If data is empty or zero, acknowledge it helpfully"""

        user_prompt = f"""User asked: "{query}"

Query interpretation: {intent.get('interpretation', 'General analytics query')}

Data retrieved from database:
{json.dumps(data, indent=2)}

Provide a natural language summary of these results."""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        response = self._make_api_call(messages, temperature=0.5)

        if not response:
            # Fallback to a basic summary
            return self._generate_fallback_summary(data, intent)

        return response

    def _generate_fallback_summary(self, data: Dict, intent: Dict) -> str:
        """Generate a basic summary when AI is unavailable"""
        query_type = intent.get('query_type', 'overview')

        if query_type == 'count':
            if isinstance(data, list) and len(data) > 0:
                value = data[0].get('value', 0)
                label = data[0].get('label', 'items')
                return f"There are {value} {label}."
            return "No data found for your query."

        if query_type == 'breakdown':
            if isinstance(data, list) and len(data) > 0:
                total = sum(item.get('count', item.get('submissions', item.get('pending', 0))) for item in data)
                return f"Found {total} items across {len(data)} categories."
            return "No breakdown data available."

        return "Here are the results for your query."


class FormGenerationService:
    """Service specifically for AI-powered form generation"""

    def __init__(self):
        self.ai_service = OpenAIService()

    def generate_from_description(self, description: str, department: Optional[str] = None) -> Dict:
        """
        Generate a complete form from natural language description

        Args:
            description: Natural language form description
            department: Department context for the form

        Returns:
            Complete form configuration ready for creation
        """
        # Backend validation (second line of defense)
        validation_result = self._validate_description(description)
        if not validation_result['valid']:
            return {
                "success": False,
                "error": validation_result['error'],
                "error_type": "validation_error"
            }

        context = {"department": department} if department else {}

        # Get AI-generated structure
        ai_structure = self.ai_service.generate_form_structure(description, context)

        if not ai_structure:
            return {
                "success": False,
                "error": "Unable to generate form at this time. Please try again in a moment.",
                "error_type": "ai_unavailable"
            }

        # Check if AI returned an error response (for invalid inputs)
        if ai_structure.get("error"):
            return {
                "success": False,
                "error": ai_structure.get("message", "Invalid input"),
                "error_type": ai_structure.get("error")
            }

        # Validate that we have required fields
        if not ai_structure.get("fields") or len(ai_structure.get("fields", [])) == 0:
            return {
                "success": False,
                "error": "I couldn't understand what fields to create. Try being more specific, like: 'Create a leave form with employee name, leave type, start date, end date, and reason'",
                "error_type": "insufficient_input"
            }

        # Convert AI structure to our form model format
        form_data = {
            "title": ai_structure.get("title", "Untitled Form"),
            "description": ai_structure.get("description", ""),
            "status": "DRAFT",
            "fields": []
        }

        # Convert fields to our format
        for idx, field in enumerate(ai_structure.get("fields", [])):
            form_field = {
                "name": field.get("name"),
                "label": field.get("label"),
                "field_type": self._map_field_type(field.get("type")),
                "required": field.get("required", False),
                "order": idx,
                "validation_rules": field.get("validation", {}),
                "options": field.get("options", []),
                "placeholder": field.get("placeholder", ""),
                "help_text": field.get("helpText", "")
            }
            form_data["fields"].append(form_field)

        # Add workflow suggestions
        if ai_structure.get("workflow"):
            form_data["workflow_suggestion"] = ai_structure["workflow"]

        return {
            "success": True,
            "form_data": form_data,
            "ai_confidence": 0.9  # Placeholder for confidence scoring
        }

    def _validate_description(self, description: str) -> Dict:
        """
        Backend validation for form description

        Args:
            description: The user's form description

        Returns:
            Dict with 'valid' boolean and optional 'error' message
        """
        import re

        # Check minimum length (aligned with serializer min_length=10)
        if not description or len(description.strip()) < 10:
            return {
                'valid': False,
                'error': 'Description is too short. Please provide at least 10 characters.'
            }

        # Check maximum length (aligned with serializer max_length=1000)
        if len(description) > 1000:
            return {
                'valid': False,
                'error': 'Description is too long. Please keep it under 1000 characters.'
            }

        # Basic profanity check (backend defense)
        profanity_list = ['fuck', 'shit', 'ass', 'damn', 'bitch', 'bastard']
        description_lower = description.lower()
        for word in profanity_list:
            if re.search(rf'\b{word}\b', description_lower):
                return {
                    'valid': False,
                    'error': 'Please use appropriate language in your description.'
                }

        # Check for gibberish (consonant clusters)
        if re.search(r'[bcdfghjklmnpqrstvwxyz]{7,}', description_lower):
            return {
                'valid': False,
                'error': 'Your input appears to be invalid. Please provide a proper description.'
            }

        return {'valid': True}

    def _map_field_type(self, ai_type: str) -> str:
        """Map AI field types to Django FormField.FieldType choices"""
        # AI may return lowercase types, map to Django model's FieldType choices
        type_mapping = {
            "text": "TEXT",
            "short_text": "TEXT",
            "textarea": "TEXTAREA",
            "long_text": "TEXTAREA",
            "number": "NUMBER",
            "email": "EMAIL",
            "date": "DATE",
            "time": "TIME",
            "datetime": "DATETIME",
            "phone": "PHONE",
            "url": "URL",
            "select": "SELECT",
            "dropdown": "SELECT",
            "multiselect": "MULTISELECT",
            "checkbox": "CHECKBOX",
            "radio": "RADIO",
            "file": "FILE",
            "file_upload": "FILE",
            "signature": "SIGNATURE",
            "rating": "RATING"
        }
        # Handle case-insensitive matching
        ai_type_lower = ai_type.lower() if ai_type else "text"
        return type_mapping.get(ai_type_lower, "TEXT")


# Initialize singleton instances
_openai_service = None
_form_generation_service = None

def get_openai_service() -> OpenAIService:
    """Get singleton OpenAI service instance"""
    global _openai_service
    if _openai_service is None:
        _openai_service = OpenAIService()
    return _openai_service


def get_form_generation_service() -> FormGenerationService:
    """Get singleton form generation service"""
    global _form_generation_service
    if _form_generation_service is None:
        _form_generation_service = FormGenerationService()
    return _form_generation_service

