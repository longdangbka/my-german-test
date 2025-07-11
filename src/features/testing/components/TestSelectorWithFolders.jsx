import React, { useState } from 'react';
import FolderNavigator from './FolderNavigator';
import IdAssignmentPanel from '../../../shared/components/IdAssignmentPanel.jsx';
import ThemeSelector from '../../../shared/components/ThemeSelector';

const TestSelectorWithFolders = ({ onTestSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  const handleTestSelect = (test) => {
    console.log('TestSelectorWithFolders: Selected test', test);
    onTestSelect(test.filename);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  const handleSortChange = (newSortBy) => {
    if (newSortBy === sortBy) {
      // Toggle sort order if same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Change sort field, default to ascending
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-between items-center mb-6">
            <div></div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
              Quiz Center
            </h1>
            <ThemeSelector />
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Select a quiz to begin
          </p>
        </div>

        {/* Search and Controls */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            {/* Search Bar */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Search quizzes and folders..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="w-full px-4 py-3 pr-10 text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
                {searchTerm && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Utility Tools */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tools:</span>
                <IdAssignmentPanel compact={true} />
                
                {/* Sort Controls */}
                <div className="flex items-center gap-2 ml-4">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sort:</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleSortChange('name')}
                      className={`px-3 py-1 text-xs rounded-md transition-colors ${
                        sortBy === 'name' 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                      }`}
                    >
                      Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </button>
                    <button
                      onClick={() => handleSortChange('created')}
                      className={`px-3 py-1 text-xs rounded-md transition-colors ${
                        sortBy === 'created' 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                      }`}
                    >
                      Created {sortBy === 'created' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </button>
                    <button
                      onClick={() => handleSortChange('modified')}
                      className={`px-3 py-1 text-xs rounded-md transition-colors ${
                        sortBy === 'modified' 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                      }`}
                    >
                      Modified {sortBy === 'modified' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </button>
                  </div>
                </div>
              </div>
              
              {searchTerm && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Searching for: <span className="font-medium text-gray-700 dark:text-gray-300">"{searchTerm}"</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <div className="p-6">
              <FolderNavigator 
                onTestSelect={handleTestSelect}
                searchTerm={searchTerm}
                sortBy={sortBy}
                sortOrder={sortOrder}
              />
            </div>
          </div>
        </div>

        {/* Help Text */}
        <div className="max-w-4xl mx-auto mt-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            💡 Tip: Click on folders to expand them and explore your quiz collection. 
            Use search to quickly find specific quizzes across all folders.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TestSelectorWithFolders;
