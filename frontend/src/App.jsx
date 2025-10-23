import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Layouts
import MainLayout from './components/Layout/MainLayout';
import AuthLayout from './components/Layout/AuthLayout';

// Route Guards
import ProtectedRoute from './components/Auth/ProtectedRoute';
import RoleBasedRoute from './components/Auth/RoleBasedRoute';

// Pages
import Login from './pages/Login/Login';
import Register from './pages/Register/Register';
import Dashboard from './pages/dashboard/Dashboard';
import UserManagement from './pages/UserManagement/UserManagement';
import Forms from './pages/forms/Forms';
import FormBuilder from './pages/forms/FormBuilder';

// Placeholder components for future pages
const TasksPage = () => <div>Tasks Page - Coming Soon</div>;
const CalendarPage = () => <div>Calendar Page - Coming Soon</div>;
const DocumentsPage = () => <div>Documents Page - Coming Soon</div>;
const ChatPage = () => <div>Chat Page - Coming Soon</div>;
const ProfilePage = () => <div>Profile Page - Coming Soon</div>;
const SettingsPage = () => <div>Settings Page - Coming Soon</div>;
const NotFoundPage = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <h1 className="text-6xl font-bold text-gray-900 dark:text-white">404</h1>
      <p className="mt-4 text-xl text-gray-600 dark:text-gray-400">Page not found</p>
      <a href="/dashboard" className="mt-4 inline-block text-blue-600 hover:text-blue-700">
        Go to Dashboard
      </a>
    </div>
  </div>
);

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public Routes with Auth Layout */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Route>

            {/* Protected Routes with Main Layout */}
            <Route
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route
                path="/users"
                element={
                  <RoleBasedRoute
                    allowedRoles={['ADMIN']}
                    fallback={
                      <div className="flex items-center justify-center min-h-screen bg-gray-50">
                        <div className="text-center">
                          <svg
                            className="mx-auto h-12 w-12 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                            />
                          </svg>
                          <h1 className="mt-4 text-2xl font-semibold text-gray-900">
                            Access Denied
                          </h1>
                          <p className="mt-2 text-gray-600">Only administrators can access User Management.</p>
                          <a
                            href="/dashboard"
                            className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            Go to Dashboard
                          </a>
                        </div>
                      </div>
                    }
                  >
                    <UserManagement />
                  </RoleBasedRoute>
                }
              />
              <Route path="/forms" element={<Forms />} />
              <Route path="/forms/:formId/builder" element={<FormBuilder />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/documents" element={<DocumentsPage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* 404 Not Found */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
