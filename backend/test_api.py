"""
Simple script to test the authentication API endpoints.
Make sure the Django server is running before executing this script.

Usage: python test_api.py
"""

import requests
import json

# Configuration
BASE_URL = "http://localhost:8000/api/v1"
TEST_USER = {
    "username": "testuser_api",
    "email": "testapi@example.com",
    "password": "TestPass123!",
    "password_confirm": "TestPass123!",
    "first_name": "API",
    "last_name": "Tester"
}

def print_response(title, response):
    """Print formatted response."""
    print("\n" + "="*70)
    print(f"{title}")
    print("="*70)
    print(f"Status Code: {response.status_code}")
    print(f"Response:")
    try:
        print(json.dumps(response.json(), indent=2))
    except:
        print(response.text)
    print("="*70)

def test_authentication():
    """Test authentication endpoints."""

    print("\n" + "#"*70)
    print("# TESTING AUTHENTICATION API")
    print("#"*70)

    # 1. Test Registration
    print("\n[1/8] Testing User Registration...")
    try:
        response = requests.post(f"{BASE_URL}/auth/register/", json=TEST_USER)
        print_response("Registration Response", response)

        if response.status_code == 201:
            tokens = response.json().get('tokens', {})
            access_token = tokens.get('access')
            refresh_token = tokens.get('refresh')
            print("\n✓ Registration successful!")
            print(f"Access Token: {access_token[:50]}...")
            print(f"Refresh Token: {refresh_token[:50]}...")
        else:
            print("\n✗ Registration failed!")
            return
    except Exception as e:
        print(f"\n✗ Error during registration: {e}")
        return

    # 2. Test Login
    print("\n[2/8] Testing User Login...")
    try:
        login_data = {
            "email_or_username": TEST_USER["email"],
            "password": TEST_USER["password"]
        }
        response = requests.post(f"{BASE_URL}/auth/login/", json=login_data)
        print_response("Login Response", response)

        if response.status_code == 200:
            tokens = response.json().get('tokens', {})
            access_token = tokens.get('access')
            refresh_token = tokens.get('refresh')
            print("\n✓ Login successful!")
        else:
            print("\n✗ Login failed!")
            return
    except Exception as e:
        print(f"\n✗ Error during login: {e}")
        return

    # 3. Test Token Verification
    print("\n[3/8] Testing Token Verification...")
    try:
        verify_data = {"token": access_token}
        response = requests.post(f"{BASE_URL}/auth/token/verify/", json=verify_data)
        print_response("Token Verification Response", response)

        if response.status_code == 200:
            print("\n✓ Token verification successful!")
        else:
            print("\n✗ Token verification failed!")
    except Exception as e:
        print(f"\n✗ Error during token verification: {e}")

    # 4. Test Get Profile
    print("\n[4/8] Testing Get User Profile...")
    try:
        headers = {"Authorization": f"Bearer {access_token}"}
        response = requests.get(f"{BASE_URL}/auth/profile/", headers=headers)
        print_response("Get Profile Response", response)

        if response.status_code == 200:
            print("\n✓ Profile retrieval successful!")
        else:
            print("\n✗ Profile retrieval failed!")
    except Exception as e:
        print(f"\n✗ Error getting profile: {e}")

    # 5. Test Update Profile
    print("\n[5/8] Testing Update User Profile...")
    try:
        headers = {"Authorization": f"Bearer {access_token}"}
        update_data = {
            "first_name": "Updated",
            "last_name": "Name",
            "phone_number": "+1234567890"
        }
        response = requests.patch(f"{BASE_URL}/auth/profile/", json=update_data, headers=headers)
        print_response("Update Profile Response", response)

        if response.status_code == 200:
            print("\n✓ Profile update successful!")
        else:
            print("\n✗ Profile update failed!")
    except Exception as e:
        print(f"\n✗ Error updating profile: {e}")

    # 6. Test List Users
    print("\n[6/8] Testing List Users...")
    try:
        headers = {"Authorization": f"Bearer {access_token}"}
        response = requests.get(f"{BASE_URL}/users/", headers=headers)
        print_response("List Users Response", response)

        if response.status_code == 200:
            print("\n✓ User list retrieval successful!")
        else:
            print("\n✗ User list retrieval failed!")
    except Exception as e:
        print(f"\n✗ Error listing users: {e}")

    # 7. Test Token Refresh
    print("\n[7/8] Testing Token Refresh...")
    try:
        refresh_data = {"refresh": refresh_token}
        response = requests.post(f"{BASE_URL}/auth/token/refresh/", json=refresh_data)
        print_response("Token Refresh Response", response)

        if response.status_code == 200:
            new_access = response.json().get('access')
            new_refresh = response.json().get('refresh')
            print("\n✓ Token refresh successful!")
            print(f"New Access Token: {new_access[:50]}...")
            access_token = new_access
            refresh_token = new_refresh
        else:
            print("\n✗ Token refresh failed!")
    except Exception as e:
        print(f"\n✗ Error refreshing token: {e}")

    # 8. Test Logout
    print("\n[8/8] Testing User Logout...")
    try:
        headers = {"Authorization": f"Bearer {access_token}"}
        logout_data = {"refresh_token": refresh_token}
        response = requests.post(f"{BASE_URL}/auth/logout/", json=logout_data, headers=headers)
        print_response("Logout Response", response)

        if response.status_code == 200:
            print("\n✓ Logout successful!")
        else:
            print("\n✗ Logout failed!")
    except Exception as e:
        print(f"\n✗ Error during logout: {e}")

    # Test Summary
    print("\n" + "#"*70)
    print("# TEST SUMMARY")
    print("#"*70)
    print("\nAll basic authentication tests completed!")
    print("\nTested Endpoints:")
    print("  1. POST /api/v1/auth/register/")
    print("  2. POST /api/v1/auth/login/")
    print("  3. POST /api/v1/auth/token/verify/")
    print("  4. GET /api/v1/auth/profile/")
    print("  5. PATCH /api/v1/auth/profile/")
    print("  6. GET /api/v1/users/")
    print("  7. POST /api/v1/auth/token/refresh/")
    print("  8. POST /api/v1/auth/logout/")
    print("\nFor more detailed testing, see AUTHENTICATION_README.md")
    print("#"*70 + "\n")

def test_departments():
    """Test department endpoints."""
    print("\n" + "#"*70)
    print("# TESTING DEPARTMENT API")
    print("#"*70)

    # First, login to get token
    print("\nLogging in as admin...")
    try:
        login_data = {
            "email_or_username": "admin@example.com",
            "password": "Admin123!"
        }
        response = requests.post(f"{BASE_URL}/auth/login/", json=login_data)

        if response.status_code == 200:
            access_token = response.json()['tokens']['access']
            print("✓ Logged in as admin")

            # Test List Departments
            print("\nTesting List Departments...")
            headers = {"Authorization": f"Bearer {access_token}"}
            response = requests.get(f"{BASE_URL}/departments/", headers=headers)
            print_response("List Departments Response", response)

            if response.status_code == 200:
                print("\n✓ Department list retrieval successful!")
            else:
                print("\n✗ Department list retrieval failed!")
        else:
            print("✗ Admin login failed! Make sure to run create_test_data.py first")
    except Exception as e:
        print(f"✗ Error: {e}")
        print("\nNote: Make sure to:")
        print("  1. Run migrations: python manage.py migrate")
        print("  2. Create test data: python manage.py shell < create_test_data.py")
        print("  3. Start server: python manage.py runserver")

if __name__ == "__main__":
    print("\n" + "*"*70)
    print("* DJANGO AUTHENTICATION API TEST SUITE")
    print("*"*70)
    print("\nMake sure the Django development server is running!")
    print("URL: http://localhost:8000")
    print("\n" + "*"*70)

    input("\nPress Enter to start testing...")

    try:
        test_authentication()
        test_departments()
    except requests.exceptions.ConnectionError:
        print("\n" + "!"*70)
        print("! ERROR: Could not connect to the server!")
        print("!"*70)
        print("\nPlease make sure:")
        print("  1. Django server is running: python manage.py runserver")
        print("  2. Server is accessible at: http://localhost:8000")
        print("  3. No firewall is blocking the connection")
        print("\n" + "!"*70)
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
