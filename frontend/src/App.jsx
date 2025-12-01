import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Layouts
import MainLayout from './components/layout/MainLayout';
import AuthLayout from './components/layout/AuthLayout';

// Route Guards
import ProtectedRoute from './components/Auth/ProtectedRoute';
import RoleBasedRoute from './components/Auth/RoleBasedRoute';

// Pages
import Login from './pages/Login/Login';
import Register from './pages/Register/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import Dashboard from './pages/dashboard/Dashboard';
import UserManagement from './pages/UserManagement/UserManagement';
import Forms from './pages/forms/Forms';
import FormBuilder from './pages/forms/FormBuilder';
import FormSubmission from './pages/forms/FormSubmission';
import FormView from './pages/forms/FormView';
import Workflows from './pages/workflows/Workflows';
import MyApprovals from './pages/approvals/MyApprovals';
import MySubmissions from './pages/submissions/MySubmissions';
import SubmissionsManagement from './pages/submissions/SubmissionsManagement';
import Notifications from './pages/notifications/Notifications';
import AIFormGeneration from './pages/ai/AIFormGeneration';
import SmartAssistant from './pages/assistant/SmartAssistant';
import NaturalLanguageAnalytics from './pages/analytics/NaturalLanguageAnalytics';
import Profile from './pages/Profile/Profile';
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
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
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
              <Route path="/forms/:formId" element={<FormView />} />
              <Route path="/forms/:formId/builder" element={<FormBuilder />} />
              <Route path="/forms/:formId/submit" element={<FormSubmission />} />
              <Route
                path="/workflows"
                element={
                  <RoleBasedRoute
                    allowedRoles={['ADMIN', 'MANAGER']}
                    fallback={
                      <div className="flex items-center justify-center min-h-screen bg-gray-50">
                        <div className="text-center">
                          <h1 className="mt-4 text-2xl font-semibold text-gray-900">
                            Access Denied
                          </h1>
                          <p className="mt-2 text-gray-600">Only Admins and Form Managers can access Workflow Management.</p>
                        </div>
                      </div>
                    }
                  >
                    <Workflows />
                  </RoleBasedRoute>
                }
              />
              <Route path="/approvals" element={<MyApprovals />} />
              <Route path="/submissions" element={<MySubmissions />} />
              <Route
                path="/submissions/management"
                element={
                  <RoleBasedRoute
                    allowedRoles={['ADMIN', 'MANAGER']}
                    fallback={
                      <div className="flex items-center justify-center min-h-screen bg-gray-50">
                        <div className="text-center">
                          <h1 className="mt-4 text-2xl font-semibold text-gray-900">
                            Access Denied
                          </h1>
                          <p className="mt-2 text-gray-600">Only Admins and Form Managers can access Submissions Management.</p>
                        </div>
                      </div>
                    }
                  >
                    <SubmissionsManagement />
                  </RoleBasedRoute>
                }
              />
              <Route path="/notifications" element={<Notifications />} />
              <Route
                path="/ai/form-generation"
                element={
                  <RoleBasedRoute
                    allowedRoles={['ADMIN', 'MANAGER']}
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
                          <p className="mt-2 text-gray-600">Only Admins and Form Managers can access AI Form Generation.</p>
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
                    <AIFormGeneration />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/assistant"
                element={
                  <RoleBasedRoute
                    allowedRoles={['USER']}
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
                          <p className="mt-2 text-gray-600">Smart Assistant is only available for regular users.</p>
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
                    <SmartAssistant />
                  </RoleBasedRoute>
                }
              />
              <Route
                path="/analytics"
                element={
                  <RoleBasedRoute
                    allowedRoles={['ADMIN', 'MANAGER']}
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
                              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                            />
                          </svg>
                          <h1 className="mt-4 text-2xl font-semibold text-gray-900">
                            Access Denied
                          </h1>
                          <p className="mt-2 text-gray-600">Analytics Query is only available for Admins and Form Managers.</p>
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
                    <NaturalLanguageAnalytics />
                  </RoleBasedRoute>
                }
              />
              <Route path="/profile" element={<Profile />} />
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
