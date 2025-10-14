# Authentication System Documentation

## Overview

This Django backend includes a complete JWT-based authentication system with role-based access control (RBAC), user management, and department organization.

## Features

- JWT token-based authentication
- User registration with validation
- Email/username login
- Password reset functionality
- Role-based permissions (Admin, Manager, User)
- Department-based organization
- Audit logging
- Profile management

---

## API Endpoints

### Authentication Endpoints

#### 1. User Registration
**POST** `/api/v1/auth/register/`

Register a new user account.

**Request Body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "password_confirm": "SecurePass123!",
  "first_name": "John",
  "last_name": "Doe",
  "phone_number": "+1234567890",
  "employee_id": "EMP001",
  "department": "uuid-of-department"
}
```

**Response (201):**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "user-uuid",
    "username": "johndoe",
    "email": "john@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "full_name": "John Doe",
    "role": "USER",
    "department": "uuid",
    "department_name": "IT Department",
    "is_active": true,
    "is_admin": false,
    "is_manager": false
  },
  "tokens": {
    "refresh": "refresh-token-here",
    "access": "access-token-here"
  }
}
```

---

#### 2. User Login
**POST** `/api/v1/auth/login/`

Login with email or username and password.

**Request Body:**
```json
{
  "email_or_username": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "user": {
    "id": "user-uuid",
    "username": "johndoe",
    "email": "john@example.com",
    "full_name": "John Doe",
    "role": "USER"
  },
  "tokens": {
    "refresh": "refresh-token-here",
    "access": "access-token-here"
  }
}
```

---

#### 3. User Logout
**POST** `/api/v1/auth/logout/`

Logout and blacklist the refresh token.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Request Body:**
```json
{
  "refresh_token": "refresh-token-here"
}
```

**Response (200):**
```json
{
  "message": "Logout successful"
}
```

---

#### 4. Refresh Access Token
**POST** `/api/v1/auth/token/refresh/`

Get a new access token using refresh token.

**Request Body:**
```json
{
  "refresh": "refresh-token-here"
}
```

**Response (200):**
```json
{
  "access": "new-access-token-here",
  "refresh": "new-refresh-token-here"
}
```

---

#### 5. Verify Token
**POST** `/api/v1/auth/token/verify/`

Verify if a token is valid.

**Request Body:**
```json
{
  "token": "access-token-here"
}
```

**Response (200):**
```json
{}
```

---

### Profile Management

#### 6. Get User Profile
**GET** `/api/v1/auth/profile/`

Get the current authenticated user's profile.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response (200):**
```json
{
  "id": "user-uuid",
  "username": "johndoe",
  "email": "john@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "full_name": "John Doe",
  "role": "USER",
  "department": "uuid",
  "department_name": "IT Department",
  "phone_number": "+1234567890",
  "employee_id": "EMP001",
  "profile_picture": null,
  "is_active": true,
  "is_admin": false,
  "is_manager": false
}
```

---

#### 7. Update User Profile
**PUT** `/api/v1/auth/profile/` or **PATCH** `/api/v1/auth/profile/`

Update the current user's profile information.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Request Body (PUT - all fields required):**
```json
{
  "first_name": "John",
  "last_name": "Smith",
  "phone_number": "+1234567890"
}
```

**Request Body (PATCH - partial update):**
```json
{
  "phone_number": "+0987654321"
}
```

**Change Password (include in request):**
```json
{
  "first_name": "John",
  "last_name": "Smith",
  "current_password": "OldPass123!",
  "new_password": "NewPass456!",
  "new_password_confirm": "NewPass456!"
}
```

**Response (200):**
```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": "user-uuid",
    "username": "johndoe",
    "email": "john@example.com",
    "first_name": "John",
    "last_name": "Smith"
  }
}
```

---

### Password Reset

#### 8. Request Password Reset
**POST** `/api/v1/auth/password-reset/`

Request a password reset email.

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Response (200):**
```json
{
  "message": "If an account with that email exists, a password reset link has been sent."
}
```

---

#### 9. Confirm Password Reset
**POST** `/api/v1/auth/password-reset/confirm/`

Reset password using the token from email.

**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "new_password": "NewSecurePass123!",
  "new_password_confirm": "NewSecurePass123!"
}
```

**Response (200):**
```json
{
  "message": "Password has been reset successfully"
}
```

---

### User Management (Admin/Manager)

#### 10. List Users
**GET** `/api/v1/users/`

List users based on role permissions.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Query Parameters:**
- `search` - Search by email, name, username, employee_id
- `ordering` - Order by fields (e.g., `-created_at`, `email`)
- `page` - Page number for pagination

**Response (200):**
```json
{
  "count": 50,
  "next": "http://api/v1/users/?page=2",
  "previous": null,
  "results": [
    {
      "id": "user-uuid",
      "username": "johndoe",
      "email": "john@example.com",
      "full_name": "John Doe",
      "role": "USER",
      "department_name": "IT Department"
    }
  ]
}
```

---

#### 11. Get User Details
**GET** `/api/v1/auth/users/<user_id>/`

Get details of a specific user.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response (200):**
```json
{
  "id": "user-uuid",
  "username": "johndoe",
  "email": "john@example.com",
  "full_name": "John Doe",
  "role": "USER",
  "department_name": "IT Department"
}
```

---

#### 12. Get Current User (Me)
**GET** `/api/v1/users/me/`

Get the current authenticated user's profile (alternative to `/auth/profile/`).

**Headers:**
```
Authorization: Bearer <access-token>
```

---

#### 13. Activate User
**POST** `/api/v1/users/<user_id>/activate/`

Activate a user account (Admin only).

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response (200):**
```json
{
  "message": "User activated successfully",
  "user": { }
}
```

---

#### 14. Deactivate User
**POST** `/api/v1/users/<user_id>/deactivate/`

Deactivate a user account (Admin only).

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response (200):**
```json
{
  "message": "User deactivated successfully",
  "user": { }
}
```

---

#### 15. Get User Statistics
**GET** `/api/v1/users/stats/`

Get user statistics (Admin/Manager only).

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response (200):**
```json
{
  "total_users": 50,
  "active_users": 45,
  "inactive_users": 5,
  "admins": 2,
  "managers": 8,
  "regular_users": 40
}
```

---

### Department Management

#### 16. List Departments
**GET** `/api/v1/departments/`

List all departments.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response (200):**
```json
{
  "count": 10,
  "results": [
    {
      "id": "dept-uuid",
      "name": "IT Department",
      "code": "IT",
      "description": "Information Technology",
      "parent": null,
      "parent_name": null,
      "manager": "manager-uuid",
      "manager_name": "Jane Manager",
      "is_active": true,
      "total_users": 15,
      "active_users": 14
    }
  ]
}
```

---

#### 17. Get Department Details
**GET** `/api/v1/departments/<dept_id>/`

Get details of a specific department.

---

#### 18. Create Department
**POST** `/api/v1/departments/`

Create a new department (Admin only).

**Request Body:**
```json
{
  "name": "Marketing Department",
  "code": "MKT",
  "description": "Marketing and Communications",
  "parent": "parent-dept-uuid",
  "manager": "manager-user-uuid",
  "is_active": true
}
```

---

#### 19. Get Department Users
**GET** `/api/v1/departments/<dept_id>/users/`

Get all users in a department (Admin/Department Manager only).

**Response (200):**
```json
{
  "department": {
    "id": "dept-uuid",
    "name": "IT Department"
  },
  "users": [ ],
  "total": 15
}
```

---

#### 20. Get Sub-Departments
**GET** `/api/v1/departments/<dept_id>/sub_departments/`

Get all sub-departments recursively.

**Response (200):**
```json
{
  "department": {
    "id": "dept-uuid",
    "name": "IT Department"
  },
  "sub_departments": [ ],
  "total": 3
}
```

---

#### 21. Get Department Statistics
**GET** `/api/v1/departments/stats/`

Get department statistics (Admin only).

**Response (200):**
```json
{
  "total_departments": 10,
  "active_departments": 9,
  "inactive_departments": 1
}
```

---

## Permissions

### Custom Permission Classes

1. **IsOwnerOrReadOnly**
   - Read: Any authenticated user
   - Write: Only the owner

2. **IsAdmin**
   - Only users with role `ADMIN`

3. **IsManager**
   - Users with role `MANAGER` or `ADMIN`

4. **IsFormManager**
   - Managers can manage forms in their department
   - Admins have full access

5. **IsSelfOrAdmin**
   - Users can edit their own profile
   - Admins can edit any profile

6. **IsOwnerOrManagerOrAdmin**
   - Owner, their manager, or admins

---

## User Roles

### 1. ADMIN (System Administrator)
- Full access to all resources
- Can manage all users and departments
- Can access all forms and submissions
- Can view all analytics

### 2. MANAGER (Form Manager)
- Can manage users in their department
- Can create and manage forms for their department
- Can view submissions from their department
- Can view analytics for their department

### 3. USER (Regular User)
- Can view and update own profile
- Can fill out forms
- Can view own submissions
- Limited read access to department information

---

## Authentication Flow

### 1. Registration
```
Client -> POST /api/v1/auth/register/
      <- 201 Created + JWT tokens
```

### 2. Login
```
Client -> POST /api/v1/auth/login/
      <- 200 OK + JWT tokens
```

### 3. Access Protected Resource
```
Client -> GET /api/v1/users/me/
          Authorization: Bearer <access-token>
      <- 200 OK + User data
```

### 4. Refresh Token
```
Client -> POST /api/v1/auth/token/refresh/
          { "refresh": "token" }
      <- 200 OK + New tokens
```

### 5. Logout
```
Client -> POST /api/v1/auth/logout/
          { "refresh_token": "token" }
      <- 200 OK
```

---

## Security Features

1. **Password Validation**
   - Minimum 8 characters
   - Cannot be too similar to user information
   - Cannot be a common password
   - Cannot be entirely numeric

2. **JWT Token Security**
   - Access tokens expire in 60 minutes (configurable)
   - Refresh tokens expire in 7 days (configurable)
   - Refresh tokens are rotated on use
   - Old refresh tokens are blacklisted

3. **Audit Logging**
   - All user actions are logged
   - Includes IP address and user agent
   - Tracks: LOGIN, LOGOUT, CREATE, UPDATE, DELETE

4. **CORS Protection**
   - Configured allowed origins
   - Credentials allowed
   - Restricted methods and headers

---

## Environment Variables

Configure these in your `.env` file:

```env
# JWT Configuration
JWT_ACCESS_TOKEN_LIFETIME=60  # minutes
JWT_REFRESH_TOKEN_LIFETIME=7  # days
JWT_SECRET_KEY=your-secret-key

# Email Configuration (for password reset)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-email-password

# Frontend URL (for password reset links)
FRONTEND_URL=http://localhost:5173
```

---

## Testing the API

### Using cURL

**Register:**
```bash
curl -X POST http://localhost:8000/api/v1/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "SecurePass123!",
    "password_confirm": "SecurePass123!",
    "first_name": "Test",
    "last_name": "User"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email_or_username": "test@example.com",
    "password": "SecurePass123!"
  }'
```

**Get Profile:**
```bash
curl -X GET http://localhost:8000/api/v1/auth/profile/ \
  -H "Authorization: Bearer <access-token>"
```

### Using Python Requests

```python
import requests

BASE_URL = "http://localhost:8000/api/v1"

# Register
response = requests.post(f"{BASE_URL}/auth/register/", json={
    "username": "testuser",
    "email": "test@example.com",
    "password": "SecurePass123!",
    "password_confirm": "SecurePass123!",
    "first_name": "Test",
    "last_name": "User"
})
data = response.json()
access_token = data['tokens']['access']

# Get Profile
headers = {"Authorization": f"Bearer {access_token}"}
response = requests.get(f"{BASE_URL}/auth/profile/", headers=headers)
print(response.json())
```

---

## Database Models

### User Model
- Custom user model extending AbstractUser
- Uses email as primary identifier
- Includes role, department, and profile fields

### Department Model
- Hierarchical structure (parent/child)
- Has a manager (User)
- Tracks active/inactive status

### AuditLog Model
- Logs all user actions
- Stores IP address and user agent
- Immutable (read-only in admin)

---

## Next Steps

1. Run migrations to create database tables:
```bash
python manage.py makemigrations
python manage.py migrate
```

2. Create a superuser:
```bash
python manage.py createsuperuser
```

3. Run the development server:
```bash
python manage.py runserver
```

4. Access the API at: `http://localhost:8000/api/v1/`

5. Access Django Admin at: `http://localhost:8000/admin/`

---

## Error Codes

- **400 Bad Request** - Invalid data or validation errors
- **401 Unauthorized** - Missing or invalid authentication
- **403 Forbidden** - Insufficient permissions
- **404 Not Found** - Resource does not exist
- **500 Internal Server Error** - Server error

---

## Support

For issues or questions, please refer to:
- Django REST Framework: https://www.django-rest-framework.org/
- Django Simple JWT: https://django-rest-framework-simplejwt.readthedocs.io/
