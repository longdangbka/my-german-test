import React, { useState, useEffect } from 'react';
import { getAvailableTests, sortTests } from '../../../shared/utils/testUtils';
import IdAssignmentPanel from '../../../shared/components/IdAssignmentPanel.jsx';

const TestSelector = ({ onTestSelect, theme, toggleTheme }) => {
  const [availableTests, setAvailableTests] = useState([]);
  const [sortedTests, setSortedTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('name'); // 'name', 'created', 'modified'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc', 'desc'

  useEffect(() => {
    const loadTests = async () => {
      try {
        setLoading(true);
        const tests = await getAvailableTests(false); // Normal load, use manifest first
        setAvailableTests(tests);
        setError(null);
      } catch (err) {
        setError('Failed to load available quizzes');
        console.error('Error loading tests:', err);
      } finally {
        setLoading(false);
      }
    };

    loadTests();
  }, []);

  // Update sorted tests when availableTests, sortBy, or sortOrder changes
  useEffect(() => {
    console.log('TestSelector: Updating sorted tests', { 
      availableTestsLength: availableTests.length, 
      sortBy, 
      sortOrder 
    });
    if (availableTests.length > 0) {
      const sorted = sortTests(availableTests, sortBy, sortOrder);
      console.log('TestSelector: Sorted tests', sorted);
      setSortedTests(sorted);
    }
  }, [availableTests, sortBy, sortOrder]);

  const handleSortChange = (newSortBy) => {
    console.log('TestSelector: Sort change requested', { newSortBy, currentSortBy: sortBy, currentOrder: sortOrder });
    if (sortBy === newSortBy) {
      // If clicking the same sort option, toggle order
      const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
      console.log('TestSelector: Toggling sort order to', newOrder);
      setSortOrder(newOrder);
    } else {
      // If clicking a different sort option, set it and use ascending order
      console.log('TestSelector: Changing sort to', newSortBy);
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };

  const formatDate = (date) => {
    if (!date) return 'Unknown';
    try {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Unknown';
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return 'Unknown';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleTestSelect = (test) => {
    onTestSelect(test.filename);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">Loading available quizzes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center text-red-600 dark:text-red-400">
          <p className="text-xl font-semibold">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (availableTests.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-between items-center mb-6">
              <div></div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                Quiz Center
              </h1>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? '🌙' : '☀️'}
              </button>
            </div>
          </div>

          {/* DEBUG INFO - Always visible */}
          <div className="bg-red-100 dark:bg-red-900 p-4 rounded-lg mx-auto max-w-4xl mb-4">
            <h3 className="text-red-800 dark:text-red-200 font-bold">DEBUG INFO (NO TESTS):</h3>
            <p className="text-red-700 dark:text-red-300">Available tests: {availableTests.length}</p>
            <p className="text-red-700 dark:text-red-300">Sorted tests: {sortedTests.length}</p>
            <p className="text-red-700 dark:text-red-300">Is Electron: {!!window.electron ? 'YES' : 'NO'}</p>
          </div>

          {/* Sorting Controls - Show even when no tests */}
          <div className="flex flex-wrap justify-center gap-4 mb-8 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md mx-auto max-w-4xl">
            <div className="w-full text-center mb-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Quiz Sorting Options (No Tests Found)</h2>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sort by:</span>
              <button
                onClick={() => handleSortChange('name')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors border ${
                  sortBy === 'name'
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 border-gray-300 dark:border-gray-600'
                }`}
              >
                Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
              <button
                onClick={() => handleSortChange('created')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors border ${
                  sortBy === 'created'
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 border-gray-300 dark:border-gray-600'
                }`}
              >
                Created {sortBy === 'created' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
              <button
                onClick={() => handleSortChange('modified')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors border ${
                  sortBy === 'modified'
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 border-gray-300 dark:border-gray-600'
                }`}
              >
                Modified {sortBy === 'modified' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 w-full text-center">
              0 quizzes available
            </div>
          </div>

          <div className="flex items-center justify-center">
            <div className="text-center text-gray-600 dark:text-gray-300">
              <p className="text-xl font-semibold">No quizzes found</p>
              <p className="mt-2">Please add some Markdown quiz files to the /vault directory</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const testsToDisplay = sortedTests.length > 0 ? sortedTests : availableTests;

  // Filter out bookmarks.md from regular tests and add it as a special option at the top
  const regularTests = testsToDisplay.filter(test => test.filename !== 'bookmarks.md');
  const allTestsWithBookmarks = [{
    filename: 'bookmarks.md',
    displayName: '📚 Bookmarks',
    createdTime: new Date(),
    modifiedTime: new Date(),
    size: 0,
    isSpecial: true
  }, ...regularTests];

  console.log('TestSelector: Render state', {
    loading,
    error,
    availableTestsLength: availableTests.length,
    sortedTestsLength: sortedTests.length,
    testsToDisplayLength: testsToDisplay.length,
    sortBy,
    sortOrder,
    isElectron: !!window.electron
  });

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
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Select a quiz to begin
          </p>
        </div>

        {/* Sorting Controls */}
        <div className="flex flex-wrap justify-center gap-4 mb-8 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md mx-auto max-w-4xl">
          <div className="w-full text-center mb-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Quiz Sorting Options</h2>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sort by:</span>
            
            <button
              onClick={() => handleSortChange('name')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors border ${
                sortBy === 'name'
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 border-gray-300 dark:border-gray-600'
              }`}
              title="Sort by name"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a.997.997 0 01-1.414 0l-7-7A1.997 1.997 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            
            <button
              onClick={() => handleSortChange('created')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors border ${
                sortBy === 'created'
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 border-gray-300 dark:border-gray-600'
              }`}
              title="Sort by creation date"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Created {sortBy === 'created' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            
            <button
              onClick={() => handleSortChange('modified')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors border ${
                sortBy === 'modified'
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 border-gray-300 dark:border-gray-600'
              }`}
              title="Sort by last modified date"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Modified {sortBy === 'modified' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 w-full text-center">
            {regularTests.length} quiz{regularTests.length !== 1 ? 'es' : ''} available + Bookmarks
          </div>
        </div>

        {/* ID Assignment Panel */}
        <IdAssignmentPanel />

        {/* Test Selection Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {allTestsWithBookmarks.map((test, index) => (
            <div
              key={test.filename}
              className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 cursor-pointer border border-gray-200 dark:border-gray-700 ${
                test.isSpecial ? 'ring-2 ring-yellow-400' : ''
              }`}
              onClick={() => handleTestSelect(test)}
            >
              <div className="p-6">
                <div className={`flex items-center justify-center w-16 h-16 rounded-full mx-auto mb-4 ${
                  test.isSpecial 
                    ? 'bg-gradient-to-br from-yellow-500 to-orange-600' 
                    : 'bg-gradient-to-br from-blue-500 to-purple-600'
                }`}>
                  <span className="text-2xl font-bold text-white">
                    {test.isSpecial ? '📚' : (index)}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 text-center mb-2">
                  {test.displayName}
                </h3>
                
                {/* File metadata */}
                {!test.isSpecial && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 text-center mb-4 space-y-1">
                    <div>Created: {formatDate(test.createdTime)}</div>
                    <div>Modified: {formatDate(test.modifiedTime)}</div>
                    <div>Size: {formatFileSize(test.size)}</div>
                  </div>
                )}
                
                {test.isSpecial && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 text-center mb-4">
                    <div>Review your saved questions</div>
                  </div>
                )}
                
                <div className="text-center">
                  <button className={`inline-flex items-center px-4 py-2 font-medium rounded-lg transition-colors duration-200 ${
                    test.isSpecial 
                      ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}>
                    <span>{test.isSpecial ? 'View Bookmarks' : 'Start Quiz'}</span>
                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TestSelector;