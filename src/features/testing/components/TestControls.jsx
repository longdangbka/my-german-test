import React from 'react';

export default function TestControls({ onShow, onReset, onRefresh, allAnswered }) {
  const handleShow = () => {
    console.log('🔍 See All Answers button clicked');
    onShow();
  };

  const handleReset = () => {
    console.log('🔍 Reset button clicked');
    onReset();
  };

  const handleRefresh = () => {
    console.log('🔍 Refresh Content button clicked');
    onRefresh();
  };

  return (
    <div className="flex space-x-3 flex-wrap gap-2">
      <button 
        onClick={handleShow} 
        className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white rounded-lg transition-all duration-200 shadow-sm"
      >
        👁️ See All Answers
      </button>
      <button 
        onClick={handleReset} 
        className="px-4 py-2 bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white rounded-lg transition-all duration-200 shadow-sm"
      >
        🔄 Reset
      </button>
      {onRefresh && (
        <button 
          onClick={handleRefresh} 
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-all duration-200 shadow-sm"
          title="Reload content from file"
        >
          📄 Refresh Content
        </button>
      )}
    </div>
  );
}
