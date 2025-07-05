import { useState, useCallback, useEffect, useRef } from 'react';
import questionParser from '../../questions/services/questionParser.js';
import { createQuestionType } from '../../questions/types/index.js';

/**
 * Hook for managing question data, state, and navigation
 * Refactored to use the new modular question system
 */
export default function useQuestionData() {
  const [groups, setGroups] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [feedback, setFeedback] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const abortController = useRef();

  /**
   * Initialize question data and state
   */
  const initialize = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    // Abort any ongoing requests
    if (abortController.current) {
      abortController.current.abort();
    }
    abortController.current = new AbortController();

    try {
      // Load question groups using the new parser
      const loadedGroups = await questionParser.loadQuestionGroups(abortController.current.signal);
      setGroups(loadedGroups);

      // Initialize answers and feedback for all questions
      const initialAnswers = {};
      const initialFeedback = {};

      loadedGroups.forEach(group => {
        group.questions.forEach(question => {
          const questionType = createQuestionType(question.type);
          if (questionType) {
            Object.assign(initialAnswers, questionType.initAnswers(question));
            Object.assign(initialFeedback, questionType.initFeedback(question));
          } else {
            console.warn(`Unknown question type: ${question.type} for question ${question.id}`);
          }
        });
      });

      setAnswers(initialAnswers);
      setFeedback(initialFeedback);
      setCurrentIndex(0);
      setLoading(false);

    } catch (err) {
      if (err.name === 'AbortError') {
        // Ignore abort errors on navigation
        return;
      } else {
        console.error('Failed to load questions:', err);
        setError('Failed to load questions. Please try again.');
      }
      setLoading(false);
    }
  }, []);

  /**
   * Effect to initialize data on mount
   */
  useEffect(() => {
    initialize();
    
    // Cleanup function
    return () => {
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, [initialize]);

  /**
   * Navigation functions
   */
  const goNext = useCallback(() => {
    setCurrentIndex(current => Math.min(groups.length - 1, current + 1));
  }, [groups.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex(current => Math.max(0, current - 1));
  }, []);

  const goToIndex = useCallback((index) => {
    if (index >= 0 && index < groups.length) {
      setCurrentIndex(index);
    }
  }, [groups.length]);

  /**
   * Answer and feedback management
   */
  const updateAnswer = useCallback((fieldName, value) => {
    setAnswers(current => ({
      ...current,
      [fieldName]: value
    }));
  }, []);

  const updateFeedback = useCallback((fieldName, feedbackValue) => {
    setFeedback(current => ({
      ...current,
      [fieldName]: feedbackValue
    }));
  }, []);

  const clearAnswersAndFeedback = useCallback(() => {
    setAnswers({});
    setFeedback({});
  }, []);

  /**
   * Reset all data
   */
  const resetAll = useCallback(() => {
    clearAnswersAndFeedback();
    initialize();
  }, [initialize, clearAnswersAndFeedback]);

  // Computed values
  const currentGroup = groups[currentIndex] || { 
    questions: [], 
    transcript: '', 
    title: '',
    audioFile: ''
  };

  const hasNext = currentIndex < groups.length - 1;
  const hasPrev = currentIndex > 0;
  const totalGroups = groups.length;

  return {
    // Data
    groups,
    currentGroup,
    currentIndex,
    answers,
    feedback,
    
    // State
    loading,
    error,
    
    // Navigation
    goNext,
    goPrev,
    goToIndex,
    hasNext,
    hasPrev,
    totalGroups,
    
    // State management
    setAnswers,
    setFeedback,
    updateAnswer,
    updateFeedback,
    clearAnswersAndFeedback,
    resetAll,
  };
}
