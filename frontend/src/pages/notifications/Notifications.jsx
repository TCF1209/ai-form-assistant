import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

// Icons
const BellIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const ExclamationIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const FileIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

// Format time ago helper
const formatTimeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Notification type configs
const notificationConfig = {
  'ASSIGNED': {
    icon: <UserIcon />,
    bgColor: 'bg-sky-100',
    textColor: 'text-sky-600',
    badgeColor: 'bg-sky-100 text-sky-700'
  },
  'REMINDER': {
    icon: <ClockIcon />,
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-600',
    badgeColor: 'bg-amber-100 text-amber-700'
  },
  'ESCALATION': {
    icon: <ExclamationIcon />,
    bgColor: 'bg-red-100',
    textColor: 'text-red-600',
    badgeColor: 'bg-red-100 text-red-700'
  },
  'COMPLETED': {
    icon: <CheckCircleIcon />,
    bgColor: 'bg-emerald-100',
    textColor: 'text-emerald-600',
    badgeColor: 'bg-emerald-100 text-emerald-700'
  },
  'REJECTED': {
    icon: <ExclamationIcon />,
    bgColor: 'bg-red-100',
    textColor: 'text-red-600',
    badgeColor: 'bg-red-100 text-red-700'
  },
  'DELEGATED': {
    icon: <UserIcon />,
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-600',
    badgeColor: 'bg-purple-100 text-purple-700'
  }
};

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, [activeTab]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const params = {};
      if (activeTab === 'unread') {
        params.is_read = false;
      }

      const response = await api.get('/workflow-notifications/', { params });
      setNotifications(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/workflow-notifications/unread_count/');
      setUnreadCount(response.data.unread_count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await api.post(`/workflow-notifications/${notificationId}/mark_read/`);
      fetchNotifications();
      fetchUnreadCount();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/workflow-notifications/mark_all_read/');
      fetchNotifications();
      fetchUnreadCount();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    navigate('/approvals');
  };

  const getConfig = (type) => {
    return notificationConfig[type] || {
      icon: <BellIcon />,
      bgColor: 'bg-slate-100',
      textColor: 'text-slate-600',
      badgeColor: 'bg-slate-100 text-slate-700'
    };
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-sky-100 dark:bg-sky-900/30 rounded-lg">
            <BellIcon className="text-sky-500 dark:text-sky-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Notifications</h1>
            <p className="text-slate-500 dark:text-slate-400">Stay updated with your workflow activities</p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
          >
            <CheckIcon />
            Mark All as Read
          </button>
        )}
      </div>

      {/* Main Card */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden">
        {/* Tabs */}
        <div className="border-b border-slate-200 dark:border-slate-700">
          <div className="flex">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'all'
                  ? 'text-sky-600 dark:text-sky-400 border-b-2 border-sky-500'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              All Notifications
            </button>
            <button
              onClick={() => setActiveTab('unread')}
              className={`px-6 py-4 text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'unread'
                  ? 'text-sky-600 dark:text-sky-400 border-b-2 border-sky-500'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Unread
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-sky-500 text-white rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
                <BellIcon className="text-slate-400 dark:text-slate-500" />
              </div>
              <p className="text-slate-500 dark:text-slate-400">No notifications</p>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                {activeTab === 'unread' ? 'All caught up!' : 'You have no notifications yet'}
              </p>
            </div>
          ) : (
            notifications.map((notification) => {
              const config = getConfig(notification.notification_type);
              return (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-700 ${
                    !notification.is_read ? 'bg-sky-50/50 dark:bg-sky-900/20' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`p-2.5 rounded-full ${config.bgColor} ${config.textColor}`}>
                      {config.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-medium ${!notification.is_read ? 'text-slate-800 dark:text-slate-200' : 'text-slate-600 dark:text-slate-400'}`}>
                          {notification.subject}
                        </span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${config.badgeColor}`}>
                          {notification.notification_type}
                        </span>
                        {!notification.is_read && (
                          <span className="w-2 h-2 bg-sky-500 rounded-full"></span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{notification.message}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500">
                        <span className="flex items-center gap-1">
                          <ClockIcon className="w-3 h-3" />
                          {formatTimeAgo(notification.created_at)}
                        </span>
                        {notification.workflow_approval_detail && (
                          <span className="flex items-center gap-1">
                            <FileIcon />
                            {notification.workflow_approval_detail.workflow_name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Mark as Read Button */}
                    {!notification.is_read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification.id);
                        }}
                        className="p-2 text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-slate-600 rounded-lg transition-colors"
                        title="Mark as read"
                      >
                        <CheckIcon />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
              Showing {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
