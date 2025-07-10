// IdAssignmentPanel.jsx
// UI component for manually triggering ID assignment

import React, { useState } from 'react';
import { useAutoIdAssignment } from '../hooks/useAutoIdAssignment.js';

const IdAssignmentPanel = ({ compact = false }) => {
  const {
    isProcessing,
    processingResults,
    error,
    processAllFiles,
    clearResults
  } = useAutoIdAssignment();
  
  const [showFullPanel, setShowFullPanel] = useState(false);

  const formatResults = (results) => {
    if (!results) return null;

    const { processedFiles, totalQuestionsProcessed, totalIdsAssigned } = results;
    
    return (
      <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg">
        <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">Processing Complete ✅</h4>
        <div className="text-sm text-green-700 dark:text-green-300 space-y-1">
          <p>📄 Files processed: {processedFiles.length}</p>
          <p>❓ Questions found: {totalQuestionsProcessed}</p>
          <p>🆔 New IDs assigned: {totalIdsAssigned}</p>
        </div>
        
        {processedFiles.length > 0 && (
          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-medium text-green-800 dark:text-green-200 hover:text-green-600 dark:hover:text-green-400">
              View processed files
            </summary>
            <div className="mt-2 text-xs text-green-600 dark:text-green-400 space-y-1 ml-4">
              {processedFiles.map((file, index) => (
                <div key={index}>
                  📁 {file.fileName}: {file.idsAssigned} new IDs ({file.questionsProcessed} questions)
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    );
  };

  const handleProcessAll = async () => {
    try {
      await processAllFiles();
      if (compact) {
        setShowFullPanel(true); // Show results panel when in compact mode
      }
    } catch (err) {
      console.error('Error in manual ID assignment:', err);
    }
  };

  // Compact toolbar button version
  if (compact) {
    return (
      <>
        <button
          onClick={handleProcessAll}
          disabled={isProcessing}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 border ${
            isProcessing
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed border-gray-300 dark:border-gray-600'
              : 'bg-blue-500 hover:bg-blue-600 text-white border-blue-500 hover:border-blue-600 hover:shadow-sm'
          }`}
          title="Scan all quiz files and assign IDs to questions that don't have them"
        >
          {isProcessing ? (
            <>
              <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              Processing...
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a.997.997 0 01-1.414 0l-7-7A1.997 1.997 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Assign Missing IDs
            </>
          )}
        </button>
        
        {/* Results modal/panel that shows when processing is complete */}
        {showFullPanel && (processingResults || error) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  🆔 ID Assignment Results
                </h3>
                <button
                  onClick={() => {
                    setShowFullPanel(false);
                    clearResults();
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                  ✕
                </button>
              </div>
              
              {error && (
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
                  <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">Error ❌</h4>
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              )}

              {formatResults(processingResults)}
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="max-w-4xl mx-auto mb-8">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              🆔 Question ID Management
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Ensure all questions have unique, persistent IDs for tracking bookmarks and progress
            </p>
          </div>
          
          {processingResults && (
            <button
              onClick={clearResults}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              title="Clear results"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleProcessAll}
            disabled={isProcessing}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              isProcessing
                ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 text-white hover:shadow-md transform hover:scale-105'
            }`}
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                Processing...
              </>
            ) : (
              <>
                🔄 Assign Missing IDs
              </>
            )}
          </button>

          <div className="text-sm text-gray-500 dark:text-gray-400">
            {isProcessing ? (
              'Scanning markdown files and assigning IDs...'
            ) : (
              'Click to scan all quiz files and assign IDs to questions that don\'t have them'
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
            <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">Error ❌</h4>
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {formatResults(processingResults)}

        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p>💡 <strong>Note:</strong> ID assignment also runs automatically when quizzes are loaded</p>
            <p>🔒 IDs are generated based on question content and will remain stable across app restarts</p>
            <p>💾 Changes are saved directly to your markdown files</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Compact Sort Dropdown Component
const SortDropdown = ({ sortBy, sortOrder, onSortChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const sortOptions = [
    { value: 'name', label: 'Sort by Name', icon: '📝' },
    { value: 'created', label: 'Sort by Created Date', icon: '📅' },
    { value: 'modified', label: 'Sort by Modified Date', icon: '📝' }
  ];
  
  const currentOption = sortOptions.find(opt => opt.value === sortBy);
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 border bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 border-gray-300 dark:border-gray-600"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
        </svg>
        Sort
        {sortBy && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
        <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <>
          {/* Backdrop to close dropdown */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown menu */}
          <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-20 min-w-[160px]">
            {sortOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onSortChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors first:rounded-t-md last:rounded-b-md ${
                  sortBy === option.value 
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{option.label}</span>
                  {sortBy === option.value && (
                    <span className="text-xs">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default IdAssignmentPanel;
export { SortDropdown };