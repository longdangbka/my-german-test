// IdAssignmentPanel.jsx
// UI component for manually triggering ID assignment

import React from 'react';
import { useAutoIdAssignment } from '../hooks/useAutoIdAssignment.js';

const IdAssignmentPanel = () => {
  const {
    isProcessing,
    processingResults,
    error,
    processAllFiles,
    clearResults
  } = useAutoIdAssignment();

  const handleProcessAll = async () => {
    try {
      await processAllFiles();
    } catch (err) {
      console.error('Error in manual ID assignment:', err);
    }
  };

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

export default IdAssignmentPanel;