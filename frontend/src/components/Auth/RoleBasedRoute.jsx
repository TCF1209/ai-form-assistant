import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export const Spinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
  </div>
);

export const Unauthorized = ({ message = "You don't have permission to access this page." }) => (
  <div className="flex items-center justify-center min-h-screen bg-slate-50">
    <div className="text-center">
      <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
      <h1 className="mt-4 text-2xl font-semibold text-slate-900">Access Denied</h1>
      <p className="mt-2 text-slate-600">{message}</p>
      <a
        href="/dashboard"
        className="mt-4 inline-block px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600"
      >
        Go to Dashboard
      </a>
    </div>
  </div>
);

const RoleBasedRoute = ({ children, allowedRoles = [], deniedMessage }) => {
  const { isAuthenticated, loading, hasAnyRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Spinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !hasAnyRole(allowedRoles)) {
    return <Unauthorized message={deniedMessage} />;
  }

  return children;
};

export default RoleBasedRoute;
