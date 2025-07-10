import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  // Theme options: 'system', 'light', 'dark'
  const [themeMode, setThemeMode] = useState('system');
  const [systemTheme, setSystemTheme] = useState('light');

  // Detect system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Set initial system theme
    setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
    
    // Listen for changes
    const handleChange = (e) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };
    
    mediaQuery.addEventListener('change', handleChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  // Load saved theme preference from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme-mode');
    if (savedTheme && ['system', 'light', 'dark'].includes(savedTheme)) {
      setThemeMode(savedTheme);
    }
  }, []);

  // Save theme preference to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('theme-mode', themeMode);
  }, [themeMode]);

  // Determine the actual theme to apply
  const getActiveTheme = () => {
    if (themeMode === 'system') {
      return systemTheme;
    }
    return themeMode;
  };

  const activeTheme = getActiveTheme();

  // Apply theme class to document
  useEffect(() => {
    const root = document.documentElement;
    
    if (activeTheme === 'dark') {
      root.classList.add('dark');
      document.body.classList.add('dark:bg-gray-900');
    } else {
      root.classList.remove('dark');
      document.body.classList.remove('dark:bg-gray-900');
    }
  }, [activeTheme]);

  const value = {
    themeMode,
    setThemeMode,
    activeTheme,
    systemTheme,
    isSystemTheme: themeMode === 'system'
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
