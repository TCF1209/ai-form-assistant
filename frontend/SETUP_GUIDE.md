# Frontend Setup Guide

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Backend API running at `http://localhost:8000`

## Quick Start

### 1. Install Dependencies

```bash
cd /mnt/c/Users/tchye/Desktop/fyp_claude_code/frontend
npm install
```

### 2. Install Additional Required Packages

The following packages are required for the frontend to work:

```bash
npm install axios date-fns
```

### 3. Verify Environment Configuration

Check that `.env` file exists with:

```env
VITE_API_URL=http://localhost:8000/api/v1
VITE_APP_NAME=AI Office Assistant
```

### 4. Verify TailwindCSS Configuration

Ensure `tailwind.config.js` includes:

```javascript
module.exports = {
  darkMode: 'class', // Enable dark mode
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

### 5. Update `index.css` or Global Styles

Add TailwindCSS directives if not already present:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### 6. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Backend Requirements

### Django Backend Must Have:

1. **CORS Configuration** - Allow frontend origin:
   ```python
   CORS_ALLOWED_ORIGINS = [
       "http://localhost:5173",
       "http://127.0.0.1:5173",
   ]
   ```

2. **JWT Authentication Endpoints**:
   - `POST /api/v1/auth/token/` - Login (returns access & refresh tokens)
   - `POST /api/v1/auth/token/refresh/` - Refresh access token
   - `POST /api/v1/auth/token/verify/` - Verify token
   - `POST /api/v1/auth/register/` - User registration
   - `POST /api/v1/auth/logout/` - Logout

3. **Expected Response Format** for Login:
   ```json
   {
     "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
     "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
     "user": {
       "id": 1,
       "email": "user@example.com",
       "first_name": "John",
       "last_name": "Doe",
       "role": "user"
     }
   }
   ```

## Testing the Application

### 1. Test Authentication Flow

1. Navigate to `http://localhost:5173`
2. Should redirect to `/login`
3. Click "create a new account" to test registration
4. Fill in registration form and submit
5. Should auto-login and redirect to dashboard
6. Test logout from user menu in header
7. Test login again with created credentials

### 2. Test Theme Toggle

1. Click the sun/moon icon in the header
2. Theme should toggle between light and dark mode
3. Preference should persist on page reload

### 3. Test Navigation

1. Click sidebar menu items
2. Verify active state highlighting
3. Test mobile menu (resize browser to mobile width)
4. Click outside sidebar to close on mobile

### 4. Test Protected Routes

1. Logout if logged in
2. Try accessing `http://localhost:5173/dashboard` directly
3. Should redirect to login
4. After login, should redirect back to dashboard

## Common Issues and Solutions

### Issue 1: "Module not found" errors

**Solution**: Install missing dependencies
```bash
npm install axios date-fns
```

### Issue 2: CORS errors in browser console

**Solution**: Ensure Django backend has proper CORS configuration
```python
# settings.py
INSTALLED_APPS = [
    ...
    'corsheaders',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    ...
]

CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
]
```

### Issue 3: 401 Unauthorized errors

**Solution**:
- Clear localStorage: `localStorage.clear()`
- Re-login
- Check that backend JWT authentication is working

### Issue 4: Dark mode not working

**Solution**: Ensure TailwindCSS dark mode is enabled:
```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'class', // Must be 'class'
  ...
}
```

### Issue 5: API calls failing

**Solution**:
- Verify backend is running at `http://localhost:8000`
- Check `.env` file has correct `VITE_API_URL`
- Restart Vite dev server after changing `.env`

### Issue 6: Styles not loading

**Solution**:
- Verify TailwindCSS is installed: `npm list tailwindcss`
- Check `index.css` has TailwindCSS directives
- Clear cache and rebuild: `npm run dev`

## Development Workflow

### Adding New Pages

1. Create page component in `/src/pages/`
2. Add route in `/src/App.jsx`
3. Add navigation link in `/src/components/layout/Sidebar.jsx`

Example:
```jsx
// 1. Create /src/pages/NewPage/NewPage.jsx
const NewPage = () => {
  return <div>New Page Content</div>;
};

export default NewPage;

// 2. Add route in App.jsx
import NewPage from './pages/NewPage/NewPage';

<Route path="/new-page" element={<NewPage />} />

// 3. Add sidebar link in Sidebar.jsx
{
  name: 'New Page',
  href: '/new-page',
  icon: <svg>...</svg>,
}
```

### Adding New API Services

1. Create service function in `/src/services/`
2. Use the `api` instance for authenticated requests
3. Handle errors appropriately

Example:
```javascript
// /src/services/taskService.js
import api from './api';

export const taskService = {
  getTasks: async () => {
    const response = await api.get('/tasks/');
    return response.data;
  },

  createTask: async (taskData) => {
    const response = await api.post('/tasks/', taskData);
    return response.data;
  },
};
```

### Using Custom Hooks

```jsx
import { useAuth } from '../hooks/useAuth';
import { useApi } from '../hooks/useApi';
import { useTheme } from '../hooks/useTheme';

function MyComponent() {
  const { user, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { data, loading, execute } = useApi(apiFunction);

  // Component logic
}
```

## Build for Production

### 1. Build the Application

```bash
npm run build
```

### 2. Preview Production Build

```bash
npm run preview
```

### 3. Deploy

The build output will be in the `dist/` folder. Deploy this folder to your hosting service:

- **Vercel**: `vercel deploy`
- **Netlify**: `netlify deploy --prod`
- **GitHub Pages**: Configure with `vite.config.js` base path
- **Custom Server**: Serve the `dist/` folder with a static file server

### 4. Environment Variables for Production

Create production environment variables:
- Update `VITE_API_URL` to production backend URL
- Add any other production-specific variables

## Project Structure Overview

```
frontend/src/
├── components/
│   ├── Auth/              # Authentication components
│   └── layout/            # Layout components
├── contexts/              # React Context providers
├── hooks/                 # Custom React hooks
├── pages/                 # Page components
├── services/              # API service functions
├── utils/                 # Utility functions
├── App.jsx               # Main app component
└── main.jsx              # Entry point
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint (if configured)

## Best Practices

1. **Always use the `api` instance** from `/src/services/api.js` for API calls
2. **Use custom hooks** (`useAuth`, `useApi`, `useTheme`) instead of accessing contexts directly
3. **Validate forms** using validators from `/src/utils/validators.js`
4. **Use constants** from `/src/utils/constants.js` instead of hardcoding values
5. **Handle errors** properly with try-catch and display user-friendly messages
6. **Test authentication flow** before implementing new features

## Security Checklist

- [ ] HTTPS enabled in production
- [ ] Environment variables not committed to git
- [ ] CORS properly configured on backend
- [ ] Input validation on all forms
- [ ] XSS protection (sanitize user input)
- [ ] CSRF tokens for state-changing operations
- [ ] Secure token storage (consider httpOnly cookies)
- [ ] Rate limiting on backend API
- [ ] Regular dependency updates

## Performance Optimization

1. **Code Splitting**: Add lazy loading for routes
   ```jsx
   const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard'));
   ```

2. **Image Optimization**: Use appropriate image formats and sizes

3. **Bundle Analysis**: Analyze bundle size
   ```bash
   npm run build -- --analyze
   ```

4. **Caching**: Configure proper cache headers

## Next Steps

1. ✅ Complete basic frontend structure
2. ⏳ Implement remaining page components
3. ⏳ Add real-time features with WebSockets
4. ⏳ Add unit and integration tests
5. ⏳ Implement advanced features (file upload, notifications, etc.)
6. ⏳ Performance optimization
7. ⏳ Production deployment

## Support

For issues or questions:
1. Check this guide first
2. Review the `FRONTEND_STRUCTURE.md` documentation
3. Check the `CREATED_FILES.md` for file descriptions
4. Consult the development team

## Changelog

- **2025-10-14**: Initial frontend structure created
  - Authentication system implemented
  - Theme management added
  - Protected routes configured
  - Basic pages created
  - API services layer implemented

---

**Last Updated**: October 14, 2025
**Version**: 1.0.0
