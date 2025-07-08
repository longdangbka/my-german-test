import React, { useState, useEffect } from 'react';

const BookmarkButton = ({ question, quizName, questionIndex }) => {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loading, setLoading] = useState(false);

  // Create a unique ID for this question
  const questionId = `${quizName}_${questionIndex}_${question.id || 'q' + questionIndex}`;

  useEffect(() => {
    checkBookmarkStatus();
  }, [questionId]);

  const checkBookmarkStatus = async () => {
    try {
      if (window.electron) {
        const bookmarksContent = await window.electron.readVaultFile('bookmarks.md');
        if (bookmarksContent) {
          // Check if the question text appears in the bookmarks content
          setIsBookmarked(bookmarksContent.includes(question.text || ''));
        }
      } else {
        // Browser fallback - check localStorage
        const bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
        setIsBookmarked(bookmarks.some(b => b.id === questionId));
      }
    } catch (error) {
      console.error('Error checking bookmark status:', error);
    }
  };

  const toggleBookmark = async () => {
    setLoading(true);
    try {
      if (window.electron) {
        // Electron - read existing bookmarks, modify, and write back
        let bookmarksContent = await window.electron.readVaultFile('bookmarks.md') || '';
        
        if (isBookmarked) {
          // Remove bookmark - find and remove the question block
          const questionBlocks = bookmarksContent.split('--- start-question');
          const filteredBlocks = questionBlocks.filter((block, index) => {
            if (index === 0) return true; // Keep the header
            
            // Check if this block contains our question text
            const blockContent = '--- start-question' + block;
            return !blockContent.includes(question.text || '');
          });
          
          bookmarksContent = filteredBlocks.join('--- start-question');
          // Clean up any empty sections
          if (filteredBlocks.length <= 1) {
            // No bookmarks left, keep just a minimal header
            bookmarksContent = `## Bookmarks

### Questions

`;
          }
        } else {
          // Add bookmark - format as standard quiz question
          console.log('🔍 BOOKMARK DEBUG - Question object:', question);
          console.log('🔍 BOOKMARK DEBUG - question.rawText:', question.rawText);
          console.log('🔍 BOOKMARK DEBUG - question.text:', question.text);
          console.log('🔍 BOOKMARK DEBUG - question.rawExplanation:', question.rawExplanation);
          console.log('🔍 BOOKMARK DEBUG - question.explanation:', question.explanation);
          
          let bookmarkEntry = `
--- start-question
TYPE: ${question.type || 'T-F'}

Q: ${question.rawText || question.text || ''}
`;

          if (question.answer) {
            bookmarkEntry += `
A: ${question.answer}`;
          }

          if (question.explanation || question.rawExplanation) {
            bookmarkEntry += `
E: ${question.rawExplanation || question.explanation}`;
          }

          bookmarkEntry += `

--- end-question
`;

          // If this is the first bookmark, create the header
          if (!bookmarksContent.trim()) {
            bookmarksContent = `## Bookmarks

### Questions
`;
          }

          bookmarksContent += bookmarkEntry;
        }

        const success = await window.electron.writeVaultFile('bookmarks.md', bookmarksContent);
        if (success) {
          setIsBookmarked(!isBookmarked);
        }
      } else {
        // Browser fallback - use localStorage
        const bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
        
        if (isBookmarked) {
          // Remove bookmark
          const filteredBookmarks = bookmarks.filter(b => b.id !== questionId);
          localStorage.setItem('bookmarks', JSON.stringify(filteredBookmarks));
        } else {
          // Add bookmark
          bookmarks.push({
            id: questionId,
            quiz: quizName,
            question: question,
            timestamp: new Date().toISOString()
          });
          localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
        }
        setIsBookmarked(!isBookmarked);
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggleBookmark}
      disabled={loading}
      className={`p-2 rounded-lg transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700 ${
        isBookmarked 
          ? 'text-yellow-500 hover:text-yellow-600' 
          : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
      }`}
      title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
    >
      {loading ? (
        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : (
        <svg className="w-5 h-5" fill={isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
        </svg>
      )}
    </button>
  );
};

export default BookmarkButton;
