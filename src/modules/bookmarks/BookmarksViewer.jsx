import React, { useState, useEffect } from 'react';
import QuestionList from './QuestionList';
import TestControls from './TestControls';

const BookmarksViewer = ({ onBack, theme, toggleTheme }) => {
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [answers, setAnswers] = useState({});
  const [feedback, setFeedback] = useState({});
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    loadBookmarks();
  }, []);

  const loadBookmarks = async () => {
    try {
      setLoading(true);
      let bookmarkedQuestions = [];

      if (window.electron) {
        // Load from Electron vault
        const bookmarksContent = await window.electron.readVaultFile('bookmarks.md');
        if (bookmarksContent) {
          bookmarkedQuestions = parseBookmarksFile(bookmarksContent);
        }
      } else {
        // Load from localStorage (browser fallback)
        const storedBookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
        bookmarkedQuestions = storedBookmarks.map(b => b.question);
      }

      setBookmarks(bookmarkedQuestions);
      
      // Initialize answers for bookmarked questions
      const initialAnswers = {};
      bookmarkedQuestions.forEach(q => {
        if (q.type === 'CLOZE' && q.blanks) {
          q.blanks.forEach((_, bi) => {
            initialAnswers[`${q.id}_${bi+1}`] = '';
          });
        } else {
          initialAnswers[q.id] = '';
        }
      });
      setAnswers(initialAnswers);
      
    } catch (err) {
      console.error('Error loading bookmarks:', err);
      setError('Failed to load bookmarks');
    } finally {
      setLoading(false);
    }
  };

  const parseBookmarksFile = (content) => {
    const questions = [];
    
    // Split by question blocks (--- start-question ... --- end-question)
    const questionBlocks = content.split('--- start-question').filter(block => block.trim());
    
    questionBlocks.forEach((block, index) => {
      const parts = block.split('--- end-question');
      if (parts.length >= 2) {
        const questionContent = parts[0].trim();
        const metadata = parts[1].trim();
        
        // Parse question content
        const lines = questionContent.split('\n').filter(line => line.trim());
        const question = {
          id: `bookmark_${index}`,
          type: 'T-F',
          text: '',
          answer: '',
          explanation: '',
          blanks: []
        };
        
        let currentSection = '';
        let textLines = [];
        let explanationLines = [];
        
        lines.forEach(line => {
          const trimmed = line.trim();
          if (trimmed.startsWith('TYPE:')) {
            question.type = trimmed.substring(5).trim();
          } else if (trimmed === 'Q:') {
            currentSection = 'question';
          } else if (trimmed.startsWith('ANSWER:')) {
            const answerText = trimmed.substring(7).trim();
            if (question.type === 'CLOZE') {
              // For CLOZE questions, split answers by comma
              question.blanks = answerText.split(',').map(a => a.trim());
            } else {
              question.answer = answerText;
            }
            currentSection = '';
          } else if (trimmed === 'E:') {
            currentSection = 'explanation';
          } else if (currentSection === 'question' && trimmed) {
            textLines.push(trimmed);
          } else if (currentSection === 'explanation' && trimmed) {
            explanationLines.push(trimmed);
          }
        });
        
        question.text = textLines.join('\n');
        question.explanation = explanationLines.join('\n');
        
        // Parse metadata for unique ID
        const metadataLines = metadata.split('\n');
        metadataLines.forEach(line => {
          if (line.startsWith('id:')) {
            question.originalId = line.substring(3).trim();
          } else if (line.startsWith('quiz:')) {
            question.quiz = line.substring(5).trim();
          }
        });
        
        if (question.text) {
          questions.push(question);
        }
      }
    });
    
    return questions;
  };

  const checkAnswers = () => {
    const newFeedback = {};
    bookmarks.forEach(q => {
      if (q.type === 'CLOZE' && q.blanks) {
        q.blanks.forEach((b, bi) => {
          const key = `${q.id}_${bi+1}`;
          const userAns = (answers[key] ?? '').trim().toLowerCase();
          const correct = b.trim().toLowerCase();
          newFeedback[key] = userAns === correct ? 'correct' : 'incorrect';
        });
      } else if (q.answer) {
        const userAns = (answers[q.id] ?? '').trim().toLowerCase();
        const correct = q.answer.trim().toLowerCase();
        newFeedback[q.id] = userAns === correct ? 'correct' : 'incorrect';
      }
    });
    setFeedback(newFeedback);
    setShowFeedback(true);
  };

  const doTestForMe = () => {
    const filled = { ...answers };
    bookmarks.forEach(q => {
      if (q.type === 'CLOZE' && q.blanks) {
        q.blanks.forEach((b, bi) => {
          filled[`${q.id}_${bi+1}`] = b;
        });
      } else if (q.answer) {
        filled[q.id] = q.answer;
      }
    });
    setAnswers(filled);
    setTimeout(checkAnswers, 0);
  };

  const resetAnswers = () => {
    const reset = {};
    bookmarks.forEach(q => {
      if (q.type === 'CLOZE' && q.blanks) {
        q.blanks.forEach((_, bi) => {
          reset[`${q.id}_${bi+1}`] = '';
        });
      } else {
        reset[q.id] = '';
      }
    });
    setAnswers(reset);
    setFeedback({});
    setShowFeedback(false);
  };

  const removeBookmark = async (questionId) => {
    try {
      if (window.electron) {
        // Remove from Electron vault
        let bookmarksContent = await window.electron.readVaultFile('bookmarks.md') || '';
        
        // Find and remove the question block by originalId
        const questionToRemove = bookmarks.find(q => q.id === questionId);
        if (questionToRemove && questionToRemove.originalId) {
          const pattern = new RegExp(`id: ${questionToRemove.originalId}[\\s\\S]*?---`, 'g');
          bookmarksContent = bookmarksContent.replace(pattern, '');
          // Clean up any double separators
          bookmarksContent = bookmarksContent.replace(/---\s*---/g, '---');
          await window.electron.writeVaultFile('bookmarks.md', bookmarksContent);
        }
      } else {
        // Remove from localStorage
        const storedBookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
        const filteredBookmarks = storedBookmarks.filter(b => b.id !== questionId);
        localStorage.setItem('bookmarks', JSON.stringify(filteredBookmarks));
      }
      
      // Reload bookmarks
      loadBookmarks();
    } catch (err) {
      console.error('Error removing bookmark:', err);
    }
  };

  const allAnswered = bookmarks.every(q => {
    if (q.type === 'CLOZE' && q.blanks) {
      return q.blanks.every((_, bi) => (answers[`${q.id}_${bi+1}`] ?? '').trim() !== '');
    }
    return (answers[q.id] ?? '').trim() !== '';
  });

  if (loading) return <div className="p-8 text-center">Loading bookmarks...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <div className="p-8 max-w-4xl mx-auto space-y-6 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg shadow-lg dark:shadow-2xl">
        {/* Header */}
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
            📚 Bookmarked Questions ({bookmarks.length})
          </h2>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>

        {bookmarks.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 dark:text-gray-500 text-6xl mb-4">📚</div>
            <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">No Bookmarks Yet</h3>
            <p className="text-gray-500 dark:text-gray-400">
              Start bookmarking questions from quizzes to review them later!
            </p>
          </div>
        ) : (
          <>
            <QuestionList
              questions={bookmarks}
              answers={answers}
              feedback={feedback}
              onChange={e => setAnswers(a => ({ ...a, [e.target.name]: e.target.value }))}
              showFeedback={showFeedback}
              quizName="bookmarks"
            />
            <TestControls
              onCheck={checkAnswers}
              onShow={doTestForMe}
              onReset={resetAnswers}
              allAnswered={allAnswered}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default BookmarksViewer;
