import React, { createContext, useState, useEffect, useCallback } from 'react';

export const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');
  const [primaryColor, setPrimaryColor] = useState('#3B82F6'); // Blue

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const storedTheme = localStorage.getItem('theme');
    const storedColor = localStorage.getItem('primaryColor');

    if (storedTheme) {
      setTheme(storedTheme);
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }

    if (storedColor) {
      setPrimaryColor(storedColor);
    }
  }, []);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;

    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Set CSS custom properties for primary color
    root.style.setProperty('--primary-color', primaryColor);

    // Save to localStorage
    localStorage.setItem('theme', theme);
  }, [theme, primaryColor]);

  // Toggle theme
  const toggleTheme = useCallback(() => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  }, []);

  // Set specific theme
  const setThemeMode = useCallback((mode) => {
    if (mode === 'light' || mode === 'dark') {
      setTheme(mode);
    }
  }, []);

  // Update primary color
  const updatePrimaryColor = useCallback((color) => {
    setPrimaryColor(color);
    localStorage.setItem('primaryColor', color);
  }, []);

  // Reset to default theme
  const resetTheme = useCallback(() => {
    setTheme('light');
    setPrimaryColor('#3B82F6');
    localStorage.removeItem('theme');
    localStorage.removeItem('primaryColor');
  }, []);

  const value = {
    theme,
    primaryColor,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    toggleTheme,
    setTheme: setThemeMode,
    updatePrimaryColor,
    resetTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export default ThemeContext;
