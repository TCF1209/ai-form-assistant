# Authentication System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      DJANGO AUTHENTICATION SYSTEM                │
│                         (JWT Token-Based)                        │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Frontend   │────────▶│  Django API  │────────▶│  PostgreSQL  │
│ (React/Vue)  │◀────────│   (Backend)  │◀────────│   Database   │
└──────────────┘         └──────────────┘         └──────────────┘
      │                          │
      │ JWT Tokens              │ JWT Authentication
      │ HTTP Requests           │ Role-Based Access Control
      │                          │
      ▼                          ▼
  localStorage            Token Validation
  Session Storage         Permission Checking
                          Audit Logging
```

---

## Application Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          BACKEND STRUCTURE                       │
└─────────────────────────────────────────────────────────────────┘

backend/
│
├── core/                    # Django Project Configuration
│   ├── settings.py         # JWT, CORS, Database, Email config
│   ├── urls.py             # Main URL routing
│   └── wsgi.py
│
├── api/v1/                  # API Version 1
│   ├── auth_views.py       # Authentication endpoints
│   └── urls.py             # API routing
│
└── users/                   # Users Application
    ├── models.py           # User, Department, AuditLog models
    ├── serializers.py      # DRF serializers for API
    ├── permissions.py      # Custom permission classes
    ├── views.py            # ViewSets for CRUD operations
    ├── admin.py            # Django admin configuration
    └── urls.py             # User app URL routing
```

---

## Data Models

```
┌────────────────────────────────────────────────────────────────┐
│                         USER MODEL                              │
├────────────────────────────────────────────────────────────────┤
│ • id (UUID)                    • department (FK)               │
│ • username (unique)            • phone_number                  │
│ • email (unique)               • employee_id (unique)          │
│ • password (hashed)            • profile_picture               │
│ • first_name                   • is_email_verified             │
│ • last_name                    • is_active                     │
│ • role (ADMIN/MANAGER/USER)    • created_at                    │
│                                • updated_at                    │
│                                • last_activity                 │
└────────────────────────────────────────────────────────────────┘
                          │
                          │ belongs to
                          ▼
┌────────────────────────────────────────────────────────────────┐
│                      DEPARTMENT MODEL                           │
├────────────────────────────────────────────────────────────────┤
│ • id (UUID)                    • manager (FK to User)          │
│ • name (unique)                • is_active                     │
│ • code (unique)                • created_at                    │
│ • description                  • updated_at                    │
│ • parent (self-referencing)                                    │
└────────────────────────────────────────────────────────────────┘
                          │
                          │ tracks actions
                          ▼
┌────────────────────────────────────────────────────────────────┐
│                       AUDIT LOG MODEL                           │
├────────────────────────────────────────────────────────────────┤
│ • id (UUID)                    • object_repr                   │
│ • user (FK)                    • changes (JSON)                │
│ • action (enum)                • ip_address                    │
│ • model_name                   • user_agent                    │
│ • object_id                    • timestamp                     │
└────────────────────────────────────────────────────────────────┘
```

---

## Authentication Flow

### 1. User Registration Flow

```
┌──────────┐         ┌──────────┐         ┌──────────┐
│  Client  │         │   API    │         │ Database │
└────┬─────┘         └────┬─────┘         └────┬─────┘
     │                    │                     │
     │ POST /register/    │                     │
     │ (user data)        │                     │
     ├───────────────────▶│                     │
     │                    │                     │
     │                    │ Validate data       │
     │                    │ Hash password       │
     │                    │                     │
     │                    │ Create user         │
     │                    ├────────────────────▶│
     │                    │◀────────────────────┤
     │                    │                     │
     │                    │ Generate JWT tokens │
     │                    │ Create audit log    │
     │                    │                     │
     │ 201 Created        │                     │
     │ + JWT tokens       │                     │
     │◀───────────────────┤                     │
     │                    │                     │
```

### 2. User Login Flow

```
┌──────────┐         ┌──────────┐         ┌──────────┐
│  Client  │         │   API    │         │ Database │
└────┬─────┘         └────┬─────┘         └────┬─────┘
     │                    │                     │
     │ POST /login/       │                     │
     │ (email/password)   │                     │
     ├───────────────────▶│                     │
     │                    │                     │
     │                    │ Find user           │
     │                    ├────────────────────▶│
     │                    │◀────────────────────┤
     │                    │                     │
     │                    │ Verify password     │
     │                    │                     │
     │                    │ Generate JWT tokens │
     │                    │ Update last_activity│
     │                    │ Create audit log    │
     │                    ├────────────────────▶│
     │                    │                     │
     │ 200 OK             │                     │
     │ + JWT tokens       │                     │
     │ + user data        │                     │
     │◀───────────────────┤                     │
     │                    │                     │
```

### 3. Protected Resource Access Flow

```
┌──────────┐         ┌──────────┐         ┌──────────┐
│  Client  │         │   API    │         │ Database │
└────┬─────┘         └────┬─────┘         └────┬─────┘
     │                    │                     │
     │ GET /profile/      │                     │
     │ Authorization:     │                     │
     │ Bearer <token>     │                     │
     ├───────────────────▶│                     │
     │                    │                     │
     │                    │ Verify JWT token    │
     │                    │ Extract user_id     │
     │                    │                     │
     │                    │ Get user data       │
     │                    ├────────────────────▶│
     │                    │◀────────────────────┤
     │                    │                     │
     │                    │ Check permissions   │
     │                    │                     │
     │ 200 OK             │                     │
     │ + user profile     │                     │
     │◀───────────────────┤                     │
     │                    │                     │
```

### 4. Token Refresh Flow

```
┌──────────┐         ┌──────────┐
│  Client  │         │   API    │
└────┬─────┘         └────┬─────┘
     │                    │
     │ Access token       │
     │ expired (401)      │
     │                    │
     │ POST /token/       │
     │      refresh/      │
     │ (refresh token)    │
     ├───────────────────▶│
     │                    │
     │                    │ Verify refresh token
     │                    │ Blacklist old token
     │                    │ Generate new tokens
     │                    │
     │ 200 OK             │
     │ + new access token │
     │ + new refresh token│
     │◀───────────────────┤
     │                    │
     │ Retry request with │
     │ new access token   │
     ├───────────────────▶│
     │                    │
```

---

## Role-Based Access Control (RBAC)

```
┌─────────────────────────────────────────────────────────────────┐
│                      USER ROLE HIERARCHY                         │
└─────────────────────────────────────────────────────────────────┘

                        ┌────────────┐
                        │   ADMIN    │
                        │ (Full      │
                        │  Access)   │
                        └─────┬──────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
              ┌─────▼──────┐      ┌────▼──────┐
              │  MANAGER   │      │   USER    │
              │ (Dept      │      │ (Limited  │
              │  Access)   │      │  Access)  │
              └────────────┘      └───────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Role          │ Permissions                                      │
├───────────────┼──────────────────────────────────────────────────┤
│ ADMIN         │ • Manage all users and departments              │
│               │ • Create/update/delete any resource             │
│               │ • View all data and analytics                   │
│               │ • Access system settings                        │
│               │ • View audit logs                               │
├───────────────┼──────────────────────────────────────────────────┤
│ MANAGER       │ • Manage users in their department             │
│               │ • Create/manage department forms                │
│               │ • View department submissions                   │
│               │ • View department analytics                     │
│               │ • Approve/reject submissions                    │
├───────────────┼──────────────────────────────────────────────────┤
│ USER          │ • View/update own profile                       │
│               │ • Fill out forms                                │
│               │ • View own submissions                          │
│               │ • View department information (read-only)       │
│               │ • Upload documents                              │
└───────────────┴──────────────────────────────────────────────────┘
```

---

## Permission Classes

```
┌─────────────────────────────────────────────────────────────────┐
│                    CUSTOM PERMISSION CLASSES                     │
└─────────────────────────────────────────────────────────────────┘

IsOwnerOrReadOnly
├─ Read: Any authenticated user
└─ Write: Only the object owner

IsAdmin
├─ All operations: Admin users only
└─ Blocks: Manager and User roles

IsManager
├─ All operations: Manager and Admin users
└─ Blocks: User role

IsFormManager
├─ Managers can manage department forms
├─ Admins have full access
└─ Users can only view/fill forms

IsSelfOrAdmin
├─ Users can edit own profile
└─ Admins can edit any profile

IsOwnerOrManagerOrAdmin
├─ Owner can access their data
├─ Manager can access department data
└─ Admin can access all data

CanManageDepartment
├─ Check if user can manage specific department
├─ Admins: All departments
└─ Managers: Their department only
```

---

## API Endpoint Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                       API ENDPOINTS MAP                          │
└─────────────────────────────────────────────────────────────────┘

/api/v1/
│
├── auth/                           # Authentication endpoints
│   ├── register/                  [POST]   Public
│   ├── login/                     [POST]   Public
│   ├── logout/                    [POST]   Authenticated
│   ├── token/
│   │   ├── refresh/              [POST]   Public
│   │   └── verify/               [POST]   Public
│   ├── profile/                   [GET/PUT/PATCH] Authenticated
│   ├── users/<id>/               [GET]    Authenticated
│   └── password-reset/
│       ├── /                     [POST]   Public
│       └── confirm/              [POST]   Public
│
├── users/                          # User management
│   ├── /                         [GET/POST] Authenticated/Admin
│   ├── <id>/                     [GET/PUT/PATCH/DELETE] Authenticated/Admin
│   ├── me/                       [GET]    Authenticated
│   ├── <id>/activate/            [POST]   Admin
│   ├── <id>/deactivate/          [POST]   Admin
│   └── stats/                    [GET]    Admin/Manager
│
└── departments/                    # Department management
    ├── /                         [GET/POST] Authenticated/Admin
    ├── <id>/                     [GET/PUT/PATCH/DELETE] Authenticated/Admin
    ├── <id>/users/               [GET]    Authenticated
    ├── <id>/sub_departments/     [GET]    Authenticated
    └── stats/                    [GET]    Admin
```

---

## Security Features

```
┌─────────────────────────────────────────────────────────────────┐
│                      SECURITY MEASURES                           │
└─────────────────────────────────────────────────────────────────┘

1. Authentication Security
   ├─ JWT token-based authentication
   ├─ Access tokens: 60 minutes lifetime
   ├─ Refresh tokens: 7 days lifetime
   ├─ Token rotation on refresh
   └─ Token blacklisting on logout

2. Password Security
   ├─ Minimum 8 characters
   ├─ Cannot be too similar to user info
   ├─ Cannot be common password
   ├─ Cannot be entirely numeric
   └─ Hashed with PBKDF2 algorithm

3. CORS Protection
   ├─ Configured allowed origins
   ├─ Credentials allowed
   └─ Restricted methods and headers

4. Audit Logging
   ├─ All user actions logged
   ├─ IP address tracking
   ├─ User agent tracking
   ├─ Timestamp recording
   └─ Change tracking (JSON)

5. Permission Checks
   ├─ Role-based access control
   ├─ Object-level permissions
   ├─ Department-based filtering
   └─ Owner-based access

6. Data Validation
   ├─ Email validation
   ├─ Unique constraints
   ├─ Required fields
   └─ Custom validators
```

---

## Database Schema Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                   DATABASE RELATIONSHIPS                         │
└─────────────────────────────────────────────────────────────────┘

Department (Parent)
    │
    │ 1:N (users)
    ▼
User
    │
    │ 1:1 (manager)
    ├────────────────┐
    │                │
    │                ▼
    │         Department (Managed)
    │
    │ 1:N (audit_logs)
    ▼
AuditLog

Relationship Details:
├─ User.department ──▶ Department (Many-to-One)
├─ Department.manager ──▶ User (One-to-One)
├─ Department.parent ──▶ Department (Self-referencing)
└─ AuditLog.user ──▶ User (Many-to-One)
```

---

## JWT Token Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                      JWT TOKEN STRUCTURE                         │
└─────────────────────────────────────────────────────────────────┘

Access Token:
{
  "token_type": "access",
  "exp": 1234567890,          # Expiration timestamp
  "iat": 1234567890,          # Issued at timestamp
  "jti": "unique-token-id",   # JWT ID
  "user_id": "uuid-here"      # User UUID
}

Refresh Token:
{
  "token_type": "refresh",
  "exp": 1234567890,          # Expiration timestamp
  "iat": 1234567890,          # Issued at timestamp
  "jti": "unique-token-id",   # JWT ID
  "user_id": "uuid-here"      # User UUID
}

Token Usage:
1. Client receives both tokens on login/register
2. Client stores tokens (localStorage/sessionStorage)
3. Client includes access token in Authorization header
4. When access token expires, use refresh token
5. On logout, refresh token is blacklisted
```

---

## Request/Response Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   TYPICAL REQUEST FLOW                           │
└─────────────────────────────────────────────────────────────────┘

Client Request
    │
    ├─ Headers: Authorization: Bearer <token>
    ├─ Method: GET/POST/PUT/PATCH/DELETE
    └─ Body: JSON data (for POST/PUT/PATCH)
    │
    ▼
CORS Middleware ──▶ Check origin, headers, methods
    │
    ▼
JWT Authentication ──▶ Verify token, extract user
    │
    ▼
Permission Check ──▶ Check user role & permissions
    │
    ▼
View Processing ──▶ Serialization & validation
    │
    ▼
Database Query ──▶ Role-based filtering
    │
    ▼
Response Generation ──▶ JSON serialization
    │
    ▼
Audit Logging ──▶ Record action, IP, user agent
    │
    ▼
Response to Client
    │
    ├─ Status Code: 200/201/400/401/403/404/500
    ├─ Headers: Content-Type: application/json
    └─ Body: JSON response data
```

---

## Error Handling

```
┌─────────────────────────────────────────────────────────────────┐
│                      ERROR RESPONSES                             │
└─────────────────────────────────────────────────────────────────┘

400 Bad Request
├─ Invalid data format
├─ Validation errors
└─ Missing required fields

401 Unauthorized
├─ Missing authentication token
├─ Invalid token
└─ Expired token

403 Forbidden
├─ Insufficient permissions
└─ Role not authorized

404 Not Found
├─ Resource does not exist
└─ Endpoint not found

500 Internal Server Error
├─ Database connection issues
├─ Unexpected exceptions
└─ Server misconfiguration

Example Error Response:
{
  "error": "Invalid credentials",
  "detail": "Username or password is incorrect"
}

Example Validation Error:
{
  "password": [
    "This password is too short.",
    "This password is too common."
  ]
}
```

---

## Deployment Considerations

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT CHECKLIST                          │
└─────────────────────────────────────────────────────────────────┘

Environment Configuration:
├─ Set DEBUG=False
├─ Use strong SECRET_KEY
├─ Configure allowed hosts
├─ Use PostgreSQL (not SQLite)
└─ Set up proper email backend

Security:
├─ Enable HTTPS (SSL/TLS)
├─ Set secure cookie flags
├─ Configure CORS properly
├─ Set up rate limiting
└─ Enable security headers

Database:
├─ Use production database
├─ Set up backups
├─ Configure connection pooling
└─ Enable SSL connections

Static & Media Files:
├─ Configure static file serving
├─ Set up media file storage (S3/Azure)
├─ Enable file upload limits
└─ Configure CDN

Monitoring:
├─ Set up error tracking (Sentry)
├─ Configure logging
├─ Monitor performance
└─ Set up alerts

Performance:
├─ Enable caching (Redis)
├─ Set up load balancing
├─ Configure async tasks (Celery)
└─ Optimize database queries
```

---

This architecture document provides a comprehensive overview of the authentication system's structure, flow, and components.
