import React from 'react';

export default function TestControls({ onCheck, onShow, onReset, allAnswered }) {
  return (
    <div className="flex space-x-3">
      <button
        onClick={onCheck}
        disabled={!allAnswered}
        className="px-4 py-2 bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
      >
        ✓ Check Answers
      </button>
      <button 
        onClick={onShow} 
        className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white rounded-lg transition-all duration-200 shadow-sm"
      >
        👁️ Show Answers
      </button>
      <button 
        onClick={onReset} 
        className="px-4 py-2 bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white rounded-lg transition-all duration-200 shadow-sm"
      >
        🔄 Reset
      </button>
    </div>
  );
}
