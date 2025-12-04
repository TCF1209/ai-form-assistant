"""
AI Integration Services for OpenAI API
Handles all AI-powered features including form generation, conversational assistance, and NL analytics
"""
import os
import json
import logging
from typing import Dict, List, Optional, Any
from django.conf import settings
from django.core.cache import cache

# Try to import openai, but don't fail if it's not installed
try:
    import openai
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    OpenAI = None
    logger = logging.getLogger(__name__)
    logger.warning("OpenAI package not installed. AI features will use mock data.")

logger = logging.getLogger(__name__)


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
        """Generate cache key for prompt"""
        return f"openai:{hash(prompt + context)}"

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

For valid form requests, return a JSON object with this structure:
{
    "title": "Form Title",
    "description": "Brief form description",
    "fields": [
        {
            "name": "field_name",
            "label": "Field Label",
            "type": "text|number|email|date|select|checkbox|radio|file|textarea",
            "required": true/false,
            "validation": {
                "min": number (for number fields),
                "max": number (for number fields),
                "minLength": number (for text fields),
                "maxLength": number (for text fields),
                "pattern": "regex pattern" (optional)
            },
            "options": ["option1", "option2"] (for select/radio/checkbox),
            "placeholder": "placeholder text",
            "helpText": "help text for the field"
        }
    ],
    "workflow": {
        "requiresApproval": true/false,
        "approvalSteps": ["step1", "step2"]
    }
}"""

        user_prompt = f"Create a form based on this description: {description}"
        if context:
            user_prompt += f"\nAdditional context: {json.dumps(context)}"

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        response = self._make_api_call(messages, temperature=0.3)
        if not response:
            return None

        try:
            # Parse JSON from response
            form_structure = json.loads(response)
            # Cache for 1 hour
            cache.set(cache_key, form_structure, 3600)
            return form_structure
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI response: {e}")
            return None

    def assist_form_filling(self, conversation: List[Dict], form_structure: Dict) -> Dict:
        """
        Provide conversational assistance for form filling

        Args:
            conversation: List of conversation messages
            form_structure: The form structure being filled

        Returns:
            Dict with AI response and extracted field values
        """
        system_prompt = f"""You are a helpful assistant guiding users through form completion.
        The form has these fields: {json.dumps(form_structure.get('fields', []))}

        Help the user fill out the form conversationally. Extract field values from their responses.
        Return a JSON object with:
        {{
            "message": "Your response to the user",
            "extractedFields": {{
                "field_name": "extracted_value"
            }},
            "nextField": "field_name_to_ask_about_next" (or null if done),
            "confidence": 0.0-1.0
        }}"""

        messages = [{"role": "system", "content": system_prompt}] + conversation

        response = self._make_api_call(messages, temperature=0.5)
        if not response:
            return {
                "message": "I'm having trouble understanding. Could you please rephrase?",
                "extractedFields": {},
                "nextField": None,
                "confidence": 0
            }

        try:
            return json.loads(response)
        except json.JSONDecodeError:
            # If response is not JSON, return as message only
            return {
                "message": response,
                "extractedFields": {},
                "nextField": None,
                "confidence": 0.5
            }

    def translate_nl_query(self, query: str, available_data: Optional[Dict] = None) -> Dict:
        """
        Translate natural language query to database operations

        Args:
            query: Natural language query
            available_data: Information about available data/fields

        Returns:
            Dict with query interpretation and visualization suggestions
        """
        system_prompt = """You are a data analytics assistant. Translate natural language queries to database operations.
        Return a JSON object with:
        {
            "interpretation": "What the user is asking for",
            "filters": {
                "date_range": {"start": "YYYY-MM-DD", "end": "YYYY-MM-DD"},
                "department": "department_name",
                "form_type": "form_type",
                "status": "status"
            },
            "aggregation": "count|sum|average|group_by",
            "groupBy": "field_name",
            "visualization": "bar|line|pie|table",
            "timeframe": "day|week|month|year"
        }"""

        user_prompt = f"Query: {query}"
        if available_data:
            user_prompt += f"\nAvailable data context: {json.dumps(available_data)}"

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        response = self._make_api_call(messages, temperature=0.2)
        if not response:
            return {
                "interpretation": "Unable to process query",
                "filters": {},
                "error": "AI service unavailable"
            }

        try:
            return json.loads(response)
        except json.JSONDecodeError:
            return {
                "interpretation": response,
                "filters": {},
                "error": "Failed to parse response"
            }

    def generate_recommendations(self, user_data: Dict, context: Dict) -> List[Dict]:
        """
        Generate intelligent recommendations based on user behavior and context

        Args:
            user_data: User's historical data and preferences
            context: Current context (department, role, recent actions)

        Returns:
            List of recommendations
        """
        system_prompt = """You are an intelligent recommendation system. Based on user data and context,
        suggest relevant forms, optimize workflows, or identify patterns.
        Return a JSON array of recommendations:
        [
            {
                "type": "form|workflow|action",
                "title": "Recommendation title",
                "description": "Why this is recommended",
                "priority": "high|medium|low",
                "action": "specific_action_to_take"
            }
        ]"""

        user_prompt = f"""User data: {json.dumps(user_data)}
        Context: {json.dumps(context)}

        Provide intelligent recommendations for this user."""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        response = self._make_api_call(messages, temperature=0.4)
        if not response:
            return []

        try:
            return json.loads(response)
        except json.JSONDecodeError:
            return []

    def optimize_workflow(self, workflow_data: Dict, performance_metrics: Dict) -> Dict:
        """
        Suggest workflow optimizations based on performance data

        Args:
            workflow_data: Current workflow configuration
            performance_metrics: Historical performance data

        Returns:
            Dict with optimization suggestions
        """
        system_prompt = """You are a workflow optimization expert. Analyze workflow performance and suggest improvements.
        Return a JSON object with:
        {
            "bottlenecks": ["identified bottlenecks"],
            "suggestions": [
                {
                    "area": "specific area",
                    "current": "current state",
                    "suggested": "suggested improvement",
                    "impact": "expected impact",
                    "priority": "high|medium|low"
                }
            ],
            "estimated_improvement": "percentage or time saved"
        }"""

        user_prompt = f"""Workflow: {json.dumps(workflow_data)}
        Performance metrics: {json.dumps(performance_metrics)}

        Analyze and suggest optimizations."""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        response = self._make_api_call(messages, temperature=0.3)
        if not response:
            return {
                "bottlenecks": [],
                "suggestions": [],
                "error": "Unable to analyze workflow"
            }

        try:
            return json.loads(response)
        except json.JSONDecodeError:
            return {
                "bottlenecks": [],
                "suggestions": [],
                "error": "Failed to parse optimization results"
            }

    def parse_analytics_intent(self, query: str, available_context: Dict) -> Dict:
        """
        Parse natural language analytics query to understand user intent

        Step 1 of the Hybrid Approach: AI interprets what the user is asking for

        Args:
            query: Natural language query from user
            available_context: Context about available data (forms, departments, etc.)

        Returns:
            Dict with structured intent that backend can use to query database
        """
        system_prompt = """You are an analytics query interpreter for a form management system.
Your job is to understand what the user is asking and return a structured intent that can be used to query a database.

IMPORTANT: You must return ONLY a valid JSON object, no other text.

The system has:
- Form submissions with statuses: DRAFT, SUBMITTED, IN_REVIEW, APPROVED, REJECTED, CANCELLED
- Forms belonging to departments
- Time-based data (submitted_at, updated_at dates)

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
        "time_range": "today|this_week|last_week|this_month|last_month|this_year|last_6_months" or null
    },
    "group_by": "status|department|form|month|week" or null,
    "aggregation": "count|sum|average" or null,
    "visualization": "number|bar|pie|line|table|cards",
    "sort": "asc|desc" or null,
    "limit": number or null,
    "interpretation": "A user-friendly description of what they're asking. This will be shown to the user, so make it natural and helpful."
}

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
- "How many leave requests last month?" → query_type: "count", filters: {form_type: "leave", time_range: "last_month"}, interpretation: "Counting leave requests from last month"
- "Show pending forms by department" → query_type: "breakdown", group_by: "department", filters: {status: ["SUBMITTED", "IN_REVIEW"]}, interpretation: "Breaking down pending forms by department"
- "How many forms this month?" → query_type: "count", filters: {time_range: "this_month"}, interpretation: "Counting all form submissions this month"
- "thank you" → is_casual_message: true, interpretation: null
- "asdfghj" → is_gibberish: true, interpretation: null
"""

        user_prompt = f"""User query: "{query}"

Available context:
- Departments: {json.dumps(available_context.get('departments', []))}
- Form types: {json.dumps(available_context.get('form_types', []))}
- User role: {available_context.get('user_role', 'USER')}
- User department: {available_context.get('user_department', 'Not specified')}

Parse this query and return the structured intent as JSON."""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        response = self._make_api_call(messages, temperature=0.1)

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
            # Clean up response - remove markdown code blocks if present
            clean_response = response.strip()
            if clean_response.startswith('```json'):
                clean_response = clean_response[7:]
            if clean_response.startswith('```'):
                clean_response = clean_response[3:]
            if clean_response.endswith('```'):
                clean_response = clean_response[:-3]
            clean_response = clean_response.strip()

            return json.loads(clean_response)
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
                "error": "Failed to generate form structure. Please try again."
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
                "error": "Could not generate form fields from the description. Please provide more details.",
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

        # Check minimum length
        if not description or len(description.strip()) < 5:
            return {
                'valid': False,
                'error': 'Description is too short. Please provide more details.'
            }

        # Check maximum length
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
        """Map AI field types to our system's field types"""
        type_mapping = {
            "text": "short_text",
            "textarea": "long_text",
            "number": "number",
            "email": "email",
            "date": "date",
            "select": "dropdown",
            "checkbox": "checkbox",
            "radio": "radio",
            "file": "file_upload"
        }
        return type_mapping.get(ai_type, "short_text")

    def enhance_existing_form(self, form_data: Dict) -> Dict:
        """
        Enhance an existing form with AI suggestions

        Args:
            form_data: Current form configuration

        Returns:
            Enhanced form with AI suggestions
        """
        description = f"Enhance this form: {form_data.get('title')}. Current fields: {[f['label'] for f in form_data.get('fields', [])]}"

        suggestions = self.ai_service.generate_form_structure(description, {"existing_form": form_data})

        if not suggestions:
            return form_data

        # Add suggested fields that don't exist
        existing_names = {f['name'] for f in form_data.get('fields', [])}
        for field in suggestions.get('fields', []):
            if field['name'] not in existing_names:
                field['suggested'] = True  # Mark as AI suggestion
                form_data.setdefault('suggested_fields', []).append(field)

        return form_data


class ConversationalAssistant:
    """Service for conversational form filling assistance"""

    def __init__(self):
        self.ai_service = OpenAIService()
        self.sessions = {}  # Store conversation sessions

    def start_session(self, user_id: str, form_id: str, form_structure: Dict) -> str:
        """Start a new conversation session"""
        session_id = f"{user_id}_{form_id}_{hash(str(form_structure))}"
        self.sessions[session_id] = {
            "user_id": user_id,
            "form_id": form_id,
            "form_structure": form_structure,
            "conversation": [],
            "filled_fields": {},
            "current_field_index": 0
        }

        # Generate initial greeting
        greeting = self._generate_greeting(form_structure)
        self.sessions[session_id]["conversation"].append({
            "role": "assistant",
            "content": greeting
        })

        return session_id

    def _generate_greeting(self, form_structure: Dict) -> str:
        """Generate initial greeting for form filling"""
        form_title = form_structure.get("title", "this form")
        field_count = len(form_structure.get("fields", []))

        return f"""Hello! I'll help you complete {form_title}.
        This form has {field_count} fields to fill out.
        You can describe your information naturally, and I'll help extract the relevant details.
        Let's start - what brings you here today?"""

    def process_message(self, session_id: str, user_message: str) -> Dict:
        """Process user message in conversation"""
        if session_id not in self.sessions:
            return {
                "error": "Session not found",
                "message": "Please start a new session"
            }

        session = self.sessions[session_id]

        # Add user message to conversation
        session["conversation"].append({
            "role": "user",
            "content": user_message
        })

        # Get AI response
        response = self.ai_service.assist_form_filling(
            session["conversation"],
            session["form_structure"]
        )

        # Update filled fields
        if response.get("extractedFields"):
            session["filled_fields"].update(response["extractedFields"])

        # Add AI response to conversation
        session["conversation"].append({
            "role": "assistant",
            "content": response["message"]
        })

        # Check completion
        required_fields = [f["name"] for f in session["form_structure"]["fields"] if f.get("required")]
        filled_required = all(field in session["filled_fields"] for field in required_fields)

        return {
            "message": response["message"],
            "filled_fields": session["filled_fields"],
            "progress": len(session["filled_fields"]) / len(session["form_structure"]["fields"]),
            "is_complete": filled_required,
            "next_field": response.get("nextField"),
            "confidence": response.get("confidence", 0.5)
        }

    def get_session_data(self, session_id: str) -> Dict:
        """Get current session data"""
        return self.sessions.get(session_id, {})

    def end_session(self, session_id: str) -> Dict:
        """End conversation session and return filled data"""
        if session_id not in self.sessions:
            return {}

        session_data = self.sessions[session_id]
        filled_data = session_data["filled_fields"]

        # Clean up session
        del self.sessions[session_id]

        return filled_data


# Initialize singleton instances
_openai_service = None
_form_generation_service = None
_conversational_assistant = None


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


def get_conversational_assistant() -> ConversationalAssistant:
    """Get singleton conversational assistant"""
    global _conversational_assistant
    if _conversational_assistant is None:
        _conversational_assistant = ConversationalAssistant()
    return _conversational_assistant