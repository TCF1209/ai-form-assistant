import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';

import MainLayout from './components/layout/MainLayout';
import AuthLayout from './components/layout/AuthLayout';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import RoleBasedRoute, { Spinner } from './components/Auth/RoleBasedRoute';

// Pages are loaded on demand so the first page does not download the whole app
const Login = lazy(() => import('./pages/Login/Login'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));
const UserManagement = lazy(() => import('./pages/UserManagement/UserManagement'));
const Forms = lazy(() => import('./pages/forms/Forms'));
const FormBuilder = lazy(() => import('./pages/forms/FormBuilder'));
const FormSubmission = lazy(() => import('./pages/forms/FormSubmission'));
const FormView = lazy(() => import('./pages/forms/FormView'));
const Workflows = lazy(() => import('./pages/workflows/Workflows'));
const WorkflowPreview = lazy(() => import('./pages/workflows/WorkflowPreview'));
const MyApprovals = lazy(() => import('./pages/approvals/MyApprovals'));
const MySubmissions = lazy(() => import('./pages/submissions/MySubmissions'));
const SubmissionsManagement = lazy(() => import('./pages/submissions/SubmissionsManagement'));
const Notifications = lazy(() => import('./pages/notifications/Notifications'));
const AIFormGeneration = lazy(() => import('./pages/ai/AIFormGeneration'));
const SmartAssistant = lazy(() => import('./pages/assistant/SmartAssistant'));
const NaturalLanguageAnalytics = lazy(() => import('./pages/analytics/NaturalLanguageAnalytics'));
const Reports = lazy(() => import('./pages/reports/Reports'));
const AuditLog = lazy(() => import('./pages/audit-log/AuditLog'));
const Profile = lazy(() => import('./pages/Profile/Profile'));

const ADMIN_ONLY = ['ADMIN'];
const STAFF = ['ADMIN', 'MANAGER'];
const EMPLOYEES = ['USER'];

const NotFoundPage = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <h1 className="text-6xl font-bold text-slate-900">404</h1>
      <p className="mt-4 text-xl text-slate-600">Page not found</p>
      <a href="/dashboard" className="mt-4 inline-block text-sky-600 hover:text-sky-700">
        Go to Dashboard
      </a>
    </div>
  </div>
);

const guarded = (Page, roles, deniedMessage) => (
  <RoleBasedRoute allowedRoles={roles} deniedMessage={deniedMessage}>
    <Page />
  </RoleBasedRoute>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<Spinner />}>
          <Routes>
            {/* Public pages */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
            </Route>

            {/* Signed-in pages */}
            <Route
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/notifications" element={<Notifications />} />

              <Route path="/forms" element={<Forms />} />
              <Route path="/forms/:formId" element={<FormView />} />
              <Route
                path="/forms/:formId/builder"
                element={guarded(FormBuilder, STAFF, 'Only Admins and Form Managers can edit forms.')}
              />
              <Route path="/forms/:formId/submit" element={<FormSubmission />} />

              <Route path="/submissions" element={<MySubmissions />} />
              <Route
                path="/submissions/management"
                element={guarded(SubmissionsManagement, STAFF, 'Only Admins and Form Managers can manage submissions.')}
              />
              <Route path="/approvals" element={<MyApprovals />} />

              <Route
                path="/workflows"
                element={guarded(Workflows, STAFF, 'Only Admins and Form Managers can manage workflows.')}
              />
              <Route
                path="/workflows/:id/preview"
                element={guarded(WorkflowPreview, STAFF, 'Only Admins and Form Managers can view workflows.')}
              />

              <Route
                path="/ai/form-generation"
                element={guarded(AIFormGeneration, STAFF, 'Only Admins and Form Managers can generate forms.')}
              />
              <Route
                path="/assistant"
                element={guarded(SmartAssistant, EMPLOYEES, 'Smart Assistant is only available for regular users.')}
              />
              <Route
                path="/analytics"
                element={guarded(NaturalLanguageAnalytics, STAFF, 'Analytics Query is only available for Admins and Form Managers.')}
              />
              <Route
                path="/reports"
                element={guarded(Reports, STAFF, 'Reports are only available for Admins and Form Managers.')}
              />

              <Route path="/users" element={guarded(UserManagement, ADMIN_ONLY, 'Only administrators can manage users.')} />
              <Route path="/audit-log" element={guarded(AuditLog, ADMIN_ONLY, 'Only administrators can view the audit log.')} />
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}

export default App;
