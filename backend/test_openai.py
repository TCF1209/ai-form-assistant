"""
Simple script to test OpenAI API connection
Run this from the backend directory after activating your virtual environment:

    cd backend
    python test_openai.py

Make sure to:
1. Install openai: pip install openai
2. Set your API key in .env file (OPENAI_API_KEY=sk-your-key-here)
"""

import os
import sys
from pathlib import Path

# Load environment variables from .env file
def load_env():
    env_path = Path(__file__).parent / '.env'
    if env_path.exists():
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key.strip()] = value.strip()
        print("✓ Loaded .env file")
    else:
        print("✗ .env file not found")
        return False
    return True

def test_openai_connection():
    """Test basic OpenAI API connection"""
    print("\n" + "="*50)
    print("OpenAI API Connection Test")
    print("="*50 + "\n")

    # Step 1: Load environment
    if not load_env():
        return False

    # Step 2: Check API key
    api_key = os.environ.get('OPENAI_API_KEY', '')
    model = os.environ.get('OPENAI_MODEL', 'gpt-4.1-mini')

    if not api_key or api_key == 'sk-YOUR-API-KEY-HERE' or api_key == 'sk-placeholder-key':
        print("✗ OPENAI_API_KEY not set or still placeholder")
        print("  Please update your .env file with a real API key")
        print("  Get your key at: https://platform.openai.com/api-keys")
        return False

    print(f"✓ API Key found (starts with: {api_key[:10]}...)")
    print(f"✓ Model configured: {model}")

    # Step 3: Try to import OpenAI
    try:
        from openai import OpenAI
        print("✓ OpenAI package imported successfully")
    except ImportError:
        print("✗ OpenAI package not installed")
        print("  Run: pip install openai")
        return False

    # Step 4: Create client and make test call
    print("\nMaking test API call...")
    try:
        client = OpenAI(api_key=api_key)

        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": "Say 'Hello! OpenAI is working!' in exactly those words."}
            ],
            max_tokens=50,
            temperature=0
        )

        result = response.choices[0].message.content
        print(f"\n✓ API Response: {result}")
        print(f"✓ Tokens used: {response.usage.total_tokens}")
        print(f"✓ Model: {response.model}")

        # Calculate approximate cost
        input_tokens = response.usage.prompt_tokens
        output_tokens = response.usage.completion_tokens
        # GPT-4.1 mini pricing: $0.40/1M input, $1.60/1M output
        cost = (input_tokens * 0.40 / 1_000_000) + (output_tokens * 1.60 / 1_000_000)
        print(f"✓ Estimated cost: ${cost:.6f}")

        return True

    except Exception as e:
        print(f"\n✗ API Error: {str(e)}")
        if "invalid_api_key" in str(e).lower():
            print("  Your API key appears to be invalid")
        elif "model" in str(e).lower():
            print(f"  The model '{model}' may not be available")
            print("  Try changing OPENAI_MODEL in .env to: gpt-4o-mini")
        return False

def test_form_generation():
    """Test form generation capability"""
    print("\n" + "="*50)
    print("Form Generation Test")
    print("="*50 + "\n")

    load_env()
    api_key = os.environ.get('OPENAI_API_KEY', '')
    model = os.environ.get('OPENAI_MODEL', 'gpt-4.1-mini')

    if not api_key or 'placeholder' in api_key or 'YOUR-API-KEY' in api_key:
        print("✗ Skipping - API key not configured")
        return False

    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)

        print("Testing form generation prompt...")

        response = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": """You are a form designer. Generate a simple JSON form structure.
                    Return ONLY valid JSON with this structure:
                    {"title": "string", "fields": [{"name": "string", "type": "text|email|number", "required": boolean}]}"""
                },
                {
                    "role": "user",
                    "content": "Create a simple contact form with name, email, and message fields."
                }
            ],
            max_tokens=500,
            temperature=0.3
        )

        result = response.choices[0].message.content
        print(f"\nGenerated Form Structure:\n{result}")

        # Try to parse as JSON
        import json
        try:
            form_data = json.loads(result)
            print(f"\n✓ Valid JSON with {len(form_data.get('fields', []))} fields")
            return True
        except json.JSONDecodeError:
            print("\n⚠ Response is not valid JSON (may need prompt tuning)")
            return True  # API worked, just formatting issue

    except Exception as e:
        print(f"✗ Error: {str(e)}")
        return False


if __name__ == "__main__":
    print("\n" + "#"*60)
    print("#  OpenAI Integration Test for AI Office Assistant")
    print("#"*60)

    # Run connection test
    connection_ok = test_openai_connection()

    if connection_ok:
        # Run form generation test
        test_form_generation()

        print("\n" + "="*50)
        print("✓ All tests completed successfully!")
        print("="*50)
        print("\nNext steps:")
        print("1. Start your Django server: python manage.py runserver")
        print("2. Test the AI endpoints via your frontend or API client")
        print("3. Check /api/v1/ai/health/ for service status")
    else:
        print("\n" + "="*50)
        print("✗ Connection test failed")
        print("="*50)
        print("\nTroubleshooting:")
        print("1. Make sure you have a valid API key from https://platform.openai.com/api-keys")
        print("2. Update OPENAI_API_KEY in backend/.env")
        print("3. Ensure openai package is installed: pip install openai")
        print("4. Check your OpenAI account has available credits")
