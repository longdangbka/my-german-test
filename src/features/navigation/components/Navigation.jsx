import React from 'react';

/**
 * Navigation component for question group navigation and theme switching
 * @param {Object} props - Component props
 * @param {Function} props.onPrev - Handler for previous action
 * @param {Function} props.onNext - Handler for next action
 * @param {boolean} props.isFirst - Whether this is the first item
 * @param {boolean} props.isLast - Whether this is the last item
 * @param {string} props.theme - Current theme ('light' or 'dark')
 * @param {Function} props.toggleTheme - Theme toggle handler
 * @param {number} props.currentIndex - Current question group index
 * @param {number} props.totalCount - Total number of question groups
 * @param {boolean} props.disabled - Whether navigation should be disabled
 */
export default function Navigation({ 
  onPrev, 
  onNext, 
  isFirst, 
  isLast, 
  theme, 
  toggleTheme,
  currentIndex = 0,
  totalCount = 0,
  disabled = false
}) {
  return (
    <div className="navigation-container flex justify-between items-center pt-4 px-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Theme toggle */}
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleTheme} 
          className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          <span>{theme === 'light' ? '🌙' : '☀️'}</span>
          <span>{theme === 'light' ? 'Dark' : 'Light'} Mode</span>
        </button>

        {/* Progress indicator */}
        {totalCount > 0 && (
          <div className="hidden md:flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span>Question Group:</span>
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {currentIndex + 1} of {totalCount}
            </span>
          </div>
        )}
      </div>

      {/* Navigation controls */}
      <div className="flex items-center gap-2">
        <button 
          onClick={onPrev} 
          disabled={isFirst || disabled} 
          className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          title="Go to previous question group"
        >
          <span>←</span>
          <span className="hidden sm:inline">Previous</span>
        </button>
        
        <button 
          onClick={onNext} 
          disabled={isLast || disabled} 
          className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          title="Go to next question group"
        >
          <span className="hidden sm:inline">Next</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
