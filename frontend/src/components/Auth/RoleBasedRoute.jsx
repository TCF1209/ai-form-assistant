import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const RoleBasedRoute = ({
  children,
  allowedRoles = [],
  redirectTo = '/dashboard',
  fallback = null,
}) => {
  const { user, isAuthenticated, loading, hasAnyRole } = useAuth();
  const location = useLocation();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user has any of the allowed roles
  const hasPermission = allowedRoles.length === 0 || hasAnyRole(allowedRoles);

  if (!hasPermission) {
    // Show fallback component if provided, otherwise redirect
    if (fallback) {
      return fallback;
    }

    return <Navigate to={redirectTo} replace />;
  }

  // Render children if user has permission
  return children;
};

// Unauthorized component to show when user doesn't have permission
export const Unauthorized = ({ message = "You don't have permission to access this page." }) => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
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
        <h1 className="mt-4 text-2xl font-semibold text-gray-900 dark:text-white">
          Access Denied
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">{message}</p>
        <a
          href="/dashboard"
          className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Go to Dashboard
        </a>
      </div>
    </div>
  );
};

export default RoleBasedRoute;
