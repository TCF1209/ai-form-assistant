import React from 'react';
import { Outlet } from 'react-router-dom';

const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Optional: Add logo or branding here */}
      <div className="absolute top-0 left-0 right-0 p-4">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {import.meta.env.VITE_APP_NAME || 'AI Office Assistant'}
          </h1>
        </div>
      </div>

      {/* Auth Content */}
      <Outlet />
    </div>
  );
};

export default AuthLayout;
