# AI Office Assistant - Frontend Structure

## Overview
This document describes the complete frontend structure for the AI-Powered Office Assistant application. The frontend is built with React, Vite, TailwindCSS, and includes a comprehensive authentication system with JWT token management.

## Directory Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Auth/
│   │   │   ├── ProtectedRoute.jsx       # Route protection wrapper
│   │   │   └── RoleBasedRoute.jsx       # Role-based access control
│   │   ├── Common/                      # Common reusable components
│   │   └── Layout/
│   │       ├── AuthLayout.jsx           # Layout for authentication pages
│   │       ├── Header.jsx               # App header with user menu
│   │       ├── MainLayout.jsx           # Main app layout with sidebar
│   │       └── Sidebar.jsx              # Navigation sidebar
│   ├── contexts/
│   │   ├── AuthContext.jsx              # Authentication state management
│   │   └── ThemeContext.jsx             # Theme management (dark/light)
│   ├── hooks/
│   │   ├── useApi.js                    # API call hook with loading states
│   │   ├── useAuth.js                   # Authentication hook
│   │   └── useTheme.js                  # Theme management hook
│   ├── pages/
│   │   ├── Dashboard/
│   │   │   └── Dashboard.jsx            # Main dashboard page
│   │   ├── Login/
│   │   │   └── Login.jsx                # Login page
│   │   ├── Profile/
│   │   │   └── Profile.jsx              # User profile page
│   │   └── Register/
│   │       └── Register.jsx             # Registration page
│   ├── services/
│   │   ├── api.js                       # Axios configuration with interceptors
│   │   ├── authService.js               # Authentication API calls
│   │   └── userService.js               # User-related API calls
│   ├── styles/                          # Global styles and CSS
│   ├── utils/
│   │   ├── constants.js                 # App constants and enums
│   │   ├── helpers.js                   # Helper functions
│   │   └── validators.js                # Form validation rules
│   ├── App.jsx                          # Main app component with routing
│   └── main.jsx                         # Application entry point
├── .env                                 # Environment variables
├── package.json                         # Dependencies and scripts
├── vite.config.js                       # Vite configuration
└── tailwind.config.js                   # TailwindCSS configuration
```

## Key Features

### 1. Authentication System

**JWT Token Management**
- Access token stored in localStorage
- Refresh token for automatic token renewal
- Automatic token refresh on 401 errors
- Token verification on app initialization

**Auth Context** (`src/contexts/AuthContext.jsx`)
- Global authentication state
- Login, register, logout functions
- Role-based access control helpers
- User profile management

**Auth Services** (`src/services/authService.js`)
- Login/Register API calls
- Token refresh mechanism
- Password reset functionality
- Session management

### 2. API Layer

**Axios Configuration** (`src/services/api.js`)
- Base URL configuration from environment
- Request interceptor for JWT tokens
- Response interceptor for automatic token refresh
- Error handling and retry logic

**User Services** (`src/services/userService.js`)
- Profile management
- Avatar upload/delete
- User preferences
- Notifications
- Activity logs

### 3. Routing System

**Route Protection**
- `ProtectedRoute`: Requires authentication
- `RoleBasedRoute`: Requires specific user roles
- Automatic redirect to login
- Preserve intended destination after login

**Route Structure**
```javascript
/ → /dashboard (redirect)
/login → Public login page
/register → Public registration page
/dashboard → Protected dashboard
/tasks → Protected tasks page
/calendar → Protected calendar page
/documents → Protected documents page
/chat → Protected chat page
/profile → Protected profile page
/settings → Protected settings page
```

### 4. Theme System

**Theme Context** (`src/contexts/ThemeContext.jsx`)
- Light/Dark mode toggle
- System preference detection
- Persistent theme storage
- Custom primary color support

**Features**
- Automatic dark mode based on system preference
- Manual theme toggle
- CSS custom properties for theming
- TailwindCSS dark mode classes

### 5. Layout Components

**MainLayout**
- Responsive sidebar navigation
- Header with user menu
- Theme toggle
- Notifications
- Mobile-friendly

**AuthLayout**
- Clean authentication pages
- Branded header
- Centered content
- Responsive design

**Sidebar**
- Collapsible on mobile
- Active route highlighting
- User profile section
- Navigation links

**Header**
- Theme toggle button
- Notification bell
- User dropdown menu
- Mobile menu trigger

### 6. Utility Functions

**Helpers** (`src/utils/helpers.js`)
- Date formatting
- Text manipulation
- File size formatting
- Debounce/Throttle functions
- Clipboard operations
- Query string parsing

**Validators** (`src/utils/validators.js`)
- Email validation
- Password strength checking
- Phone number validation
- URL validation
- Form validation framework
- File upload validation

**Constants** (`src/utils/constants.js`)
- API endpoints
- User roles
- Task status/priority
- File upload limits
- Error/Success messages
- Regex patterns

### 7. Custom Hooks

**useAuth**
- Access authentication context
- Get current user
- Check authentication status
- Role-based permissions

**useApi**
- API call wrapper with loading states
- Error handling
- Data state management
- Refetch functionality

**useTheme**
- Access theme context
- Toggle theme
- Get current theme
- Update colors

## Environment Variables

Create a `.env` file in the frontend root:

```env
VITE_API_URL=http://localhost:8000/api/v1
VITE_APP_NAME=AI Office Assistant
```

## Getting Started

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## API Integration

### Authentication Flow

1. User submits login credentials
2. Frontend sends POST to `/api/v1/auth/token/`
3. Backend returns access & refresh tokens
4. Tokens stored in localStorage
5. Access token sent with each request
6. On 401 error, attempt token refresh
7. If refresh fails, redirect to login

### API Request Example

```javascript
import api from './services/api';

// GET request
const data = await api.get('/endpoint/');

// POST request
const data = await api.post('/endpoint/', { data });

// PUT request
const data = await api.put('/endpoint/', { data });

// DELETE request
await api.delete('/endpoint/');
```

## Security Considerations

1. **Token Storage**: Tokens stored in localStorage (consider httpOnly cookies for production)
2. **XSS Protection**: Sanitize user input
3. **CSRF Protection**: CSRF tokens for state-changing operations
4. **HTTPS**: Always use HTTPS in production
5. **Token Expiry**: Short-lived access tokens with refresh mechanism
6. **Role Validation**: Server-side role validation (client-side is for UX only)

## Styling

The application uses TailwindCSS with:
- Dark mode support
- Responsive design
- Custom color scheme
- Utility-first approach

## Code Organization Best Practices

1. **Components**: Small, reusable, single responsibility
2. **Hooks**: Extract reusable logic
3. **Services**: API calls separated from components
4. **Utils**: Pure functions for common operations
5. **Constants**: Centralized configuration
6. **Contexts**: Global state management

## Next Steps

### Planned Features

1. **Task Management**
   - Create/Edit/Delete tasks
   - Task assignment
   - Priority and status management
   - Due date tracking

2. **Calendar Integration**
   - Event scheduling
   - Meeting management
   - Calendar views (day/week/month)
   - Reminders

3. **Document Management**
   - File upload/download
   - Document preview
   - Version control
   - Sharing and permissions

4. **Chat System**
   - Real-time messaging
   - AI assistant integration
   - File sharing
   - Message history

5. **Notifications**
   - Real-time notifications
   - Push notifications
   - Email notifications
   - Notification preferences

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure backend CORS settings allow frontend origin
2. **Token Issues**: Clear localStorage and re-login
3. **API Connection**: Check VITE_API_URL in .env
4. **Build Errors**: Delete node_modules and reinstall

## Contributing

1. Follow existing code style
2. Write clear component documentation
3. Add PropTypes or TypeScript types
4. Test all features before committing
5. Update this documentation for major changes

## License

This project is part of the AI-Powered Office Assistant FYP.
