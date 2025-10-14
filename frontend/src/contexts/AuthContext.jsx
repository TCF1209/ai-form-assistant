import React, { createContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/authService';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedUser = authService.getCurrentUser();
        const isAuth = authService.isAuthenticated();

        if (isAuth && storedUser) {
          // Verify token is still valid
          const isValid = await authService.verifyToken();
          if (isValid) {
            setUser(storedUser);
          } else {
            // Token invalid, clear auth
            await authService.logout();
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setUser(null);
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

  // Register function
  const register = useCallback(async (userData) => {
    try {
      setError(null);
      setLoading(true);

      const data = await authService.register(userData);

      // Auto-login after registration
      if (data.user) {
        const loginData = await authService.login({
          email: userData.email,
          password: userData.password,
        });
        setUser(loginData.user);
      }

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
    register,
    logout,
    updateUser,
    hasRole,
    hasAnyRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
