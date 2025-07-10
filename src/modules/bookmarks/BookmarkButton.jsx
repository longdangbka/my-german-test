import React, { useState, useEffect, useCallback } from 'react';

const BookmarkButton = ({ question, quizName, questionIndex }) => {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loading, setLoading] = useState(false);

  // Use the question's unique ID directly - this should be stable and unique
  const questionId = question.id;

  const checkBookmarkStatus = useCallback(async () => {
    try {
      if (!questionId) {
        console.warn('No question ID found for bookmark check');
        return;
      }

      if (window.electron) {
        const bookmarksContent = await window.electron.readVaultFile('bookmarks.md');
        if (bookmarksContent) {
          // Check if the question ID appears in the bookmarks content
          // Look for the ID line in the bookmarks - escape special regex characters
          const escapedId = questionId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const idPattern = new RegExp(`^ID:\\s*${escapedId}\\s*$`, 'm');
          const isBookmarked = idPattern.test(bookmarksContent);
          console.log(`🔖 Checking bookmark status for ID: ${questionId}, found: ${isBookmarked}`);
          setIsBookmarked(isBookmarked);
        }
      } else {
        // Browser fallback - check localStorage  
        const bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
        setIsBookmarked(bookmarks.some(b => b.id === questionId));
      }
    } catch (error) {
      console.error('Error checking bookmark status:', error);
    }
  }, [questionId]);

  useEffect(() => {
    if (questionId) {
      checkBookmarkStatus();
    }
  }, [questionId, checkBookmarkStatus]);

  const toggleBookmark = async () => {
    if (!questionId) {
      console.error('Cannot bookmark question without ID');
      return;
    }

    setLoading(true);
    try {
      if (window.electron) {
        // Electron - read existing bookmarks, modify, and write back
        let bookmarksContent = await window.electron.readVaultFile('bookmarks.md') || '';
        
        // Escape special regex characters in the question ID
        const escapedId = questionId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const idPattern = new RegExp(`^ID:\\s*${escapedId}\\s*$`, 'm');
        
        if (isBookmarked) {
          // Remove bookmark - find and remove the question block with matching ID
          console.log(`🔖 Removing bookmark for ID: ${questionId}`);
          
          const questionBlocks = bookmarksContent.split('--- start-question');
          const filteredBlocks = questionBlocks.filter((block, index) => {
            if (index === 0) return true; // Keep the header
            
            // Check if this block contains our question ID
            const blockContent = '--- start-question' + block;
            const hasMatchingId = idPattern.test(blockContent);
            
            if (hasMatchingId) {
              console.log(`🔖 Found and removing block with ID: ${questionId}`);
            }
            
            return !hasMatchingId;
          });
          
          bookmarksContent = filteredBlocks.join('--- start-question');
          
          // Clean up any empty sections
          if (filteredBlocks.length <= 1) {
            // No bookmarks left, keep just a minimal header
            bookmarksContent = `## Bookmarks

### Questions

`;
          }
          setIsBookmarked(false);
        } else {
          // Add bookmark - check for duplicates first
          if (idPattern.test(bookmarksContent)) {
            console.log(`🔖 Question ${questionId} is already bookmarked, updating state`);
            setIsBookmarked(true);
            return;
          }

          console.log(`🔖 Adding bookmark for ID: ${questionId}`);

          // Add bookmark - format as standard quiz question with ID
          // Use rawText to preserve any formatting including cloze syntax for storage
          let bookmarkEntry = `
--- start-question
TYPE: ${question.type || 'T-F'}
ID: ${questionId}

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
          setIsBookmarked(true);
        }

        const success = await window.electron.writeVaultFile('bookmarks.md', bookmarksContent);
        if (!success) {
          // Revert state if write failed
          setIsBookmarked(!isBookmarked);
          console.error('Failed to write bookmarks file');
        } else {
          console.log(`🔖 Successfully ${isBookmarked ? 'removed' : 'added'} bookmark for ID: ${questionId}`);
        }
      } else {
        // Browser fallback - use localStorage
        const bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
        
        if (isBookmarked) {
          // Remove bookmark
          const filteredBookmarks = bookmarks.filter(b => b.id !== questionId);
          localStorage.setItem('bookmarks', JSON.stringify(filteredBookmarks));
          setIsBookmarked(false);
        } else {
          // Check for duplicates
          if (bookmarks.some(b => b.id === questionId)) {
            console.log(`🔖 Question ${questionId} is already bookmarked in localStorage, updating state`);
            setIsBookmarked(true);
            return;
          }

          // Add bookmark
          bookmarks.push({
            id: questionId,
            quiz: quizName,
            question: question,
            timestamp: new Date().toISOString()
          });
          localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
          setIsBookmarked(true);
        }
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
