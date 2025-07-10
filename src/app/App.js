import React, { useState, useEffect } from 'react';
import useQuestionData from '../shared/hooks/useQuestionData';
import AudioPlayer from '../features/audio/AudioPlayer';
import QuestionList from '../features/questions/components/QuestionList';
import TestControls from '../features/testing/components/TestControls';
import Navigation from '../features/navigation/Navigation';
import TestSelector from '../features/testing/components/TestSelector';
import BookmarksViewer from '../features/bookmarks/BookmarksViewer';
import ThemeSelector from '../shared/components/ThemeSelector';
import { renderSimpleLatex } from '../shared/utils/simpleLatexRenderer';
import '../assets/styles/inline-latex.css';

function App() {
  const [selectedTest, setSelectedTest] = useState(null);
  
  // Use an object to store showFeedback per section
  const [showFeedback, setShowFeedback] = useState({});
  
  // Individual feedback state for per-question answer revealing
  const [individualFeedback, setIndividualFeedback] = useState({});

  const handleTestSelect = (filename) => {
    setSelectedTest(filename);
    setShowFeedback({}); // Reset feedback when switching tests
    setIndividualFeedback({}); // Reset individual feedback when switching tests
  };

  const handleBackToTestSelection = () => {
    console.log('🔍 Back button clicked');
    setSelectedTest(null);
    setShowFeedback({});
    setIndividualFeedback({});
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
          setIndividualFeedback({});
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTest, qd]);

  // If no test is selected, show the test selector
  if (!selectedTest) {
    return (
      <TestSelector 
        onTestSelect={handleTestSelect}
      />
    );
  }

  // Show BookmarksViewer for bookmarks.md
  if (isBookmarksView) {
    return <BookmarksViewer onBack={handleBackToTestSelection} />;
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

  // Handle individual question answer revealing
  const handleShowIndividualAnswer = (questionId, hide = false) => {
    console.log('🔍 Individual See Answer clicked for question:', questionId, hide ? '(hiding)' : '(showing)');
    
    if (hide) {
      // Remove from individual feedback to hide answer
      setIndividualFeedback(prev => {
        const updated = { ...prev };
        delete updated[questionId];
        return updated;
      });
      return;
    }
    
    // Find the question to generate feedback for it
    const question = qd.currentGroup.questions.find(q => q.id === questionId);
    if (!question) {
      console.warn('Question not found:', questionId);
      return;
    }
    
    const newFeedback = {};
    
    if (question.type === 'CLOZE') {
      question.blanks.forEach((blank, bi) => {
        const key = `${question.id}_${bi+1}`;
        const userAnswer = qd.answers[key] || '';
        const isCorrect = userAnswer.trim().toLowerCase() === blank.trim().toLowerCase();
        newFeedback[key] = isCorrect ? 'correct' : 'incorrect';
        
        console.log('🔍 Individual Cloze Comparison Debug:', {
          questionId: question.id,
          blankIndex: bi,
          key,
          userAnswer: `"${userAnswer}"`,
          correctAnswer: `"${blank}"`,
          isCorrect
        });
      });
    } else {
      const userAnswer = qd.answers[question.id] || '';
      let isCorrect = false;
      
      if (question.type === 'T-F') {
        let userAnswerConverted = '';
        if (userAnswer === 'R') userAnswerConverted = 'True';
        else if (userAnswer === 'F') userAnswerConverted = 'False';
        else userAnswerConverted = userAnswer;
        
        isCorrect = userAnswerConverted === question.answer;
        
        console.log('🔍 Individual T-F Comparison Debug:', {
          questionId: question.id,
          userAnswer,
          userAnswerConverted,
          correctAnswer: question.answer,
          isCorrect
        });
      } else if (question.type === 'Short') {
        isCorrect = userAnswer.trim().toLowerCase() === (question.answer || '').trim().toLowerCase();
        
        console.log('🔍 Individual Short Answer Comparison Debug:', {
          questionId: question.id,
          userAnswer: `"${userAnswer}"`,
          userAnswerTrimmed: `"${userAnswer.trim().toLowerCase()}"`,
          correctAnswer: `"${question.answer || ''}"`,
          correctAnswerTrimmed: `"${(question.answer || '').trim().toLowerCase()}"`,
          isCorrect
        });
      } else {
        isCorrect = userAnswer.trim().toLowerCase() === (question.answer || '').trim().toLowerCase();
      }
      
      newFeedback[question.id] = isCorrect ? 'correct' : 'incorrect';
    }
    
    // Update both the main feedback and individual feedback
    qd.setFeedback(prev => ({ ...prev, ...newFeedback }));
    setIndividualFeedback(prev => ({ ...prev, [questionId]: true }));
  };

  // Show answers without auto-filling user inputs
  const doTestForMe = () => {
    console.log('🔍 See Answer clicked - showing correct answers without auto-filling');
    
    // Generate feedback for all questions based on their current state
    const newFeedback = {};
    qd.currentGroup.questions.forEach(q => {
      console.log('🔍 Processing main quiz question:', {
        id: q.id,
        type: q.type,
        answer: q.answer,
        userAnswer: qd.answers[q.id] || '',
        hasBlanks: !!(q.blanks && q.blanks.length > 0)
      });
      
      // Skip AUDIO questions as they don't have answers to check
      if (q.type === 'AUDIO') {
        return;
      }
      
      if (q.type === 'CLOZE') {
        q.blanks.forEach((blank, bi) => {
          const key = `${q.id}_${bi+1}`;
          const userAnswer = qd.answers[key] || '';
          // Compare user answer with correct answer (case-insensitive, trimmed)
          const isCorrect = userAnswer.trim().toLowerCase() === blank.trim().toLowerCase();
          newFeedback[key] = isCorrect ? 'correct' : 'incorrect';
          
          console.log('🔍 Main Quiz Cloze Comparison Debug:', {
            questionId: q.id,
            blankIndex: bi,
            key,
            userAnswer: `"${userAnswer}"`,
            correctAnswer: `"${blank}"`,
            isCorrect
          });
        });
      } else {
        const userAnswer = qd.answers[q.id] || '';
        // For True/False and Short Answer, compare with correct answer
        let isCorrect = false;
        if (q.type === 'T-F') {
          // Convert UI values (R/F) to stored values (True/False) for comparison
          let userAnswerConverted = '';
          if (userAnswer === 'R') userAnswerConverted = 'True';
          else if (userAnswer === 'F') userAnswerConverted = 'False';
          else userAnswerConverted = userAnswer; // Keep original if not R/F
          
          isCorrect = userAnswerConverted === q.answer;
          
          console.log('🔍 Main Quiz T-F Comparison Debug:', {
            questionId: q.id,
            userAnswer,
            userAnswerConverted,
            correctAnswer: q.answer,
            isCorrect
          });
        } else if (q.type === 'Short') {
          // Case-insensitive comparison for short answers
          isCorrect = userAnswer.trim().toLowerCase() === (q.answer || '').trim().toLowerCase();
          
          console.log('🔍 Main Quiz Short Answer Comparison Debug:', {
            questionId: q.id,
            userAnswer: `"${userAnswer}"`,
            userAnswerTrimmed: `"${userAnswer.trim().toLowerCase()}"`,
            correctAnswer: `"${q.answer || ''}"`,
            correctAnswerTrimmed: `"${(q.answer || '').trim().toLowerCase()}"`,
            isCorrect
          });
        } else {
          // Handle any other question types or fallback
          console.log('🔍 Main Quiz Unknown Type Debug:', {
            questionId: q.id,
            type: q.type,
            userAnswer: `"${userAnswer}"`,
            correctAnswer: `"${q.answer || ''}"`,
            exactMatch: userAnswer === q.answer,
            caseInsensitiveMatch: userAnswer.trim().toLowerCase() === (q.answer || '').trim().toLowerCase()
          });
          
          // Default to case-insensitive comparison
          isCorrect = userAnswer.trim().toLowerCase() === (q.answer || '').trim().toLowerCase();
        }
        newFeedback[q.id] = isCorrect ? 'correct' : 'incorrect';
      }
    });
    
    console.log('🔍 Main Quiz Final Feedback:', newFeedback);
    
    // Set the feedback and show feedback mode
    qd.setFeedback(newFeedback);
    setShowFeedback(fb => ({ ...fb, [qd.currentIndex]: true }));
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
          <ThemeSelector />
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
          currentGroup={qd.currentGroup}
          individualFeedback={individualFeedback}
          onShowIndividualAnswer={handleShowIndividualAnswer}
        />
      <TestControls
        onShow={doTestForMe}
        onReset={() => {
          qd.resetAll();
          setShowFeedback(fb => ({ ...fb, [qd.currentIndex]: false }));
          setIndividualFeedback({});
        }}
        onRefresh={() => {
          console.log('Refreshing content...');
          qd.forceRefresh();
          setShowFeedback({}); // Clear all feedback
          setIndividualFeedback({});
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
