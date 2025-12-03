import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from forms.models import Form
from ai_integration.services import get_openai_service
import json

print("=== Testing Form Search ===")

# Get forms
forms = Form.objects.filter(status='ACTIVE')
print(f"Found {forms.count()} active forms")

forms_data = []
for form in forms:
    forms_data.append({
        "id": str(form.id),
        "name": form.name,
        "description": form.description or "",
        "department": form.department.name if form.department else "General",
        "code": form.code
    })

print(f"\nForms: {[f['name'] for f in forms_data]}")

# Test AI search
ai_service = get_openai_service()
print(f"\nAI Client available: {bool(ai_service.client)}")

if ai_service.client:
    system_prompt = """You are a form search assistant. Based on the user's query, find the most relevant form(s) from the available forms.

Return a JSON object with:
{
    "best_match_id": "form_id or null if no good match",
    "confidence": 0.0-1.0,
    "reasoning": "Brief explanation of why this form matches",
    "alternative_ids": ["other", "relevant", "form_ids"],
    "response_message": "A friendly message to the user about what you found"
}"""

    user_prompt = f"""User query: "I would like to apply for job"

Available forms:
{json.dumps(forms_data, indent=2)}

User's department: Not specified"""

    try:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        response = ai_service._make_api_call(messages, temperature=0.3)
        print(f"\nAI Response received: {len(response) if response else 0} chars")
        
        if response:
            result = json.loads(response)
            print(f"\nBest match ID: {result.get('best_match_id')}")
            print(f"Confidence: {result.get('confidence')}")
            print(f"Message: {result.get('response_message')}")
    except Exception as e:
        import traceback
        print(f"\nError: {e}")
        traceback.print_exc()
else:
    print("AI client not available")
