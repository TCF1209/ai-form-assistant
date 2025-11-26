import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

// Icons as components for cleaner code
const DashboardIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const FormsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const AIIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const WorkflowIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
  </svg>
);

const ApprovalIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const SubmissionIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

const ManagementIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
  </svg>
);

const NotificationIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

const AssistantIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
  </svg>
);

const AnalyticsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { user } = useAuth();

  // Navigation items organized by sections for better UX
  const navigationSections = [
    {
      title: 'Overview',
      items: [
        {
          name: 'Dashboard',
          href: '/dashboard',
          icon: <DashboardIcon />,
        },
      ],
    },
    {
      title: 'Forms & Submissions',
      items: [
        {
          name: 'Forms',
          href: '/forms',
          icon: <FormsIcon />,
        },
        {
          name: 'My Submissions',
          href: '/submissions',
          icon: <SubmissionIcon />,
        },
        {
          name: 'Submissions Mgmt',
          href: '/submissions/management',
          icon: <ManagementIcon />,
          roles: ['ADMIN', 'MANAGER'],
        },
      ],
    },
    {
      title: 'Workflows & Approvals',
      items: [
        {
          name: 'Workflows',
          href: '/workflows',
          icon: <WorkflowIcon />,
          roles: ['ADMIN', 'MANAGER'],
        },
        {
          name: 'My Approvals',
          href: '/approvals',
          icon: <ApprovalIcon />,
          roles: ['USER'],
        },
      ],
    },
    {
      title: 'AI Tools',
      items: [
        {
          name: 'Smart Assistant',
          href: '/assistant',
          icon: <AssistantIcon />,
          roles: ['USER'],
        },
        {
          name: 'AI Form Generator',
          href: '/ai/form-generation',
          icon: <AIIcon />,
          roles: ['ADMIN', 'MANAGER'],
        },
        {
          name: 'Analytics Query',
          href: '/analytics',
          icon: <AnalyticsIcon />,
          roles: ['ADMIN', 'MANAGER'],
        },
      ],
    },
    {
      title: 'Administration',
      items: [
        {
          name: 'User Management',
          href: '/users',
          icon: <UsersIcon />,
          roles: ['ADMIN'],
        },
      ],
    },
    {
      title: 'Activity',
      items: [
        {
          name: 'Notifications',
          href: '/notifications',
          icon: <NotificationIcon />,
        },
      ],
    },
  ];

  const isActive = (href) => location.pathname === href;

  // Filter sections to only show those with visible items for current user
  const visibleSections = navigationSections
    .map(section => ({
      ...section,
      items: section.items.filter(item => {
        if (item.roles) {
          return item.roles.includes(user?.role);
        }
        return true;
      }),
    }))
    .filter(section => section.items.length > 0);

  return (
    <>
      {/* Mobile sidebar backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-30
          w-64 bg-white border-r border-slate-200
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-slate-200">
            <span className="text-xl font-bold text-slate-800">
              AI Office
            </span>
            <button
              onClick={onClose}
              className="lg:hidden text-slate-500 hover:text-slate-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Navigation with Sections */}
          <nav className="flex-1 px-3 py-4 overflow-y-auto">
            {visibleSections.map((section, sectionIndex) => (
              <div key={section.title} className={sectionIndex > 0 ? 'mt-6' : ''}>
                {/* Section Title */}
                <h3 className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {section.title}
                </h3>
                {/* Section Items */}
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => onClose()}
                      className={`
                        flex items-center px-3 py-2.5 text-sm font-medium rounded-lg
                        transition-colors duration-200
                        ${
                          isActive(item.href)
                            ? 'bg-sky-50 text-sky-600 border-l-2 border-sky-500'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }
                      `}
                    >
                      <span className={`mr-3 ${isActive(item.href) ? 'text-sky-500' : 'text-slate-400'}`}>
                        {item.icon}
                      </span>
                      {item.name}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          {/* User Profile (Bottom) */}
          <div className="px-3 py-4 border-t border-slate-200">
            <Link
              to="/profile"
              className={`
                flex items-center px-3 py-2.5 text-sm font-medium rounded-lg
                transition-colors duration-200
                ${
                  isActive('/profile')
                    ? 'bg-sky-50 text-sky-600'
                    : 'text-slate-600 hover:bg-slate-50'
                }
              `}
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center text-white font-semibold text-sm">
                {user?.first_name?.[0] || user?.username?.[0] || 'U'}
              </div>
              <div className="ml-3 overflow-hidden">
                <p className="text-sm font-medium truncate">
                  {user?.first_name || user?.username || 'User'}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {user?.role === 'ADMIN' ? 'Administrator' : user?.role === 'MANAGER' ? 'Form Manager' : 'User'}
                </p>
              </div>
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
