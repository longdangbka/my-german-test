import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../app/providers/ThemeProvider';

const ThemeSelector = () => {
  const { themeMode, setThemeMode, activeTheme, systemTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const themeOptions = [
    {
      value: 'system',
      label: 'System Default',
      icon: '🖥️',
      description: `Follows your system (Currently: ${systemTheme === 'dark' ? 'Dark' : 'Light'})`
    },
    {
      value: 'light',
      label: 'Light Mode',
      icon: '☀️',
      description: 'Always use light theme'
    },
    {
      value: 'dark',
      label: 'Dark Mode',
      icon: '🌙',
      description: 'Always use dark theme'
    }
  ];

  const currentOption = themeOptions.find(option => option.value === themeMode);

  const handleThemeSelect = (theme) => {
    setThemeMode(theme);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Theme selector button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors border border-gray-300 dark:border-gray-600"
        title={`Current theme: ${currentOption?.label}`}
      >
        <span className="text-sm">{currentOption?.icon}</span>
        <span className="text-sm font-medium hidden sm:inline">
          {currentOption?.label}
        </span>
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-[60]">
          <div className="py-2">
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
              Theme Settings
            </div>
            {themeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleThemeSelect(option.value)}
                className={`w-full px-3 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-start gap-3 ${
                  themeMode === option.value ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
              >
                <span className="text-lg mt-0.5">{option.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {option.label}
                    </span>
                    {themeMode === option.value && (
                      <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {option.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
          
          {/* Current status indicator */}
          <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              <span className="font-medium">Active theme:</span> {activeTheme === 'dark' ? 'Dark' : 'Light'}
              {themeMode === 'system' && (
                <span className="ml-1">(from system)</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeSelector;
