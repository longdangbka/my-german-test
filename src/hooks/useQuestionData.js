import { useState, useCallback, useEffect, useRef } from 'react';
import { loadQuestionGroups } from '../questions';
import { questionTypes } from '../questionTypes';

export default function useQuestionData(selectedTestFile = null) {
  const [groups, setGroups] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [feedback, setFeedback] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const abortController = useRef();

  const initialize = useCallback(async (filename) => {
    setLoading(true);
    setError(null);
    
    // Clear all existing state to ensure fresh data
    setGroups([]);
    setAnswers({});
    setFeedback({});
    setCurrentIndex(0);
    
    if (abortController.current) abortController.current.abort();
    abortController.current = new AbortController();
    try {
      const loaded = await loadQuestionGroups(abortController.current.signal, filename);
      setGroups(loaded);
      let a = {}, f = {};
      loaded.forEach(g => g.questions.forEach(q => {
        if (questionTypes[q.type]) {
          Object.assign(a, questionTypes[q.type].initAnswers(q));
          Object.assign(f, questionTypes[q.type].initFeedback(q));
        }
      }));
      setAnswers(a);
      setFeedback(f);
      setCurrentIndex(0);
      setLoading(false);
    } catch (err) {
      if (err.name === 'AbortError') {
        // Ignore abort errors on navigation
        return;
      } else {
        setError('Failed to load questions.');
      }
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    if (selectedTestFile) {
      initialize(selectedTestFile); 
    }
    return () => abortController.current?.abort(); 
  }, [initialize, selectedTestFile]);

  const resetAll = () => initialize(selectedTestFile);
  const forceRefresh = () => {
    // Force a complete refresh by clearing state and reinitializing
    console.log('Force refreshing question data...');
    initialize(selectedTestFile);
  };
  const goNext = () => setCurrentIndex(i => Math.min(groups.length - 1, i + 1));
  const goPrev = () => setCurrentIndex(i => Math.max(0, i - 1));

  return {
    groups,
    currentGroup: groups[currentIndex] || { questions: [], transcript: '', title: '' },
    currentIndex,
    answers,
    setAnswers,
    feedback,
    setFeedback,
    loading,
    error,
    resetAll,
    forceRefresh,
    goNext,
    goPrev,
  };
}
