import api, { clearSession } from './api';

const authService = {
  // Login user
  login: async (credentials) => {
    try {
      // Generous timeout: on the hosted demo the first request may have to wake the server
      const response = await api.post('/auth/login/', {
        email_or_username: credentials.email || credentials.username,
        password: credentials.password,
      }, { timeout: 90000 });

      // Backend sends tokens in a nested 'tokens' object
      const { tokens, user } = response.data;
      localStorage.setItem('access_token', tokens.access);
      localStorage.setItem('refresh_token', tokens.refresh);
      localStorage.setItem('user', JSON.stringify(user));

      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Logout user (the server blacklists the refresh token)
  logout: async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        await api.post('/auth/logout/', { refresh_token: refreshToken });
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails on server, we should clear local session
    } finally {
      clearSession();
    }
  },

  // Load the signed-in user from the server, so role or department changes made by an
  // admin show up on the next page load. Expired access tokens are refreshed by api.js.
  fetchCurrentUser: async () => {
    const { data } = await api.get('/users/me/');
    localStorage.setItem('user', JSON.stringify(data));
    return data;
  },

  // Get current user
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  // Check if user is authenticated
  isAuthenticated: () => !!localStorage.getItem('access_token'),
};

export default authService;
