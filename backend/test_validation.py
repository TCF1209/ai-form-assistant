import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from ai_integration.services import get_form_generation_service

service = get_form_generation_service()

print("=" * 60)
print("Testing Input Validation")
print("=" * 60)

test_cases = [
    ("Valid: leave form", "Create a leave application form"),
    ("Valid: IT support", "IT support ticket"),
    ("Profanity", "fuck this shit"),
    ("Gibberish", "asdfghjklqwerty"),
    ("Too short", "hi"),
    ("Greeting", "hello how are you"),
    ("Random chars", "asjdfklasdjfklasjdf"),
]

for name, input_text in test_cases:
    print(f"\n--- Test: {name} ---")
    print(f"Input: '{input_text}'")
    result = service.generate_from_description(input_text)
    if result.get('success'):
        print(f"Result: SUCCESS - Form '{result.get('form_data', {}).get('title')}' generated")
    else:
        print(f"Result: BLOCKED - {result.get('error')}")
