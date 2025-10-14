# Authentication System Setup - COMPLETE

## Summary

A complete JWT-based authentication system has been successfully created for your Django backend.

---

## Files Created

### 1. **User Serializers**
**Location:** `/backend/users/serializers.py`

Contains:
- `UserSerializer` - For user details
- `UserRegistrationSerializer` - For registration with password validation
- `LoginSerializer` - For login authentication
- `UserProfileSerializer` - For profile updates (including password change)
- `DepartmentSerializer` - For department information
- `PasswordResetRequestSerializer` - For password reset requests
- `PasswordResetConfirmSerializer` - For confirming password reset

---

### 2. **Custom Permissions**
**Location:** `/backend/users/permissions.py`

Contains:
- `IsOwnerOrReadOnly` - Read for all, write for owner
- `IsAdmin` - Admin users only
- `IsManager` - Manager and admin users
- `IsFormManager` - Managers can manage their department's forms
- `IsOwnerOrAdmin` - Owner or admin access
- `IsOwnerOrManagerOrAdmin` - Owner, manager, or admin
- `ReadOnly` - Read-only access
- `IsSelfOrAdmin` - User can edit own profile, admin edits all
- `CanManageDepartment` - Can manage specific department

---

### 3. **API Directory Structure**
**Locations:**
- `/backend/api/__init__.py`
- `/backend/api/v1/__init__.py`
- `/backend/api/v1/urls.py` - Main API routing
- `/backend/api/v1/auth_views.py` - Authentication views

**API Views Created:**
- `RegisterView` - User registration
- `LoginView` - User login
- `LogoutView` - User logout with token blacklisting
- `UserProfileView` - Get/update user profile
- `PasswordResetRequestView` - Request password reset email
- `PasswordResetConfirmView` - Confirm password reset with token
- `TokenRefreshView` - Refresh JWT access token
- `UserDetailView` - View specific user details

---

### 4. **User ViewSets**
**Location:** `/backend/users/views.py`

Contains:
- `UserViewSet` - Complete CRUD for users with role-based filtering
  - List users (filtered by role)
  - Get user details
  - Activate/deactivate users
  - Get user statistics
  - Get current user (me endpoint)

- `DepartmentViewSet` - Complete CRUD for departments
  - List departments
  - Get department details
  - Get department users
  - Get sub-departments
  - Get department statistics

---

### 5. **URL Configuration**
**Locations:**
- `/backend/users/urls.py` - User app URLs
- `/backend/core/urls.py` - Main project URLs (updated)

---

### 6. **Admin Configuration**
**Location:** `/backend/users/admin.py`

Registered models:
- `User` - Custom admin with role-based fields
- `Department` - Department management
- `AuditLog` - Immutable audit log viewer

---

### 7. **Documentation**
**Location:** `/backend/AUTHENTICATION_README.md`

Complete documentation including:
- All API endpoints with examples
- Request/response formats
- Permission details
- User roles explanation
- Authentication flow
- Security features
- Testing examples

---

## API Endpoints Overview

### Authentication
- `POST /api/v1/auth/register/` - Register new user
- `POST /api/v1/auth/login/` - Login
- `POST /api/v1/auth/logout/` - Logout
- `POST /api/v1/auth/token/refresh/` - Refresh token
- `POST /api/v1/auth/token/verify/` - Verify token
- `GET /api/v1/auth/profile/` - Get profile
- `PUT/PATCH /api/v1/auth/profile/` - Update profile
- `POST /api/v1/auth/password-reset/` - Request password reset
- `POST /api/v1/auth/password-reset/confirm/` - Confirm password reset

### Users
- `GET /api/v1/users/` - List users
- `GET /api/v1/users/{id}/` - Get user details
- `GET /api/v1/users/me/` - Get current user
- `POST /api/v1/users/{id}/activate/` - Activate user (Admin)
- `POST /api/v1/users/{id}/deactivate/` - Deactivate user (Admin)
- `GET /api/v1/users/stats/` - Get user statistics

### Departments
- `GET /api/v1/departments/` - List departments
- `GET /api/v1/departments/{id}/` - Get department details
- `POST /api/v1/departments/` - Create department (Admin)
- `PUT/PATCH /api/v1/departments/{id}/` - Update department (Admin)
- `DELETE /api/v1/departments/{id}/` - Delete department (Admin)
- `GET /api/v1/departments/{id}/users/` - Get department users
- `GET /api/v1/departments/{id}/sub_departments/` - Get sub-departments
- `GET /api/v1/departments/stats/` - Get department statistics

---

## Next Steps

### 1. Run Migrations
```bash
cd /mnt/c/Users/tchye/Desktop/fyp_claude_code/backend
python manage.py makemigrations
python manage.py migrate
```

### 2. Create Superuser
```bash
python manage.py createsuperuser
```

Follow the prompts to create an admin account.

### 3. Create Test Data (Optional)
You can use Django shell to create test departments and users:

```bash
python manage.py shell
```

```python
from users.models import User, Department

# Create a department
dept = Department.objects.create(
    name="IT Department",
    code="IT",
    description="Information Technology Department"
)

# Create a manager
manager = User.objects.create_user(
    username="manager1",
    email="manager@example.com",
    password="ManagerPass123!",
    first_name="John",
    last_name="Manager",
    role=User.UserRole.MANAGER,
    department=dept
)

# Update department manager
dept.manager = manager
dept.save()

# Create a regular user
user = User.objects.create_user(
    username="user1",
    email="user@example.com",
    password="UserPass123!",
    first_name="Jane",
    last_name="User",
    role=User.UserRole.USER,
    department=dept
)
```

### 4. Run the Development Server
```bash
python manage.py runserver
```

The API will be available at: `http://localhost:8000/api/v1/`

### 5. Test the API

**Using cURL:**
```bash
# Register a new user
curl -X POST http://localhost:8000/api/v1/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "TestPass123!",
    "password_confirm": "TestPass123!",
    "first_name": "Test",
    "last_name": "User"
  }'

# Login
curl -X POST http://localhost:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email_or_username": "test@example.com",
    "password": "TestPass123!"
  }'
```

**Using Postman or Thunder Client:**
1. Import the endpoints from the documentation
2. Set up environment variables for tokens
3. Test each endpoint

### 6. Access Django Admin
```
URL: http://localhost:8000/admin/
```

Login with your superuser credentials to:
- Manage users
- Manage departments
- View audit logs
- Assign roles and permissions

---

## Features Implemented

### Security
- JWT token-based authentication
- Password validation (min 8 chars, complexity requirements)
- Token blacklisting on logout
- Token rotation on refresh
- Audit logging for all user actions
- IP address and user agent tracking

### User Management
- Registration with email verification setup
- Login with email or username
- Password reset via email
- Profile management with password change
- Role-based access control (Admin, Manager, User)
- User activation/deactivation

### Department Management
- Hierarchical department structure
- Department managers
- User-department relationships
- Department statistics

### Permissions
- Custom permission classes
- Role-based filtering
- Department-based access control
- Owner-based permissions

---

## Configuration

The system is configured via Django settings (`/backend/core/settings.py`):

### JWT Settings
- Access token lifetime: 60 minutes (configurable)
- Refresh token lifetime: 7 days (configurable)
- Token rotation: Enabled
- Token blacklisting: Enabled

### CORS Settings
- Allowed origins configured
- Credentials allowed
- Custom headers supported

### Email Settings
- Console backend by default (for development)
- SMTP configuration ready for production

---

## Project Structure

```
backend/
├── api/
│   ├── __init__.py
│   └── v1/
│       ├── __init__.py
│       ├── auth_views.py     # Authentication views
│       └── urls.py            # API routing
├── users/
│   ├── __init__.py
│   ├── admin.py               # Admin configuration
│   ├── models.py              # User, Department, AuditLog models
│   ├── serializers.py         # All serializers
│   ├── permissions.py         # Custom permissions
│   ├── views.py               # ViewSets
│   └── urls.py                # User app URLs
├── core/
│   ├── settings.py            # Django settings (JWT configured)
│   └── urls.py                # Main URL configuration (updated)
├── AUTHENTICATION_README.md   # Complete API documentation
└── AUTHENTICATION_SETUP_COMPLETE.md  # This file
```

---

## User Roles

### ADMIN (System Administrator)
- Full system access
- Can manage all users and departments
- Can view all data and analytics

### MANAGER (Form Manager)
- Can manage users in their department
- Can create and manage department forms
- Can view department submissions and analytics

### USER (Regular User)
- Can manage own profile
- Can fill out forms
- Can view own submissions
- Limited access to system data

---

## Testing Checklist

- [ ] Migrations run successfully
- [ ] Superuser created
- [ ] Test department created
- [ ] Test users created (admin, manager, regular user)
- [ ] Registration endpoint works
- [ ] Login endpoint works
- [ ] Token refresh works
- [ ] Profile retrieval works
- [ ] Profile update works
- [ ] Password change works
- [ ] Logout works
- [ ] User list works (with proper filtering)
- [ ] Department list works
- [ ] Admin panel accessible
- [ ] Audit logs being created

---

## Common Issues & Solutions

### Issue: Token Expired
**Solution:** Use the refresh token endpoint to get a new access token

### Issue: Permission Denied
**Solution:** Check user role and permissions for the endpoint

### Issue: Email Not Sending (Password Reset)
**Solution:** Configure SMTP settings in `.env` or use console backend for testing

### Issue: CORS Errors
**Solution:** Add your frontend URL to `CORS_ALLOWED_ORIGINS` in settings

---

## Support Resources

- **Django Documentation:** https://docs.djangoproject.com/
- **Django REST Framework:** https://www.django-rest-framework.org/
- **Django Simple JWT:** https://django-rest-framework-simplejwt.readthedocs.io/
- **Django CORS Headers:** https://github.com/adamchainz/django-cors-headers

---

## Environment Variables

Create a `.env` file in the backend directory:

```env
# Django Settings
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database (PostgreSQL)
DB_ENGINE=django.db.backends.postgresql
DB_NAME=ai_office_assistant
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432

# JWT Configuration
JWT_ACCESS_TOKEN_LIFETIME=60
JWT_REFRESH_TOKEN_LIFETIME=7
JWT_SECRET_KEY=your-jwt-secret-key

# Email Configuration
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password

# Frontend URL
FRONTEND_URL=http://localhost:5173

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

---

## Congratulations!

Your Django authentication system is now complete and ready to use! All endpoints are documented, permissions are configured, and the system follows Django REST Framework best practices.

For detailed API documentation, see: `AUTHENTICATION_README.md`
