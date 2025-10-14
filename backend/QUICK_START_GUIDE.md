# Quick Start Guide - Authentication System

## Prerequisites

- Python 3.8+ installed
- PostgreSQL installed (or use SQLite for development)
- Virtual environment activated

---

## Step-by-Step Setup

### Step 1: Install Dependencies

```bash
cd /mnt/c/Users/tchye/Desktop/fyp_claude_code/backend
pip install -r requirements.txt
```

If `requirements.txt` doesn't exist, install manually:

```bash
pip install django djangorestframework django-cors-headers djangorestframework-simplejwt python-dotenv psycopg2-binary Pillow
```

---

### Step 2: Configure Environment Variables

Create a `.env` file in the backend directory:

```bash
# Create .env file
touch .env
```

Add the following content to `.env`:

```env
# Django Settings
SECRET_KEY=django-insecure-your-secret-key-change-in-production
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database (SQLite for development)
# Leave DB_PASSWORD empty to use SQLite
DB_ENGINE=django.db.backends.postgresql
DB_NAME=ai_office_assistant
DB_USER=postgres
DB_PASSWORD=
DB_HOST=localhost
DB_PORT=5432

# JWT Configuration
JWT_ACCESS_TOKEN_LIFETIME=60
JWT_REFRESH_TOKEN_LIFETIME=7
JWT_SECRET_KEY=your-jwt-secret-key

# Email Configuration (Console backend for development)
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend

# Frontend URL
FRONTEND_URL=http://localhost:5173

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

---

### Step 3: Run Migrations

```bash
python manage.py makemigrations
python manage.py migrate
```

Expected output:
```
Operations to perform:
  Apply all migrations: admin, auth, contenttypes, sessions, users
Running migrations:
  Applying contenttypes.0001_initial... OK
  Applying users.0001_initial... OK
  ...
```

---

### Step 4: Create Test Data

```bash
python manage.py shell < create_test_data.py
```

Or manually in Django shell:

```bash
python manage.py shell
>>> exec(open('create_test_data.py').read())
```

This creates:
- 4 departments (IT, HR, Finance, Marketing)
- 1 admin user
- 2 manager users
- 5 regular users

---

### Step 5: Start the Development Server

```bash
python manage.py runserver
```

Server will start at: `http://localhost:8000`

---

### Step 6: Test the API

#### Option A: Using the Test Script

```bash
# In a new terminal (keep the server running)
python test_api.py
```

#### Option B: Using cURL

```bash
# Test registration
curl -X POST http://localhost:8000/api/v1/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "email": "newuser@example.com",
    "password": "NewPass123!",
    "password_confirm": "NewPass123!",
    "first_name": "New",
    "last_name": "User"
  }'

# Test login
curl -X POST http://localhost:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email_or_username": "admin@example.com",
    "password": "Admin123!"
  }'
```

#### Option C: Using Django Admin

1. Navigate to: `http://localhost:8000/admin/`
2. Login with admin credentials:
   - Username: `admin`
   - Password: `Admin123!`
3. Explore Users, Departments, and Audit Logs

---

## Test Credentials

After running `create_test_data.py`, you can use these credentials:

### Admin User
```
Username: admin
Email: admin@example.com
Password: Admin123!
```

### Manager Users
```
IT Manager:
  Username: it_manager
  Email: it.manager@example.com
  Password: Manager123!

HR Manager:
  Username: hr_manager
  Email: hr.manager@example.com
  Password: Manager123!
```

### Regular Users
All regular users have password: `User123!`
```
john_doe / john.doe@example.com
jane_smith / jane.smith@example.com
bob_wilson / bob.wilson@example.com
alice_brown / alice.brown@example.com
charlie_davis / charlie.davis@example.com
```

---

## API Endpoints Quick Reference

### Authentication
```
POST   /api/v1/auth/register/           - Register new user
POST   /api/v1/auth/login/              - Login
POST   /api/v1/auth/logout/             - Logout
POST   /api/v1/auth/token/refresh/      - Refresh token
POST   /api/v1/auth/token/verify/       - Verify token
GET    /api/v1/auth/profile/            - Get profile
PUT    /api/v1/auth/profile/            - Update profile
PATCH  /api/v1/auth/profile/            - Partial update profile
POST   /api/v1/auth/password-reset/     - Request password reset
POST   /api/v1/auth/password-reset/confirm/ - Confirm password reset
```

### Users
```
GET    /api/v1/users/                   - List users
GET    /api/v1/users/{id}/              - Get user details
GET    /api/v1/users/me/                - Get current user
POST   /api/v1/users/{id}/activate/     - Activate user (Admin)
POST   /api/v1/users/{id}/deactivate/   - Deactivate user (Admin)
GET    /api/v1/users/stats/             - Get user statistics
```

### Departments
```
GET    /api/v1/departments/             - List departments
GET    /api/v1/departments/{id}/        - Get department details
POST   /api/v1/departments/             - Create department (Admin)
PUT    /api/v1/departments/{id}/        - Update department (Admin)
PATCH  /api/v1/departments/{id}/        - Partial update (Admin)
DELETE /api/v1/departments/{id}/        - Delete department (Admin)
GET    /api/v1/departments/{id}/users/  - Get department users
GET    /api/v1/departments/{id}/sub_departments/ - Get sub-departments
GET    /api/v1/departments/stats/       - Get department statistics
```

---

## Common Commands

### Create a superuser manually
```bash
python manage.py createsuperuser
```

### Clear database and start fresh
```bash
python manage.py flush
python manage.py migrate
python manage.py shell < create_test_data.py
```

### Run tests
```bash
python manage.py test users
```

### Create new migrations
```bash
python manage.py makemigrations
```

### Apply migrations
```bash
python manage.py migrate
```

### Check project status
```bash
python manage.py check
```

---

## Project Structure

```
backend/
├── api/                          # API package
│   └── v1/                       # API version 1
│       ├── __init__.py
│       ├── auth_views.py         # Authentication views
│       └── urls.py               # API routing
│
├── core/                         # Django project settings
│   ├── __init__.py
│   ├── settings.py               # Project settings
│   ├── urls.py                   # Main URL routing
│   └── wsgi.py
│
├── users/                        # Users app
│   ├── __init__.py
│   ├── admin.py                  # Admin configuration
│   ├── models.py                 # User, Department, AuditLog models
│   ├── serializers.py            # DRF serializers
│   ├── permissions.py            # Custom permissions
│   ├── views.py                  # ViewSets
│   └── urls.py                   # Users app URLs
│
├── .env                          # Environment variables (create this)
├── manage.py                     # Django management script
├── requirements.txt              # Python dependencies (create this)
├── create_test_data.py           # Script to create test data
├── test_api.py                   # API testing script
├── AUTHENTICATION_README.md      # Complete API documentation
├── AUTHENTICATION_SETUP_COMPLETE.md # Setup completion guide
└── QUICK_START_GUIDE.md          # This file
```

---

## Troubleshooting

### Issue: "No module named 'rest_framework'"
**Solution:** Install dependencies
```bash
pip install djangorestframework
```

### Issue: "ModuleNotFoundError: No module named 'users'"
**Solution:** Make sure you're in the correct directory
```bash
cd /mnt/c/Users/tchye/Desktop/fyp_claude_code/backend
python manage.py runserver
```

### Issue: Migration errors
**Solution:** Reset migrations
```bash
python manage.py migrate --run-syncdb
```

### Issue: "Port is already in use"
**Solution:** Use a different port
```bash
python manage.py runserver 8001
```

### Issue: CORS errors from frontend
**Solution:** Add your frontend URL to CORS_ALLOWED_ORIGINS in settings.py

### Issue: Token expired
**Solution:** Use the refresh token endpoint to get a new access token

---

## Next Steps

1. **Integrate with Frontend**
   - Use the API endpoints in your React/Vue/Angular frontend
   - Store JWT tokens in localStorage or httpOnly cookies
   - Implement token refresh logic

2. **Add More Features**
   - Email verification for new users
   - Two-factor authentication
   - Social media login
   - File upload for profile pictures

3. **Deploy to Production**
   - Set DEBUG=False
   - Use PostgreSQL instead of SQLite
   - Configure proper email backend (SMTP)
   - Set up HTTPS
   - Use environment variables for secrets

4. **Enhance Security**
   - Implement rate limiting
   - Add CAPTCHA for registration
   - Set up monitoring and logging
   - Regular security audits

---

## Documentation

- **Complete API Documentation:** `AUTHENTICATION_README.md`
- **Setup Guide:** `AUTHENTICATION_SETUP_COMPLETE.md`
- **This Quick Start:** `QUICK_START_GUIDE.md`

---

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review the error messages in the terminal
3. Check Django documentation: https://docs.djangoproject.com/
4. Check DRF documentation: https://www.django-rest-framework.org/

---

## Checklist

- [ ] Dependencies installed
- [ ] `.env` file created and configured
- [ ] Migrations run successfully
- [ ] Test data created
- [ ] Server running
- [ ] Can access admin panel
- [ ] API endpoints tested
- [ ] Frontend integration started

---

**Congratulations! Your authentication system is ready to use!**

For detailed endpoint documentation, see: `AUTHENTICATION_README.md`
