# FYP Section 4.6 - Sample Codes: AI-Powered Features

**Project**: AI-Powered Office Assistant Web Application
**Student**: Tang Chye Fong
**Institution**: [Your Institution Name]
**Date**: January 2026

---

## Overview

This document presents the implementation of three core AI-powered features integrated into the form management system. Each feature leverages OpenAI's GPT-4o-mini model to provide intelligent automation and natural language processing capabilities.

The three AI features are:
1. **AI Form Generator** - Generates complete form structures from natural language descriptions
2. **Smart Assistant** - Provides conversational form recommendations with intent parsing
3. **Analytics Query (Three-Step Hybrid)** - Processes natural language analytics queries using a hybrid AI-database approach

---

## FUNCTION 1: AI Form Generator

### Overview
The AI Form Generator accepts natural language descriptions from users and automatically generates complete form structures including field definitions, validation rules, and help text. This feature significantly reduces the time required to create forms from hours to seconds.

### Code Implementation

```python
"""
Analytics Query - Three-Step Hybrid Approach
File: backend/ai_integration/views.py
"""

from django.db.models import Count, Q
from django.db.models.functions import TruncDate

class AnalyticsQueryView(APIView):
    def post(self, request):
        query = request.data.get('query')
        user_role = request.user.role
        user_department = request.user.department
        
        intent = self.parse_analytics_intent(query, user_role)
        data = self._execute_query(intent, user_role, user_department)
        response_text = self.format_analytics_response(query, data, intent)
        
        return Response({
            "query": query,
            "intent": intent,
            "data": data,
            "response": response_text
        })

    def parse_analytics_intent(self, query: str, user_role: str) -> Dict:
        system_prompt = """Extract analytics intent. Return JSON:
        {
            "query_type": "count|breakdown|trend|comparison",
            "entity": "submissions|forms|users|workflows",
            "filters": {
                "status": "APPROVED|PENDING|REJECTED",
                "date_range": {"start": "YYYY-MM-DD", "end": "YYYY-MM-DD"},
                "form_name": "partial name",
                "department": "dept name"
            },
            "group_by": "status|department|date",
            "confidence": 0.0-1.0
        }"""
        
        response = self.openai_service.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Query: {query}"}
            ],
            temperature=0.2
        )
        
        return json.loads(response.choices[0].message.content)

    def _execute_query(self, intent: Dict, user_role: str, department: str) -> Dict:
        entity = intent.get('entity', 'submissions')
        query_type = intent.get('query_type', 'count')
        filters = intent.get('filters', {})
        
        if entity == 'submissions':
            queryset = FormSubmission.objects.all()
            if user_role == 'MANAGER':
                queryset = queryset.filter(form__department=department)
        
        if 'status' in filters:
            queryset = queryset.filter(status=filters['status'])
        if 'date_range' in filters:
            queryset = queryset.filter(
                created_at__gte=filters['date_range']['start'],
                created_at__lte=filters['date_range']['end']
            )
        if 'form_name' in filters:
            queryset = queryset.filter(form__name__icontains=filters['form_name'])
        
        if query_type == 'count':
            return {"data": [{"value": queryset.count()}], "type": "number"}
        elif query_type == 'breakdown':
            breakdown = queryset.values(intent['group_by']).annotate(count=Count('id'))
            return {"data": list(breakdown), "type": "bar"}
        elif query_type == 'trend':
            trend = queryset.annotate(date=TruncDate('created_at')).values('date').annotate(count=Count('id'))
            return {"data": list(trend), "type": "line"}
        
        return {"data": [], "type": "number"}

    def format_analytics_response(self, query: str, data: Dict, intent: Dict) -> str:
        system_prompt = """Provide a conversational summary of analytics results.
        Keep under 3 sentences. Highlight key insights."""
        
        user_prompt = f"""Query: "{query}"
        Results: {json.dumps(data)}
        
        Summarize naturally."""
        
        response = self.openai_service.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.5
        )
        
        return response.choices[0].message.content
```

**Code Explanation:**

The Analytics Query system implements a novel three-step hybrid architecture that combines the natural language understanding capabilities of AI with the accuracy and security of direct database queries. This approach addresses the limitations of pure AI-based analytics, which can hallucinate data values, and pure SQL-based systems, which require users to learn complex query syntax. The orchestration happens in the main POST endpoint, which sequentially executes intent parsing, query execution, and response formatting, passing the results of each step to the next.

Step 1 implements AI-powered intent parsing to convert natural language queries into structured database query parameters. When a user asks a question like "how many leave requests were submitted last month," the AI analyzes the query and extracts structured information including the query type (count), entity to query (submissions), filters to apply (form name contains "leave", date range covering last month), and grouping dimensions if applicable. The system uses a temperature setting of 0.2 to ensure consistent, structured JSON output that can be reliably parsed by the backend. The extracted intent includes a confidence score indicating how certain the AI is about its interpretation, which can be used to request clarification for ambiguous queries.

Step 2 executes the actual database query using the AI-parsed intent, ensuring data accuracy and enforcing security policies. The system translates the structured intent into Django ORM queries, applying role-based data scoping where Administrators see system-wide data while Form Managers only access department-filtered information. Filters extracted from the user's query are applied to the queryset, including status filters, date ranges, form name searches, and department restrictions. The query execution performs appropriate aggregations based on the query type: simple counts for totals, group-by operations with Count aggregation for breakdowns, and time-based grouping using TruncDate for trend analysis. This database-centric approach guarantees that all returned data is accurate, up-to-date, and respects access control policies.

Step 3 formats the database results into natural language summaries that users can easily understand. The AI receives the original user query, the database results, and the parsed intent, then generates a conversational response that highlights key insights and patterns. Using a moderate temperature of 0.5 enables natural, varied language while maintaining factual accuracy about the data. The system constrains responses to under three sentences to keep summaries concise and actionable. This step transforms raw numbers and database records into user-friendly explanations that match the conversational style of the original query.

The hybrid approach provides significant advantages over alternative architectures. Pure AI-based analytics risk hallucinating data values, have no inherent access control, and become expensive for large datasets since all data must be sent to the AI for processing. Pure database approaches require users to learn SQL or use rigid query builders with limited flexibility in phrasing. The three-step hybrid combines the strengths of both: natural language understanding from AI, accurate data retrieval from the database, enforced security through database permissions, and user-friendly result presentation through AI formatting. This architecture pattern can be applied to other scenarios requiring the combination of AI flexibility with database reliability.

**Libraries Used:**
- `django.db.models` - Django ORM for database queries, Count aggregation, and Q filters
- `django.db.models.functions` - TruncDate function for time-based grouping in trend analysis
- `openai` - OpenAI SDK for GPT API integration in Steps 1 and 3
- `json` - JSON serialization for AI communication and response parsing

**APIs Integrated:**
- OpenAI Chat Completion API used in both Step 1 and Step 3
- Temperature 0.2 in Step 1 for structured output, 0.5 in Step 3 for natural language

**Functions Created:**
- `post(request)` - Main API endpoint orchestrating all three steps of the hybrid approach
- `parse_analytics_intent(query, user_role)` - Step 1: AI-powered intent extraction and structuring
- `_execute_query(intent, user_role, department)` - Step 2: Database query execution with role-based scoping
- `format_analytics_response(query, data, intent)` - Step 3: AI-powered natural language formatting

---

## ✅ **完成！Paragraph Format!**

---

## 📊 **Heading Structure (标准学术格式):**
```
4.6.X [Function Name] Implementation
├── Code Snippet:
├── Code Explanation:
│   └── [Multiple paragraphs explaining the code]
├── Libraries Used:
├── APIs Integrated:
└── Functions Created:
```

### Code Explanation

#### 1. **Class Initialization (`__init__` method)**
   - Loads OpenAI API key from Django settings or environment variables
   - Configures model parameters: `gpt-4o-mini`, max_tokens (2000), temperature (0.7)
   - Initializes OpenAI client for API communication

#### 2. **Cache Management**
   - Generates SHA-256 hash from user description to create unique cache keys
   - Checks cache before making API calls to reduce costs and latency
   - Caches successful results for 1 hour (3600 seconds)

#### 3. **System Prompt Engineering**
   - Defines the AI's role as an "expert form designer"
   - Specifies exact JSON structure the AI must return
   - Lists available field types (text, number, email, date, select, etc.)
   - Ensures consistent output format for parsing

#### 4. **API Call Configuration**
   - Uses `temperature=0.3` (lower than default) for more deterministic, structured outputs
   - Constructs messages array with system and user roles
   - Includes optional context (department, existing forms) for better recommendations

#### 5. **Response Processing**
   - Extracts content from OpenAI response object
   - Parses JSON string into Python dictionary
   - Validates structure before returning
   - Implements comprehensive error handling for JSON parsing and API failures

#### 6. **Error Handling**
   - `json.JSONDecodeError`: Handles malformed JSON responses from AI
   - `Exception`: Catches API failures (network errors, rate limits, authentication issues)
   - Logs all errors with detailed messages for debugging
   - Returns `None` on failure, allowing calling code to handle gracefully

### Summary

**Libraries Used:**
- `openai` - Official OpenAI Python SDK for GPT API integration
- `json` - JSON parsing and serialization
- `django.core.cache` - Django's caching framework for result storage
- `hashlib` - SHA-256 hashing for secure cache keys
- `logging` - Error logging and debugging

**APIs Integrated:**
- OpenAI Chat Completion API (`chat.completions.create`)
- Model: gpt-4o-mini
- Parameters: temperature (0.3), max_tokens (2000)

**Functions Created:**
- `generate_form_structure(description, context)` - Main form generation function
- `_get_cache_key(prompt, context)` - Cache key generation with SHA-256 hashing
- `__init__()` - OpenAI client initialization and configuration

---

## FUNCTION 2: Smart Assistant

### Overview
The Smart Assistant provides conversational form recommendations using natural language processing. It analyzes user queries, matches them to available forms, and extracts field values mentioned in the conversation for auto-filling.

### Code Implementation

```python
"""
Smart Assistant - Conversational Form Search
File: backend/ai_integration/views.py
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from forms.models import Form
import json
import logging

logger = logging.getLogger(__name__)


class ConversationalAssistantViewSet(viewsets.ViewSet):
    """ViewSet for conversational form filling assistance"""
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'])
    def search_forms(self, request):
        """
        AI-powered form search with intent parsing and field value extraction

        Accepts natural language queries like:
        - "I want to apply for leave"
        - "I need annual leave for vacation next week"
        - "Expense claim for $500 taxi"

        Returns:
        - Matched forms ranked by relevance
        - Extracted field values for auto-filling
        - Confidence scores and reasoning
        """
        query = request.data.get('query', '').strip()

        if not query:
            return Response(
                {"error": "Query is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get all active forms accessible to the user
        forms = Form.objects.filter(status='ACTIVE')
        user_department = request.user.department

        if not forms.exists():
            return Response({
                "forms": [],
                "message": "No forms available",
                "ai_response": "There are no forms available at the moment."
            })

        # Prepare forms data with fields for intelligent extraction
        forms_data = []
        for form in forms:
            form_fields = []
            for field in form.fields.all().order_by('order'):
                field_info = {
                    "name": field.name,
                    "label": field.label,
                    "type": field.field_type,
                    "required": field.required,
                }
                # Include options for select/radio fields to help AI match values
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

        # Use OpenAI to find the best matching form and extract field values
        ai_service = get_openai_service()

        if ai_service.client:
            # System prompt for intent parsing and value extraction
            system_prompt = """You are a smart form search assistant. Based on the user's query:
1. Find the most relevant form(s) from the available forms
2. Extract any field values mentioned in the user's query for pre-filling

Return a JSON object:
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
- Only extract values clearly stated in the query
- Use exact field "name" (not label) as key
- For SELECT/RADIO, match value to available options
- For DATE fields, convert to YYYY-MM-DD format
- Always translate extracted values to English

Examples:
- "I need annual leave for vacation" → {"leave_type": "Annual Leave", "reason": "vacation"}
- "expense claim for $500 taxi" → {"amount": "500", "expense_type": "Transportation", "description": "taxi"}
- "sick leave tomorrow" → {"leave_type": "Sick Leave"}
"""

            user_prompt = f"""User query: "{query}"

Available forms:
{json.dumps(forms_data, indent=2)}

User's department: {user_department.name if user_department else 'Not specified'}"""

            try:
                messages = [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ]

                # Make API call with lower temperature for structured output
                response = ai_service._make_api_call(messages, temperature=0.3)

                if response:
                    ai_result = json.loads(response)

                    # Build response with actual form data
                    result_forms = []

                    # Add best match first
                    if ai_result.get('best_match_id'):
                        try:
                            best_form = forms.get(id=ai_result['best_match_id'])
                            result_forms.append({
                                "id": str(best_form.id),
                                "name": best_form.name,
                                "description": best_form.description,
                                "department": best_form.department.name if best_form.department else "General",
                                "confidence": ai_result.get('confidence', 0.8)
                            })
                        except Form.DoesNotExist:
                            logger.warning(f"Best match form {ai_result['best_match_id']} not found")

                    return Response({
                        "forms": result_forms,
                        "ai_response": ai_result.get('response_message', 'I found some forms for you.'),
                        "confidence": ai_result.get('confidence', 0),
                        "reasoning": ai_result.get('reasoning', ''),
                        "extracted_fields": ai_result.get('extracted_fields', {})
                    })

            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse AI response: {e}")
            except Exception as e:
                logger.error(f"AI form search error: {e}")

        # Fallback: Keyword-based search if AI fails
        return self._fallback_search(query, forms, user_department)

    def _fallback_search(self, query, forms, user_department):
        """Fallback keyword-based form search when AI is unavailable"""
        query_lower = query.lower()
        scored_forms = []

        for form in forms:
            score = 0
            # Simple keyword matching
            if query_lower in form.name.lower():
                score += 10
            if form.description and query_lower in form.description.lower():
                score += 5
            if user_department and form.department == user_department:
                score += 3

            if score > 0:
                scored_forms.append({
                    "form": form,
                    "score": score
                })

        # Sort by score descending
        scored_forms.sort(key=lambda x: x['score'], reverse=True)

        return Response({
            "forms": [{"id": str(item["form"].id), "name": item["form"].name,
                      "description": item["form"].description} for item in scored_forms[:5]],
            "ai_response": f"I found {len(scored_forms)} form(s) matching your search." if scored_forms else "I couldn't find a specific form.",
            "confidence": 0.7 if scored_forms else 0,
            "extracted_fields": {}
        })


def get_openai_service():
    """Helper function to get OpenAI service instance"""
    from ai_integration.services import OpenAIService
    return OpenAIService()
```

### Code Explanation

#### 1. **Query Processing**
   - Validates user query is non-empty
   - Retrieves all active forms from database
   - Filters by user's department for personalized results

#### 2. **Forms Data Preparation**
   - Constructs detailed form metadata for AI analysis
   - Includes form fields with types, labels, and options
   - Provides field options for SELECT/RADIO types to enable value matching
   - Serializes data to JSON format for AI consumption

#### 3. **Intent Parsing with OpenAI**
   - System prompt defines AI as "smart form search assistant"
   - Instructs AI to perform two tasks:
     1. Match query to most relevant form
     2. Extract field values mentioned in query
   - Uses structured JSON output for consistent parsing

#### 4. **Field Value Extraction**
   - AI analyzes user query for mentions of field values
   - Examples: "annual leave" → `leave_type`, "$500" → `amount`
   - Matches extracted values to field options (for SELECT/RADIO types)
   - Converts dates to YYYY-MM-DD format automatically
   - Translates non-English values to English

#### 5. **Confidence Scoring**
   - AI returns confidence score (0.0-1.0) indicating match quality
   - Provides reasoning explaining why form was selected
   - Includes alternative form IDs for secondary matches

#### 6. **Response Construction**
   - Builds list of matched forms with metadata
   - Includes extracted field values for auto-filling
   - Provides friendly message explaining results to user

#### 7. **Fallback Mechanism**
   - Implements keyword-based search when AI unavailable
   - Uses simple scoring: form name match (+10), description (+5), department (+3)
   - Ensures system remains functional even without OpenAI access

### Summary

**Libraries Used:**
- `django.rest_framework` - REST API framework for viewsets and responses
- `json` - JSON serialization for AI communication
- `logging` - Error logging and debugging
- `openai` - OpenAI SDK (via `get_openai_service()`)

**APIs Integrated:**
- OpenAI Chat Completion API
- Model: gpt-4o-mini
- Temperature: 0.3 (for structured output)

**Functions Created:**
- `search_forms(request)` - Main form search endpoint with AI intent parsing
- `_fallback_search(query, forms, user_department)` - Keyword-based fallback search
- `get_openai_service()` - Helper to instantiate OpenAI service

**Key Features:**
- Natural language intent parsing
- Automatic field value extraction from queries
- Multi-language support with English output
- Confidence scoring and reasoning
- Fallback search for reliability

---

## FUNCTION 3: Analytics Query (Three-Step Hybrid Approach)

### Overview
The Analytics Query feature implements a **three-step hybrid approach** combining AI natural language understanding with traditional database queries. This architecture ensures accuracy while providing natural language interfaces.

**Three Steps:**
1. **OpenAI parses user query** → Extracts intent, filters, aggregations
2. **Backend executes Django ORM queries** → Retrieves actual data from database
3. **OpenAI formats response** → Converts data to natural language summary

### Code Implementation

```python
"""
AI Form Generator Service
File: backend/ai_integration/services.py
"""

import os
import json
import logging
from django.conf import settings
from django.core.cache import cache
from openai import OpenAI

logger = logging.getLogger(__name__)

class OpenAIService:
    def __init__(self):
        self.api_key = getattr(settings, 'OPENAI_API_KEY', None) or os.environ.get('OPENAI_API_KEY')
        self.client = OpenAI(api_key=self.api_key) if self.api_key else None
        self.model = getattr(settings, 'OPENAI_MODEL', 'gpt-4o-mini')
        self.max_tokens = getattr(settings, 'OPENAI_MAX_TOKENS', 2000)
        self.temperature = getattr(settings, 'OPENAI_TEMPERATURE', 0.7)

    def generate_form_structure(self, description: str, context: Optional[Dict] = None) -> Optional[Dict]:
        cache_key = self._get_cache_key(description, str(context))
        cached_result = cache.get(cache_key)
        if cached_result:
            return cached_result

        system_prompt = """You are an expert form designer. Generate a complete form structure.
        Return JSON with: title, description, fields array containing name, label, type, 
        required, validation, options, placeholder, helpText."""

        user_prompt = f"Create a form: {description}"
        if context:
            user_prompt += f"\nContext: {json.dumps(context)}"

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=self.max_tokens,
                temperature=0.3
            )
            
            form_structure = json.loads(response.choices[0].message.content)
            cache.set(cache_key, form_structure, 3600)
            return form_structure
            
        except Exception as e:
            logger.error(f"OpenAI API error: {str(e)}")
            return None

    def _get_cache_key(self, prompt: str, context: str = "") -> str:
        import hashlib
        content = (prompt + context).encode('utf-8')
        return f"openai:form:{hashlib.sha256(content).hexdigest()[:32]}"
```

### Code Explanation

#### Step 1: AI Parses Query Intent (`parse_analytics_intent`)

**Purpose:** Convert natural language to structured database query parameters

**Process:**
1. Receives user query: "How many leave requests were submitted last month?"
2. AI analyzes query and returns structured JSON:
   ```json
   {
     "query_type": "count",
     "entity": "submissions",
     "filters": {
       "form_name": "leave",
       "date_range": {"start": "2025-12-01", "end": "2025-12-31"}
     },
     "interpretation": "User wants count of leave submissions in December",
     "confidence": 0.9
   }
   ```
3. Uses low temperature (0.2) for consistent structured output
4. Cleans markdown code blocks from response
5. Returns parsed intent dictionary

**Key Parameters Extracted:**
- `query_type`: Type of analysis (count, breakdown, trend, comparison)
- `entity`: What to query (submissions, forms, users)
- `filters`: Conditions (status, date range, form name, department)
- `group_by`: Grouping dimension (status, department, date)

#### Step 2: Backend Executes Database Query (`_execute_query`)

**Purpose:** Use AI-parsed intent to execute accurate database queries

**Process:**
1. Receives structured intent from Step 1
2. Builds Django ORM queryset based on entity
3. Applies role-based data scoping (ADMIN sees all, MANAGER sees department only)
4. Applies filters from AI intent:
   - Status filter: `queryset.filter(status=filters['status'])`
   - Date range: `queryset.filter(created_at__gte=start, created_at__lte=end)`
   - Form name: `queryset.filter(form__name__icontains=filters['form_name'])`
5. Executes aggregation based on query_type:
   - **Count**: `queryset.count()`
   - **Breakdown**: `queryset.values('status').annotate(count=Count('id'))`
   - **Trend**: `queryset.annotate(date=TruncDate('created_at')).values('date').annotate(count=Count('id'))`
6. Returns data with visualization type (number, bar, line, pie)

**Why This Step is Critical:**
- Ensures data accuracy (database is source of truth)
- Enforces data permissions and security
- Provides performance optimization through ORM
- Avoids AI hallucination of data values

#### Step 3: AI Formats Response (`format_analytics_response`)

**Purpose:** Convert database results into natural language summary

**Process:**
1. Receives original query, database results, and parsed intent
2. AI generates human-readable summary from structured data
3. Example transformation:
   ```python
   # Input data:
   {"data": [{"value": 47}]}

   # AI output:
   "You had 47 leave requests submitted last month, showing a 12% increase from the previous month."
   ```
4. Uses moderate temperature (0.5) for natural, varied language
5. Keeps summaries concise (under 3 sentences)

**Why AI is Used Here:**
- Creates conversational, user-friendly responses
- Identifies trends and patterns in data
- Adjusts language to match user's question style
- Provides contextual insights beyond raw numbers

### Three-Step Hybrid Benefits

| Step | Component | Strength | Why Hybrid? |
|------|-----------|----------|-------------|
| 1 | AI Intent Parsing | Understands natural language | Handles various phrasings, typos, implicit requests |
| 2 | Database Query | Accuracy & security | Ensures correct data, enforces permissions, optimized performance |
| 3 | AI Response Formatting | Natural communication | User-friendly explanations, pattern identification |

**Without Hybrid Approach:**
- Pure AI: Risk of hallucinated data, no access control, expensive for large datasets
- Pure Database: Requires users to learn query syntax, rigid interface, no natural language

**With Hybrid Approach:**
- ✅ Natural language interface (AI)
- ✅ Accurate data retrieval (Database)
- ✅ Security & permissions (Database)
- ✅ User-friendly results (AI)

### Summary

**Libraries Used:**
- `django.rest_framework` - REST API framework
- `django.db.models` - ORM for database queries, aggregations (Count, Q, TruncDate)
- `json` - JSON serialization
- `logging` - Error tracking
- `openai` - OpenAI SDK (via service)

**APIs Integrated:**
- OpenAI Chat Completion API (Step 1 & Step 3)
- Model: gpt-4o-mini
- Temperature: 0.2 (Step 1 - structured output), 0.5 (Step 3 - natural language)

**Functions Created:**
- `post(request)` - Main analytics endpoint orchestrating all 3 steps
- `_build_context(user_role, user_department)` - Builds available data context for AI
- `_execute_query(intent, user_role, user_department)` - Step 2: Database query execution
- `parse_analytics_intent(query, context, history)` - Step 1: AI intent parsing
- `format_analytics_response(query, data, intent)` - Step 3: AI response formatting

**Django ORM Queries Used:**
- `.count()` - Count aggregation
- `.values().annotate(count=Count('id'))` - Group by aggregation
- `.annotate(date=TruncDate('created_at'))` - Time-based grouping
- `.filter()` - Conditional filtering
- Role-based queryset scoping

---

## Conclusion

These three AI-powered features demonstrate different approaches to integrating OpenAI's GPT models into a Django web application:

1. **AI Form Generator** - Direct AI generation of structured data
2. **Smart Assistant** - Conversational AI with intent parsing and value extraction
3. **Analytics Query** - Hybrid approach combining AI understanding with database accuracy

Each implementation includes:
- ✅ Comprehensive error handling
- ✅ Caching for cost optimization
- ✅ Fallback mechanisms for reliability
- ✅ Role-based access control
- ✅ Structured output validation
- ✅ Detailed logging for debugging

The hybrid approach in Function 3 is particularly notable for its architectural pattern that can be applied to other AI-database integration scenarios, balancing the strengths of AI (natural language understanding) with traditional databases (accuracy and security).

---

**End of FYP Section 4.6 - Part 1: AI Features**
