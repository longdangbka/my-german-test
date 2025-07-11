/**
 * Optimized BookmarksViewer
 * 
 * Clean, performant bookmarks viewer with:
 * - Custom hooks for side-effects and state management
 * - Memoized components to prevent unnecessary re-renders
 * - Extracted UI components for better organization
 * - Removed debug code and redundant logic
 */

import React, { memo } from 'react';
import QuestionItem from './QuestionItem';
import TestControls from '../testing/components/TestControls';
import ThemeSelector from '../../shared/components/ThemeSelector';
import { useBookmarks, useQuizState } from './hooks';

// ============================================================================
// EXTRACTED UI COMPONENTS
// ============================================================================

const BookmarksHeader = memo(({ onBack, bookmarksCount }) => (
  <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-600 pb-3">
    <button
      onClick={onBack}
      className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
    >
      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      Back to Quiz Selection
    </button>
    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
      📚 Bookmarked Questions ({bookmarksCount})
    </h2>
    <ThemeSelector />
  </div>
));

const EmptyBookmarks = memo(() => (
  <div className="text-center py-12">
    <div className="text-gray-400 dark:text-gray-500 text-6xl mb-4">📚</div>
    <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">No Bookmarks Yet</h3>
    <p className="text-gray-500 dark:text-gray-400">
      Start bookmarking questions from quizzes to review them later!
    </p>
  </div>
));

const BookmarksList = memo(({ 
  bookmarks, 
  answers, 
  feedback, 
  onChange, 
  showFeedback, 
  individualFeedback, 
  onShowIndividualAnswer 
}) => (
  <div className="space-y-4">
    {bookmarks.map((question, index) => (
      <QuestionItem
        key={question.id || index}
        question={question}
        answers={answers}
        feedback={feedback}
        onChange={onChange}
        showFeedback={showFeedback}
        individualFeedback={individualFeedback}
        onShowIndividualAnswer={onShowIndividualAnswer}
        seqStart={index + 1}
      />
    ))}
  </div>
));

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const BookmarksViewer = ({ onBack }) => {
  const { bookmarks, loading, error } = useBookmarks();
  const {
    answers,
    feedback,
    showFeedback,
    individualFeedback,
    allAnswered,
    handleAnswerChange,
    checkAnswers,
    showAllAnswers,
    showIndividualAnswer,
    resetAnswers
  } = useQuizState(bookmarks);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading bookmarks...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold text-red-600 mb-2">Error Loading Bookmarks</h3>
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <div className="p-8 max-w-4xl mx-auto space-y-6 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg shadow-lg dark:shadow-2xl">
        <BookmarksHeader onBack={onBack} bookmarksCount={bookmarks.length} />

        {bookmarks.length === 0 ? (
          <EmptyBookmarks />
        ) : (
          <>
            <BookmarksList
              bookmarks={bookmarks}
              answers={answers}
              feedback={feedback}
              onChange={handleAnswerChange}
              showFeedback={showFeedback}
              individualFeedback={individualFeedback}
              onShowIndividualAnswer={showIndividualAnswer}
            />
            
            <TestControls
              onCheck={checkAnswers}
              onShow={showAllAnswers}
              onReset={resetAnswers}
              allAnswered={allAnswered}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default memo(BookmarksViewer);
