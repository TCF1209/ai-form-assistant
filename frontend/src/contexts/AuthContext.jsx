import React, { createContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/authService';
import assistantService from '../services/assistantService';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Restore the session: show the stored user right away, then refresh it from the server
  useEffect(() => {
    const initAuth = async () => {
      const storedUser = authService.getCurrentUser();
      if (!authService.isAuthenticated() || !storedUser) {
        setLoading(false);
        return;
      }

      setUser(storedUser);
      try {
        setUser(await authService.fetchCurrentUser());
      } catch (err) {
        // No response means the backend is unreachable; keep the stored user.
        // Anything else (e.g. an expired session) signs the user out.
        if (err.response) {
          await authService.logout();
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Login function
  const login = useCallback(async (credentials) => {
    try {
      setError(null);
      setLoading(true);

      const data = await authService.login(credentials);
      setUser(data.user);

      return { success: true, data };
    } catch (error) {
      setError(error);
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    try {
      setLoading(true);
      await authService.logout();
      // Forget data cached for the previous user (profile auto-fill, form list, AI history)
      assistantService.clearCache();
      localStorage.removeItem('ai_form_generation_history');
      setUser(null);
      setError(null);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Update user profile in context
  const updateUser = useCallback((updatedData) => {
    setUser((prevUser) => ({
      ...prevUser,
      ...updatedData,
    }));

    // Update localStorage
    const currentUser = authService.getCurrentUser();
    const newUser = { ...currentUser, ...updatedData };
    localStorage.setItem('user', JSON.stringify(newUser));
  }, []);

  // Check if user has specific role
  const hasRole = useCallback(
    (role) => {
      if (!user) return false;
      return user.role === role || user.roles?.includes(role);
    },
    [user]
  );

  // Check if user has any of the specified roles
  const hasAnyRole = useCallback(
    (roles) => {
      if (!user) return false;
      return roles.some((role) => hasRole(role));
    },
    [user, hasRole]
  );

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    logout,
    updateUser,
    hasRole,
    hasAnyRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
