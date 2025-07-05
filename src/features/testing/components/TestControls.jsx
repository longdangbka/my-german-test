import React from 'react';

/**
 * TestControls component for managing test actions
 * @param {Object} props - Component props
 * @param {Function} props.onCheck - Handler for checking answers
 * @param {Function} props.onShow - Handler for showing answers
 * @param {Function} props.onReset - Handler for resetting test
 * @param {boolean} props.allAnswered - Whether all questions are answered
 * @param {boolean} props.disabled - Whether controls should be disabled
 * @param {boolean} props.showFeedback - Whether feedback is currently shown
 */
export default function TestControls({ 
  onCheck, 
  onShow, 
  onReset, 
  allAnswered = false,
  disabled = false,
  showFeedback = false
}) {
  return (
    <div className="test-controls flex flex-wrap gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <button
        onClick={onCheck}
        disabled={!allAnswered || disabled}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
        title={!allAnswered ? "Please answer all questions first" : "Check your answers"}
      >
        <span>✓</span>
        <span>Check Answers</span>
      </button>
      
      <button 
        onClick={onShow} 
        disabled={disabled}
        className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
        title="Show correct answers"
      >
        <span>👁️</span>
        <span>{showFeedback ? 'Hide' : 'Show'} Answers</span>
      </button>
      
      <button 
        onClick={onReset} 
        disabled={disabled}
        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        title="Reset all answers and reload questions"
      >
        <span>🔄</span>
        <span>Reset</span>
      </button>
    </div>
  );
}
