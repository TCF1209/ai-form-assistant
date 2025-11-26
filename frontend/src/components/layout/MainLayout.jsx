import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

// Pages that need full-height layout without scrolling (like chat interfaces)
const FULL_HEIGHT_PAGES = ['/assistant', '/analytics'];

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Check if current page needs full-height layout
  const isFullHeightPage = FULL_HEIGHT_PAGES.some(path => location.pathname.startsWith(path));

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header onMenuClick={toggleSidebar} />

        {/* Page Content */}
        <main className={`flex-1 bg-slate-50 ${isFullHeightPage ? 'overflow-hidden' : 'overflow-y-auto overflow-x-hidden'}`}>
          {isFullHeightPage ? (
            <Outlet />
          ) : (
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <Outlet />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
