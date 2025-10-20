// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'AI Office Assistant';

// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login/',
    REGISTER: '/auth/register/',
    LOGOUT: '/auth/logout/',
    REFRESH: '/auth/token/refresh/',
    VERIFY: '/auth/token/verify/',
    PASSWORD_RESET: '/auth/password-reset/',
    PASSWORD_RESET_CONFIRM: '/auth/password-reset/confirm/',
    CHANGE_PASSWORD: '/auth/change-password/',
  },
  USERS: {
    PROFILE: '/users/profile/',
    AVATAR: '/users/profile/avatar/',
    PREFERENCES: '/users/preferences/',
    ACTIVITY_LOG: '/users/activity-log/',
    NOTIFICATIONS: '/users/notifications/',
  },
  TASKS: {
    LIST: '/tasks/',
    DETAIL: (id) => `/tasks/${id}/`,
    CREATE: '/tasks/',
    UPDATE: (id) => `/tasks/${id}/`,
    DELETE: (id) => `/tasks/${id}/`,
  },
  CALENDAR: {
    EVENTS: '/calendar/events/',
    EVENT_DETAIL: (id) => `/calendar/events/${id}/`,
  },
  DOCUMENTS: {
    LIST: '/documents/',
    UPLOAD: '/documents/upload/',
    DETAIL: (id) => `/documents/${id}/`,
    DOWNLOAD: (id) => `/documents/${id}/download/`,
  },
  CHAT: {
    CONVERSATIONS: '/chat/conversations/',
    MESSAGES: (conversationId) => `/chat/conversations/${conversationId}/messages/`,
    SEND_MESSAGE: (conversationId) => `/chat/conversations/${conversationId}/messages/`,
  },
};

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  USER: 'user',
  GUEST: 'guest',
};

// Task Status
export const TASK_STATUS = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  REVIEW: 'review',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

// Task Priority
export const TASK_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
};

// Date Formats
export const DATE_FORMATS = {
  FULL: 'MMMM dd, yyyy',
  SHORT: 'MM/dd/yyyy',
  TIME: 'HH:mm',
  DATETIME: 'MM/dd/yyyy HH:mm',
  ISO: "yyyy-MM-dd'T'HH:mm:ss",
};

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
};

// File Upload
export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
  ],
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif'],
};

// Theme
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
};

// Local Storage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user',
  THEME: 'theme',
  PRIMARY_COLOR: 'primaryColor',
  PREFERENCES: 'preferences',
};

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your internet connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  SERVER_ERROR: 'Server error. Please try again later.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  NOT_FOUND: 'The requested resource was not found.',
};

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN: 'Successfully logged in!',
  REGISTER: 'Account created successfully!',
  LOGOUT: 'Successfully logged out!',
  PROFILE_UPDATED: 'Profile updated successfully!',
  PASSWORD_CHANGED: 'Password changed successfully!',
  TASK_CREATED: 'Task created successfully!',
  TASK_UPDATED: 'Task updated successfully!',
  TASK_DELETED: 'Task deleted successfully!',
};

// Regex Patterns
export const REGEX_PATTERNS = {
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  PHONE: /^[\d\s\-\+\(\)]+$/,
  URL: /^https?:\/\/.+/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
};

// Notification Types
export const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
};

// Calendar View Types
export const CALENDAR_VIEWS = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
  YEAR: 'year',
};

export default {
  API_BASE_URL,
  APP_NAME,
  API_ENDPOINTS,
  USER_ROLES,
  TASK_STATUS,
  TASK_PRIORITY,
  DATE_FORMATS,
  PAGINATION,
  FILE_UPLOAD,
  THEMES,
  STORAGE_KEYS,
  HTTP_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  REGEX_PATTERNS,
  NOTIFICATION_TYPES,
  CALENDAR_VIEWS,
};
