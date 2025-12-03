import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

# Test the AI service
from ai_integration.services import get_openai_service, get_form_generation_service

print('=== Testing OpenAI Service ===')
ai_service = get_openai_service()
print(f'API Key configured: {bool(ai_service.api_key)}')
print(f'Client initialized: {bool(ai_service.client)}')
print(f'Model: {getattr(ai_service, "model", "N/A")}')

print()
print('=== Testing Form Generation ===')
form_service = get_form_generation_service()
try:
    result = form_service.generate_from_description('Create a simple contact form')
    print(f'Success: {result.get("success")}')
    if result.get("success"):
        print(f'Form title: {result.get("form_data", {}).get("title")}')
        print(f'Fields count: {len(result.get("form_data", {}).get("fields", []))}')
    else:
        print(f'Error: {result.get("error")}')
except Exception as e:
    import traceback
    print(f'Exception: {type(e).__name__}: {e}')
    traceback.print_exc()
