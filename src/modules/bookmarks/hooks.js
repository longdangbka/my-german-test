/**
 * Custom Hooks for BookmarksViewer
 * 
 * Extracted side-effects and heavy computations into reusable hooks
 * for better separation of concerns and performance optimization.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { stripMarkers } from '../../cloze.js';

// ============================================================================
// BOOKMARK PERSISTENCE HELPER
// ============================================================================

const BookmarkPersistence = {
  async load() {
    if (window.electron) {
      const content = await window.electron.readVaultFile('bookmarks.md');
      return content ? this.parseBookmarksFile(content) : [];
    } else {
      try {
        const response = await fetch('/vault/bookmarks.md');
        if (response.ok) {
          const content = await response.text();
          return this.parseBookmarksFile(content);
        }
      } catch (error) {
        // Fallback to localStorage silently
      }
      
      const stored = JSON.parse(localStorage.getItem('bookmarks') || '[]');
      return stored.map(b => b.question);
    }
  },

  async remove(questionId, bookmarks) {
    if (window.electron) {
      let content = await window.electron.readVaultFile('bookmarks.md') || '';
      const question = bookmarks.find(q => q.id === questionId);
      if (question?.originalId) {
        const blockPattern = new RegExp(
          `--- start-question[\\s\\S]*?ID:\\s*${question.originalId}[\\s\\S]*?--- end-question[\\s\\S]*?(?=--- start-question|$)`,
          'g'
        );
        content = content.replace(blockPattern, '');
        await window.electron.writeVaultFile('bookmarks.md', content);
      }
    } else {
      const stored = JSON.parse(localStorage.getItem('bookmarks') || '[]');
      const filtered = stored.filter(b => b.id !== questionId);
      localStorage.setItem('bookmarks', JSON.stringify(filtered));
    }
  },

  parseBookmarksFile(content) {
    const questions = [];
    const questionBlocks = content.split('--- start-question').filter(block => block.trim());
    
    questionBlocks.forEach((block, index) => {
      const parts = block.split('--- end-question');
      if (parts.length >= 2) {
        const questionContent = parts[0].trim();
        const metadata = parts[1].trim();
        
        const question = this.parseQuestionBlock(questionContent, metadata, index);
        if (question.text) {
          questions.push(question);
        }
      }
    });
    
    return questions;
  },

  parseQuestionBlock(questionContent, metadata, index) {
    const lines = questionContent.split('\n');
    const question = {
      id: null,
      type: 'T-F',
      text: '',
      answer: '',
      explanation: '',
      blanks: [],
      orderedElements: [],
      explanationOrderedElements: []
    };
    
    let currentSection = '';
    let textLines = [];
    let explanationLines = [];
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('TYPE:')) {
        question.type = trimmed.substring(5).trim();
      } else if (trimmed.startsWith('ID:')) {
        question.id = trimmed.substring(3).trim();
      } else if (trimmed.startsWith('AUDIO:')) {
        let audioFileRaw = trimmed.substring(6).trim();
        if (audioFileRaw.startsWith('![[') && audioFileRaw.endsWith(']]')) {
          question.audioFile = audioFileRaw.slice(3, -2);
        } else {
          question.audioFile = audioFileRaw;
        }
      } else if (trimmed.startsWith('Q:')) {
        currentSection = 'question';
        const questionStart = trimmed.substring(2).trim();
        if (questionStart) textLines.push(questionStart);
      } else if (trimmed.startsWith('ANSWER:') || trimmed.startsWith('A:')) {
        const answerText = trimmed.startsWith('ANSWER:') 
          ? trimmed.substring(7).trim()
          : trimmed.substring(2).trim();
        if (question.type === 'CLOZE') {
          question.blanks = answerText.split(',').map(a => a.trim());
        } else {
          question.answer = answerText;
        }
        currentSection = '';
      } else if (trimmed.startsWith('E:')) {
        currentSection = 'explanation';
        const explanationStart = trimmed.substring(2).trim();
        if (explanationStart) explanationLines.push(explanationStart);
      } else if (currentSection === 'question') {
        textLines.push(line);
      } else if (currentSection === 'explanation') {
        explanationLines.push(line);
      }
    });
    
    const questionText = textLines.join('\n');
    const explanationText = explanationLines.join('\n');
    
    if (questionText) {
      const { elements } = this.parseContentWithOrder(questionText);
      question.orderedElements = elements;
      question.rawText = questionText;
      
      let cleanedText = '';
      elements.forEach(element => {
        if (element.type === 'text' || element.type === 'latexPlaceholder') {
          cleanedText += element.content + ' ';
        }
      });
      question.text = cleanedText.trim();
      
      if (question.type === 'CLOZE' && !question.blanks.length) {
        const allClozeBlanks = this.extractClozeAnswers(questionText);
        if (allClozeBlanks.length > 0) {
          question.blanks = allClozeBlanks;
        }
      }
    }
    
    if (explanationText) {
      const { elements } = this.parseContentWithOrder(explanationText);
      question.explanationOrderedElements = elements;
      question.rawExplanation = explanationText;
      
      let cleanedExplanationText = '';
      elements.forEach(element => {
        if (element.type === 'text' || element.type === 'latexPlaceholder') {
          cleanedExplanationText += element.content + ' ';
        }
      });
      question.explanation = cleanedExplanationText.trim();
    }
    
    // Parse metadata for unique ID
    const metadataLines = metadata.split('\n');
    metadataLines.forEach(line => {
      if (line.startsWith('id:')) {
        question.originalId = line.substring(3).trim();
      }
    });
    
    // Ensure question has an ID
    if (!question.id) {
      const contentHash = this.simpleHash(question.text || 'empty');
      question.id = `bookmark_${index}_${contentHash}`;
    }
    
    return question;
  },

  parseContentWithOrder(text) {
    if (!text) return { elements: [] };

    const elements = [];
    const patterns = [
      { type: 'image', regex: /!\[\[([^\]]+)\]\]/g },
      { type: 'codeBlock', regex: /```([\w-]*)\r?\n([\s\S]*?)```/g },
      { type: 'table', regex: /(^\|.+\|\r?\n\|[- :|]+\|\r?\n(?:\|.*\|\r?\n?)+)/gm },
      { type: 'latexDisplay', regex: /\$\$([\s\S]+?)\$\$/g },
      { type: 'latexInline', regex: /\$([^$\n]+?)\$/g }
    ];

    const allMatches = [];
    patterns.forEach(pattern => {
      let match;
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
      while ((match = regex.exec(text)) !== null) {
        allMatches.push({
          type: pattern.type,
          match: match,
          start: match.index,
          end: match.index + match[0].length,
          content: match[0]
        });
      }
    });

    allMatches.sort((a, b) => a.start !== b.start ? a.start - b.start : b.end - a.end);
    
    const nonOverlappingMatches = [];
    for (const currentMatch of allMatches) {
      const hasOverlap = nonOverlappingMatches.some(existing => 
        (currentMatch.start < existing.end && currentMatch.end > existing.start)
      );
      if (!hasOverlap) {
        nonOverlappingMatches.push(currentMatch);
      }
    }

    nonOverlappingMatches.sort((a, b) => a.start - b.start);
    let currentPos = 0;

    nonOverlappingMatches.forEach(({ type, match, start, end }) => {
      if (start > currentPos) {
        const textBefore = text.slice(currentPos, start);
        if (textBefore.trim() || textBefore.includes('\n')) {
          elements.push({ type: 'text', content: textBefore });
        }
      }

      switch (type) {
        case 'image':
          elements.push({ type: 'image', content: match[1] });
          break;
        case 'codeBlock':
          elements.push({ type: 'codeBlock', content: { lang: match[1] || 'text', code: match[2] } });
          break;
        case 'table':
          elements.push({ type: 'table', content: match[0] });
          break;
        case 'latexDisplay':
          elements.push({ type: 'latex', content: { latex: match[1], latexType: 'display' } });
          break;
        case 'latexInline':
          elements.push({ type: 'latex', content: { latex: match[1], latexType: 'inline' } });
          break;
      }

      currentPos = end;
    });

    if (currentPos < text.length) {
      const remainingText = text.slice(currentPos);
      if (remainingText.trim() || remainingText.includes('\n')) {
        elements.push({ type: 'text', content: remainingText });
      }
    }

    return { elements };
  },

  extractClozeAnswers(text) {
    const clozeRegex = /\{\{c\d+::([^}]+)\}\}/g;
    const answers = [];
    let match;
    while ((match = clozeRegex.exec(text)) !== null) {
      answers.push(match[1].trim());
    }
    return answers;
  },

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36).substring(0, 6);
  }
};

// ============================================================================
// CUSTOM HOOKS
// ============================================================================

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadBookmarks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const questions = await BookmarkPersistence.load();
      setBookmarks(questions);
    } catch (err) {
      setError('Failed to load bookmarks');
    } finally {
      setLoading(false);
    }
  }, []);

  const removeBookmark = useCallback(async (questionId) => {
    try {
      await BookmarkPersistence.remove(questionId, bookmarks);
      await loadBookmarks(); // Reload after removal
    } catch (err) {
      setError('Failed to remove bookmark');
    }
  }, [bookmarks, loadBookmarks]);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  // Memoize initial answers computation
  const initialAnswers = useMemo(() => {
    const answers = {};
    bookmarks.forEach(q => {
      if (q.type === 'CLOZE' && q.blanks) {
        q.blanks.forEach((_, bi) => {
          answers[`${q.id}_${bi+1}`] = '';
        });
      } else {
        answers[q.id] = '';
      }
    });
    return answers;
  }, [bookmarks]);

  return {
    bookmarks,
    loading,
    error,
    initialAnswers,
    loadBookmarks,
    removeBookmark
  };
}

export function useQuizState(bookmarks) {
  const [answers, setAnswers] = useState({});
  const [feedback, setFeedback] = useState({});
  const [showFeedback, setShowFeedback] = useState(false);
  const [individualFeedback, setIndividualFeedback] = useState({});

  // Initialize answers when bookmarks change
  useEffect(() => {
    const initialAnswers = {};
    bookmarks.forEach(q => {
      if (q.type === 'CLOZE' && q.blanks) {
        q.blanks.forEach((_, bi) => {
          initialAnswers[`${q.id}_${bi+1}`] = '';
        });
      } else {
        initialAnswers[q.id] = '';
      }
    });
    setAnswers(initialAnswers);
  }, [bookmarks]);

  const handleAnswerChange = useCallback((e) => {
    setAnswers(prev => ({ 
      ...prev, 
      [e.target.name]: e.target.value 
    }));
  }, []);

  const checkAnswers = useCallback(() => {
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
  }, [bookmarks, answers]);

  const showAllAnswers = useCallback(() => {
    const newFeedback = {};
    bookmarks.forEach(q => {
      if (q.type === 'CLOZE' && q.blanks) {
        q.blanks.forEach((blank, bi) => {
          const key = `${q.id}_${bi+1}`;
          const userAnswer = answers[key] || '';
          const isCorrect = userAnswer.trim().toLowerCase() === blank.trim().toLowerCase();
          newFeedback[key] = isCorrect ? 'correct' : 'incorrect';
        });
      } else if (q.answer) {
        const userAnswer = answers[q.id] || '';
        let isCorrect = false;
        if (q.type === 'T-F') {
          let userAnswerConverted = '';
          if (userAnswer === 'R') userAnswerConverted = 'Richtig';
          else if (userAnswer === 'F') userAnswerConverted = 'Falsch';
          else userAnswerConverted = userAnswer;
          isCorrect = userAnswerConverted === q.answer;
        } else {
          isCorrect = userAnswer.trim().toLowerCase() === q.answer.trim().toLowerCase();
        }
        newFeedback[q.id] = isCorrect ? 'correct' : 'incorrect';
      }
    });
    setFeedback(newFeedback);
    setShowFeedback(true);
  }, [bookmarks, answers]);

  const showIndividualAnswer = useCallback((questionId, hide = false) => {
    if (hide) {
      setIndividualFeedback(prev => {
        const updated = { ...prev };
        delete updated[questionId];
        return updated;
      });
      return;
    }
    
    const question = bookmarks.find(q => q.id === questionId);
    if (!question) return;
    
    const newFeedback = {};
    
    if (question.type === 'CLOZE' && question.blanks) {
      question.blanks.forEach((blank, bi) => {
        const key = `${question.id}_${bi+1}`;
        const userAnswer = answers[key] || '';
        const isCorrect = userAnswer.trim().toLowerCase() === blank.trim().toLowerCase();
        newFeedback[key] = isCorrect ? 'correct' : 'incorrect';
      });
    } else if (question.answer) {
      const userAnswer = answers[question.id] || '';
      let isCorrect = false;
      
      if (question.type === 'T-F') {
        let userAnswerConverted = '';
        if (userAnswer === 'R') userAnswerConverted = 'Richtig';
        else if (userAnswer === 'F') userAnswerConverted = 'Falsch';
        else userAnswerConverted = userAnswer;
        isCorrect = userAnswerConverted === question.answer;
      } else {
        isCorrect = userAnswer.trim().toLowerCase() === question.answer.trim().toLowerCase();
      }
      
      newFeedback[question.id] = isCorrect ? 'correct' : 'incorrect';
    }
    
    setFeedback(prev => ({ ...prev, ...newFeedback }));
    setIndividualFeedback(prev => ({ ...prev, [questionId]: true }));
  }, [bookmarks, answers]);

  const resetAnswers = useCallback(() => {
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
    setIndividualFeedback({});
  }, [bookmarks]);

  const allAnswered = useMemo(() => {
    return bookmarks.every(q => {
      if (q.type === 'CLOZE' && q.blanks) {
        return q.blanks.every((_, bi) => (answers[`${q.id}_${bi+1}`] ?? '').trim() !== '');
      }
      return (answers[q.id] ?? '').trim() !== '';
    });
  }, [bookmarks, answers]);

  return {
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
  };
}
