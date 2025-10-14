import api from './api';

const userService = {
  // Get user profile
  getProfile: async () => {
    try {
      const response = await api.get('/users/profile/');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Update user profile
  updateProfile: async (profileData) => {
    try {
      const response = await api.put('/users/profile/', profileData);

      // Update local storage with new user data
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const updatedUser = { ...currentUser, ...response.data };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Update user avatar
  updateAvatar: async (avatarFile) => {
    try {
      const formData = new FormData();
      formData.append('avatar', avatarFile);

      const response = await api.post('/users/profile/avatar/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Update local storage with new avatar URL
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const updatedUser = { ...currentUser, avatar: response.data.avatar };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Delete user avatar
  deleteAvatar: async () => {
    try {
      const response = await api.delete('/users/profile/avatar/');

      // Update local storage
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const updatedUser = { ...currentUser, avatar: null };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get user preferences
  getPreferences: async () => {
    try {
      const response = await api.get('/users/preferences/');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Update user preferences
  updatePreferences: async (preferences) => {
    try {
      const response = await api.put('/users/preferences/', preferences);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get user activity log
  getActivityLog: async (params = {}) => {
    try {
      const response = await api.get('/users/activity-log/', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get user notifications
  getNotifications: async (params = {}) => {
    try {
      const response = await api.get('/users/notifications/', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Mark notification as read
  markNotificationRead: async (notificationId) => {
    try {
      const response = await api.patch(`/users/notifications/${notificationId}/`, {
        is_read: true,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Mark all notifications as read
  markAllNotificationsRead: async () => {
    try {
      const response = await api.post('/users/notifications/mark-all-read/');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Delete notification
  deleteNotification: async (notificationId) => {
    try {
      const response = await api.delete(`/users/notifications/${notificationId}/`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Delete user account
  deleteAccount: async (password) => {
    try {
      const response = await api.delete('/users/profile/', {
        data: { password },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

export default userService;
