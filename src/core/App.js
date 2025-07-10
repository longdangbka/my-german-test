import React, { useState, useEffect } from 'react';
import useQuestionData from '../shared/hooks/useQuestionData';
import AudioPlayer from '../modules/audio/AudioPlayer';
import QuestionList from '../modules/questions/components/QuestionList';
import TestControls from '../modules/testing/components/TestControls';
import Navigation from '../modules/navigation/Navigation';
import TestSelector from '../modules/testing/components/TestSelector';
import BookmarksViewer from '../modules/bookmarks/BookmarksViewer';
import { renderSimpleLatex } from '../shared/utils/simpleLatexRenderer';
import '../assets/styles/inline-latex.css';

// Import app initializer to ensure questions have IDs
import { appInitializer } from '../shared/services/appInitializer.js';

function App() {
  const [selectedTest, setSelectedTest] = useState(null);
  const [theme, setTheme] = useState('light');
  const [appInitialized, setAppInitialized] = useState(false);
  
  // Use an object to store showFeedback per section
  const [showFeedback, setShowFeedback] = useState({});

  // Initialize app and ensure all questions have IDs
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 APP - Starting app initialization');
        const success = await appInitializer.initialize();
        setAppInitialized(success);
        if (success) {
          console.log('🚀 APP - App successfully initialized');
        } else {
          console.warn('🚀 APP - App initialization completed with warnings');
        }
      } catch (error) {
        console.error('🚀 APP - App initialization failed:', error);
        // Still allow the app to function even if initialization fails
        setAppInitialized(true);
      }
    };

    initializeApp();
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark:bg-gray-900');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark:bg-gray-900');
    }
  }, [theme]);

  const handleTestSelect = (filename) => {
    setSelectedTest(filename);
    setShowFeedback({}); // Reset feedback when switching tests
  };

  const handleBackToTestSelection = () => {
    console.log('🔍 Back button clicked');
    setSelectedTest(null);
    setShowFeedback({});
  };

  // Check if the current test is bookmarks
  const isBookmarksView = selectedTest === 'bookmarks.md';
  
  // Don't load question data for bookmarks - let BookmarksViewer handle it
  const qd = useQuestionData(isBookmarksView ? null : selectedTest);

  // Add keyboard shortcut for refreshing content
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Ctrl+R or F5 - refresh content (prevent default browser refresh)
      if ((event.ctrlKey && event.key === 'r') || event.key === 'F5') {
        if (selectedTest && qd) {
          event.preventDefault();
          console.log('Keyboard shortcut: Refreshing content...');
          qd.forceRefresh();
          setShowFeedback({});
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTest, qd]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  // If no test is selected, show the test selector
  if (!selectedTest) {
    return (
      <TestSelector 
        onTestSelect={handleTestSelect}
        theme={theme}
        toggleTheme={toggleTheme}
      />
    );
  }

  // Show BookmarksViewer for bookmarks.md
  if (isBookmarksView) {
    return <BookmarksViewer onBack={handleBackToTestSelection} theme={theme} toggleTheme={toggleTheme} />;
  }

  if (qd.error) return <div className="p-8 text-center text-red-600">{qd.error}</div>;
  if (qd.loading) return <div className="p-8 text-center">Loading…</div>;
  if (!qd.groups.length) return <div className="p-8 text-center">No questions.</div>;

  // Check all answered
  const allAnswered = qd.currentGroup.questions.every(q => {
    // Skip AUDIO questions as they don't require answers
    if (q.type === 'AUDIO') {
      return true;
    }
    
    if (q.type === 'CLOZE') {
      return q.blanks.every((_, bi) => (qd.answers[`${q.id}_${bi+1}`] ?? '').trim() !== '');
    }
    return (qd.answers[q.id] ?? '').trim() !== '';
  });

  // Answer checking
  const checkAnswers = () => {
    const newFb = {};
    qd.currentGroup.questions.forEach(q => {
      // Skip AUDIO questions as they don't have answers to check
      if (q.type === 'AUDIO') {
        return;
      }
      
      if (q.type === 'CLOZE') {
        q.blanks.forEach((b, bi) => {
          const key = `${q.id}_${bi+1}`;
          const userAns = (qd.answers[key] ?? '').trim().toLowerCase();
          const correct = b.trim().toLowerCase();
          newFb[key] = userAns === correct ? 'correct' : 'incorrect';
        });
      } else {
        const userAns = (qd.answers[q.id] ?? '').trim().toLowerCase();
        const correct = q.answer.trim().toLowerCase();
        newFb[q.id] = userAns === correct ? 'correct' : 'incorrect';
      }
    });
    qd.setFeedback(newFb);
    setShowFeedback(fb => ({ ...fb, [qd.currentIndex]: true }));
  };

  // Show answers by auto-filling and then checking
  const doTestForMe = () => {
    console.log('🔍 doTestForMe clicked - auto-filling and checking answers');
    
    // Auto-fill all answers
    const newAnswers = {};
    qd.currentGroup.questions.forEach(q => {
      // Skip AUDIO questions as they don't have answers to fill
      if (q.type === 'AUDIO') {
        return;
      }
      
      if (q.type === 'CLOZE') {
        q.blanks.forEach((blank, bi) => {
          const key = `${q.id}_${bi+1}`;
          newAnswers[key] = blank;
        });
      } else {
        newAnswers[q.id] = q.answer;
      }
    });
    
    // Set the auto-filled answers
    qd.setAnswers(prevAnswers => ({ ...prevAnswers, ...newAnswers }));
    
    // Then check the answers
    setTimeout(() => {
      checkAnswers();
    }, 100); // Small delay to ensure state update
  };

  // Handle theme toggle
  const handleThemeToggle = () => {
    console.log('🔍 Theme toggle clicked, current theme:', theme);
    toggleTheme();
  };

  // Only show feedback for the current section
  const showCurrentFeedback = !!showFeedback[qd.currentIndex];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <div className="p-8 max-w-4xl mx-auto space-y-6 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg shadow-lg dark:shadow-2xl">
        {/* Header with back button */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-600 pb-3">
          <button
            onClick={handleBackToTestSelection}
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Quiz Selection
          </button>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {renderSimpleLatex(qd.currentGroup.title)}
          </h2>
          <button
            onClick={handleThemeToggle}
            className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
        
        {(qd.currentGroup.transcript || qd.currentGroup.audioFile || qd.currentGroup.questions?.some(q => q.audioFile)) && <AudioPlayer group={qd.currentGroup} />}
        {/* DEBUG: Log current group info */}
        {console.log('🚨🚨🚨 CURRENT GROUP:', { 
          title: qd.currentGroup.title, 
          index: qd.currentIndex, 
          questionCount: qd.currentGroup.questions?.length,
          questions: qd.currentGroup.questions?.map(q => ({ id: q.id, type: q.type, question: q.question?.substring(0, 100) }))
        })}
        <QuestionList
          questions={qd.currentGroup.questions}
          answers={qd.answers}
          feedback={qd.feedback}
          onChange={e => qd.setAnswers(a => ({ ...a, [e.target.name]: e.target.value }))}
          showFeedback={showCurrentFeedback}
          quizName={selectedTest}
        />
      <TestControls
        onShow={doTestForMe}
        onReset={() => {
          qd.resetAll();
          setShowFeedback(fb => ({ ...fb, [qd.currentIndex]: false }));
        }}
        onRefresh={() => {
          console.log('Refreshing content...');
          qd.forceRefresh();
          setShowFeedback({}); // Clear all feedback
        }}
        allAnswered={allAnswered}
      />
      <Navigation
        onPrev={qd.goPrev}
        onNext={qd.goNext}
        isFirst={qd.currentIndex === 0}
        isLast={qd.currentIndex === qd.groups.length - 1}
      />
      </div>
    </div>
  );
}

export default App;
