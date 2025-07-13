import React, { useState, useEffect, useCallback } from 'react';
import TestControls from '../testing/components/TestControls';
import QuestionItem from './QuestionItem';
import ThemeSelector from '../../shared/components/ThemeSelector';
import { 
  extractMediaLinks, 
  processContentForAnki 
} from '../anki/ankiConnect.js';
// Import centralized cloze utilities for consistent processing
import { 
  stripMarkers, 
  extractAllClozeBlanks,
  toSequentialBlanks,
  processClozeElements
} from '../cloze/clozeModule';

const BookmarksViewer = ({ onBack }) => {
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [answers, setAnswers] = useState({});
  const [feedback, setFeedback] = useState({});
  const [showFeedback, setShowFeedback] = useState(false);
  
  // Individual feedback state for per-question answer revealing
  const [individualFeedback, setIndividualFeedback] = useState({});

  // Create a stable onChange handler to prevent re-renders on every keystroke
  const handleAnswerChange = useCallback((e) => {
    setAnswers(prevAnswers => ({ 
      ...prevAnswers, 
      [e.target.name]: e.target.value 
    }));
  }, []);

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
        // Load from HTTP in browser environment
        try {
          const response = await fetch('/vault/bookmarks.md');
          if (response.ok) {
            const bookmarksContent = await response.text();
            bookmarkedQuestions = parseBookmarksFile(bookmarksContent);
          } else {
            console.error('Failed to fetch bookmarks.md:', response.status);
            // Fallback to localStorage
            const storedBookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
            bookmarkedQuestions = storedBookmarks.map(b => b.question);
          }
        } catch (fetchError) {
          console.error('Error fetching bookmarks.md:', fetchError);
          // Fallback to localStorage
          const storedBookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
          bookmarkedQuestions = storedBookmarks.map(b => b.question);
        }
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

  // Test function for media upload functionality
  const testMediaUpload = async () => {
    console.log('=== Testing Media Upload Functionality ===');
    
    // Find a bookmark with media content
    const testBookmark = bookmarks.find(bookmark => 
      bookmark.rawText && bookmark.rawText.includes('![[')
    );
    
    if (!testBookmark) {
      console.log('No bookmarks with media found for testing');
      alert('No bookmarks with media found for testing');
      return;
    }
    
    console.log('Testing with bookmark:', testBookmark.id);
    console.log('Content:', testBookmark.rawText);
    
    try {
      // Step 1: Extract media links
      const mediaLinks = extractMediaLinks(testBookmark.rawText);
      console.log('Found media links:', mediaLinks);
      
      // Step 2: Test file access
      for (const media of mediaLinks) {
        const fileUrl = `${window.location.origin}/vault/${media.filename}`;
        console.log(`Testing access to: ${fileUrl}`);
        
        try {
          const response = await fetch(fileUrl);
          console.log(`  ${media.filename}: ${response.status} ${response.statusText}`);
          if (response.ok) {
            const blob = await response.blob();
            console.log(`  File size: ${blob.size} bytes, type: ${blob.type}`);
          }
        } catch (error) {
          console.error(`  Failed to access ${media.filename}:`, error);
        }
      }
      
      // Step 3: Test full processing
      console.log('Testing full content processing...');
      const processedContent = await processContentForAnki(testBookmark.rawText);
      console.log('Processed content:');
      console.log(processedContent);
      
      alert('Media upload test completed - check console for details');
    } catch (error) {
      console.error('Error during media upload test:', error);
      alert('Media upload test failed - check console for details');
    }
  };

  // Helper function to parse content with full markdown support
  const parseContentWithOrder = (text, isCloze = false) => {
    if (!text) return { elements: [], latexPlaceholders: [] };

    const elements = [];
    let remaining = text;

    // Create a list of all content patterns with their positions
    const patterns = [
      { type: 'image', regex: /!\[\[([^\]]+)\]\]/g },
      { type: 'codeBlock', regex: /```([\w-]*)\r?\n([\s\S]*?)```/g },
      { type: 'table', regex: /(^\|.+\|\r?\n\|[- :|]+\|\r?\n(?:\|.*\|\r?\n?)+)/gm },
      { type: 'latexDisplay', regex: /\$\$([\s\S]+?)\$\$/g },
      { type: 'latexInline', regex: /\$([^$\n]+?)\$/g }
    ];

    // Find all matches with their positions
    const allMatches = [];
    
    patterns.forEach(pattern => {
      let match;
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
      while ((match = regex.exec(remaining)) !== null) {
        allMatches.push({
          type: pattern.type,
          match: match,
          start: match.index,
          end: match.index + match[0].length,
          content: match[0]
        });
      }
    });

    // Sort by position and remove overlapping matches
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

    // Sort again by position for processing
    nonOverlappingMatches.sort((a, b) => a.start - b.start);

    // Process matches in order, extracting text between them
    let currentPos = 0;

    nonOverlappingMatches.forEach(({ type, match, start, end }) => {
      // Add text before this match
      if (start > currentPos) {
        const textBefore = remaining.slice(currentPos, start);
        if (textBefore.trim() || textBefore.includes('\n')) {
          // Preserve text that has content OR contains line breaks
          elements.push({ type: 'text', content: textBefore });
        }
      }

      // Add the matched element
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

    // Add remaining text
    if (currentPos < remaining.length) {
      const remainingText = remaining.slice(currentPos);
      if (remainingText.trim() || remainingText.includes('\n')) {
        // Preserve text that has content OR contains line breaks
        elements.push({ type: 'text', content: remainingText });
      }
    }

    return { elements, latexPlaceholders: [] };
  };

  // Helper function to convert markdown table to HTML
  const mdTableToHtml = (md) => {
    // Split lines, remove any empty ones
    const lines = md.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return '';
    
    // Header row
    const headers = lines[0]
      .trim()
      .split('|')
      .slice(1, -1)
      .map(h => h.trim());
    
    // Data rows start after the separator line
    const rows = lines
      .slice(2)
      .map(line =>
        line
          .trim()
          .split('|')
          .slice(1, -1)
          .map(cell => cell.trim())
      );

    let html = '<table style="border-collapse: collapse; border: 1px solid black; width: 100%; text-align: left; font-size: 14px;">';
    html += '<thead style="background-color: #f2f2f2;"><tr>';
    headers.forEach(h => {
      html += `<th style="border: 1px solid black; padding: 10px;">${stripMarkers(h)}</th>`;
    });
    html += '</tr></thead><tbody>';

    rows.forEach(cells => {
      html += '<tr>';
      cells.forEach(c => {
        html += `<td style="border: 1px solid black; padding: 10px;">${stripMarkers(c)}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table>';
    return html;
  };

  const parseBookmarksFile = (content) => {
    const questions = [];
    
    // Split by question blocks - support both old and new formats
    let questionBlocks = [];
    
    // Try new format first
    if (content.includes('````ad-question')) {
      questionBlocks = content.split('````ad-question').filter(block => block.trim());
      // For new format, we need to handle the end differently
      questionBlocks = questionBlocks.map(block => {
        const parts = block.split('````');
        return parts.length >= 2 ? parts[0].trim() : block.trim();
      }).filter(block => block);
    } else {
      // Fall back to old format
      questionBlocks = content.split('--- start-question').filter(block => block.trim());
      questionBlocks = questionBlocks.map(block => {
        const parts = block.split('--- end-question');
        return parts.length >= 2 ? parts[0].trim() : block.trim();
      }).filter(block => block);
    }
    
    questionBlocks.forEach((questionContent, index) => {
        // Parse question content
        const lines = questionContent.split('\n'); // Don't filter out empty lines yet
        const question = {
          id: null, // Will be set from ID: line or fallback to generated ID
          type: 'T-F',
          text: '',
          answer: '',
          explanation: '',
          blanks: [],
          // New properties for full content support
          orderedElements: [],
          explanationOrderedElements: [],
          images: [],
          codeBlocks: [],
          latexBlocks: [],
          htmlTables: [],
          explanationImages: [],
          explanationCodeBlocks: [],
          explanationLatexBlocks: [],
          explanationHtmlTables: []
        };
        
        let currentSection = '';
        let textLines = [];
        let explanationLines = [];
        
        lines.forEach(line => {
          const trimmed = line.trim();
          if (trimmed.startsWith('TYPE:')) {
            question.type = trimmed.substring(5).trim();
          } else if (trimmed.startsWith('ID:')) {
            // Extract the actual question ID from the markdown
            question.id = trimmed.substring(3).trim();
            console.log(`🔖 BOOKMARK PARSER - Extracted ID: ${question.id}`);
          } else if (trimmed.startsWith('AUDIO:')) {
            // Extract audio file information and remove ![[]] brackets if present
            let audioFileRaw = trimmed.substring(6).trim();
            if (audioFileRaw.startsWith('![[') && audioFileRaw.endsWith(']]')) {
              question.audioFile = audioFileRaw.slice(3, -2);
            } else {
              question.audioFile = audioFileRaw;
            }
            console.log(`🔖 BOOKMARK PARSER - Extracted audio: ${question.audioFile}`);
          } else if (trimmed.startsWith('Q:')) {
            currentSection = 'question';
            // If there's content after Q: on the same line, include it
            const questionStart = trimmed.substring(2).trim();
            if (questionStart) {
              textLines.push(questionStart);
            }
          } else if (trimmed.startsWith('ANSWER:') || trimmed.startsWith('A:')) {
            // Handle both old format (A:) and new format (ANSWER:)
            const answerText = trimmed.startsWith('ANSWER:') 
              ? trimmed.substring(7).trim()
              : trimmed.substring(2).trim();
            if (question.type === 'CLOZE') {
              // For CLOZE questions, split answers by comma
              question.blanks = answerText.split(',').map(a => a.trim());
            } else {
              question.answer = answerText;
            }
            currentSection = '';
          } else if (trimmed.startsWith('E:')) {
            currentSection = 'explanation';
            // If there's content after E: on the same line, include it
            const explanationStart = trimmed.substring(2).trim();
            if (explanationStart) {
              explanationLines.push(explanationStart);
            }
          } else if (currentSection === 'question') {
            // Add all content, preserving original formatting
            textLines.push(line);
          } else if (currentSection === 'explanation') {
            // Add all content, preserving original formatting
            explanationLines.push(line);
          }
        });
        
        const questionText = textLines.join('\n');
        const explanationText = explanationLines.join('\n');
        
        // Parse question content with full markdown support
        if (questionText) {
          const { elements } = parseContentWithOrder(questionText, question.type === 'CLOZE');
          question.orderedElements = elements;
          
          // Always preserve the raw text for Anki export
          question.rawText = questionText;
          
          // Build cleaned text (similar to main parser)
          let cleanedText = '';
          elements.forEach(element => {
            if (element.type === 'text' || element.type === 'latexPlaceholder') {
              cleanedText += element.content + ' ';
            }
          });
          question.text = cleanedText.trim();
          
          // Process cloze markers if it's a cloze question
          if (question.type === 'CLOZE') {
            console.log('🔍 BOOKMARK CLOZE - Processing cloze question:', question.id);
            console.log('🔍 BOOKMARK CLOZE - Original text:', questionText);
            
            // Use the SAME approach as main quiz: convert to sequential blanks first
            const sequentialText = toSequentialBlanks(questionText);
            console.log('🔍 BOOKMARK CLOZE - After sequential conversion:', sequentialText);
            
            // Extract ALL cloze blanks using the new centralized function
            const allBlanks = extractAllClozeBlanks(questionText);
            console.log('🔍 BOOKMARK CLOZE - Extracted blanks:', allBlanks);
            
            if (allBlanks.length > 0) {
              question.blanks = allBlanks;
            }
            
            // Re-parse elements with sequential processing applied
            const { elements: sequentialElements } = parseContentWithOrder(sequentialText, true);
            
            // Use processClozeElements with toSequential: true (same as main quiz)
            question.orderedElements = processClozeElements(sequentialElements, { 
              stripMarkers: false, 
              toSequential: false  // Already converted above
            }).map(element => {
              // Convert tables to HTML for rendering (same as non-cloze questions)
              if (element.type === 'table') {
                return { ...element, content: mdTableToHtml(element.content) };
              }
              return element;
            });
            
            // Also create a processed text for backwards compatibility using sequential format
            question.text = sequentialText;
            
            console.log('🔍 BOOKMARK CLOZE - Final processed elements:', question.orderedElements);
          } else {
            // For non-cloze questions, convert tables to HTML
            question.orderedElements = elements.map(element => {
              if (element.type === 'table') {
                return { ...element, content: mdTableToHtml(element.content) };
              }
              return element;
            });
          }
          
          // Extract legacy properties for backwards compatibility
          elements.forEach(element => {
            switch (element.type) {
              case 'image':
                question.images.push(element.content);
                break;
              case 'codeBlock':
                question.codeBlocks.push(element.content);
                break;
              case 'table':
                question.htmlTables.push(mdTableToHtml(element.content));
                break;
              case 'latex':
                if (element.content?.latexType === 'display') {
                  question.latexBlocks.push(element.content.latex);
                }
                break;
            }
          });
          
        } else {
          question.text = '';
        }
        
        // Parse explanation content with full markdown support
        if (explanationText) {
          const { elements } = parseContentWithOrder(explanationText, false);
          question.explanationOrderedElements = elements.map(element => {
            if (element.type === 'text') {
              // Use stripMarkers to clean any cloze markup in explanations
              if (/\{\{c\d+::[^}]+\}\}/.test(element.content)) {
                return { ...element, content: stripMarkers(element.content) };
              }
            } else if (element.type === 'table') {
              return { ...element, content: mdTableToHtml(element.content) };
            }
            return element;
          });
          
          // Preserve raw explanation text for Anki export (especially if it contains cloze markers)
          question.rawExplanation = explanationText;
          
          // Build cleaned explanation text (similar to main parser)
          let cleanedExplanationText = '';
          elements.forEach(element => {
            if (element.type === 'text' || element.type === 'latexPlaceholder') {
              cleanedExplanationText += element.content + ' ';
            }
          });
          question.explanation = cleanedExplanationText.trim();
          
          // Extract legacy properties for backwards compatibility
          elements.forEach(element => {
            switch (element.type) {
              case 'image':
                question.explanationImages.push(element.content);
                break;
              case 'codeBlock':
                question.explanationCodeBlocks.push(element.content);
                break;
              case 'table':
                question.explanationHtmlTables.push(mdTableToHtml(element.content));
                break;
              case 'latex':
                if (element.content?.latexType === 'display') {
                  question.explanationLatexBlocks.push(element.content.latex);
                }
                break;
            }
          });
        } else {
          question.explanation = '';
        }
        
        // Ensure question has an ID - generate fallback if needed
        if (!question.id) {
          // Generate a fallback ID based on content hash and index
          const contentHash = simpleHash(question.text || 'empty');
          question.id = `bookmark_${index}_${contentHash}`;
          console.log(`🔖 BOOKMARK PARSER - Generated fallback ID: ${question.id}`);
        }
        
        // Include question if it has text content OR has ordered elements (LaTeX, images, etc.)
        const hasContent = question.text || 
                          (question.orderedElements && question.orderedElements.length > 0) ||
                          question.answer ||
                          question.explanation;
        
        if (hasContent) {
          questions.push(question);
        }
    });
    
    return questions;
  };

  // Simple hash function for fallback IDs
  const simpleHash = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36).substring(0, 6);
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
    console.log('🔍 See Answer clicked in bookmarks - showing correct answers without auto-filling');
    
    // Generate feedback for all bookmarked questions based on their current state
    const newFeedback = {};
    bookmarks.forEach(q => {
      console.log('🔍 Processing bookmark question:', {
        id: q.id,
        type: q.type,
        answer: q.answer,
        userAnswer: answers[q.id] || '',
        hasBlanks: !!(q.blanks && q.blanks.length > 0)
      });
      
      if (q.type === 'CLOZE' && q.blanks) {
        q.blanks.forEach((blank, bi) => {
          const key = `${q.id}_${bi+1}`;
          const userAnswer = answers[key] || '';
          // Compare user answer with correct answer (case-insensitive, trimmed)
          const isCorrect = userAnswer.trim().toLowerCase() === blank.trim().toLowerCase();
          newFeedback[key] = isCorrect ? 'correct' : 'incorrect';
          
          console.log('🔍 Bookmarks Cloze Comparison Debug:', {
            questionId: q.id,
            blankIndex: bi,
            key,
            userAnswer: `"${userAnswer}"`,
            correctAnswer: `"${blank}"`,
            isCorrect
          });
        });
      } else if (q.answer) {
        const userAnswer = answers[q.id] || '';
        // Compare based on question type
        let isCorrect = false;
        if (q.type === 'T-F') {
          // Convert UI values (R/F) to stored values (True/False) for comparison
          let userAnswerConverted = '';
          if (userAnswer === 'R') userAnswerConverted = 'True';
          else if (userAnswer === 'F') userAnswerConverted = 'False';
          else userAnswerConverted = userAnswer; // Keep original if not R/F
          
          isCorrect = userAnswerConverted === q.answer;
          
          console.log('🔍 Bookmarks T-F Comparison Debug:', {
            questionId: q.id,
            userAnswer,
            userAnswerConverted,
            correctAnswer: q.answer,
            isCorrect
          });
        } else if (q.type === 'Short') {
          // Case-insensitive comparison for short answers
          isCorrect = userAnswer.trim().toLowerCase() === (q.answer || '').trim().toLowerCase();
          
          console.log('🔍 Bookmarks Short Answer Comparison Debug:', {
            questionId: q.id,
            userAnswer: `"${userAnswer}"`,
            userAnswerTrimmed: `"${userAnswer.trim().toLowerCase()}"`,
            correctAnswer: `"${q.answer || ''}"`,
            correctAnswerTrimmed: `"${(q.answer || '').trim().toLowerCase()}"`,
            isCorrect
          });
        } else {
          // Handle any other question types or fallback
          console.log('🔍 Bookmarks Unknown Type Debug:', {
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
    
    console.log('🔍 Bookmarks Final Feedback:', newFeedback);
    
    // Set the feedback and show feedback mode
    setFeedback(newFeedback);
    setShowFeedback(true);
  };

  // Handle individual question answer revealing
  const handleShowIndividualAnswer = (questionId, hide = false) => {
    console.log('🔍 Individual See Answer clicked for bookmark question:', questionId, hide ? '(hiding)' : '(showing)');
    
    if (hide) {
      // Remove from individual feedback to hide answer
      setIndividualFeedback(prev => {
        const updated = { ...prev };
        delete updated[questionId];
        return updated;
      });
      return;
    }
    
    // Find the bookmarked question to generate feedback for it
    const question = bookmarks.find(q => q.id === questionId);
    if (!question) {
      console.warn('Bookmarked question not found:', questionId);
      return;
    }
    
    const newFeedback = {};
    
    if (question.type === 'CLOZE' && question.blanks) {
      question.blanks.forEach((blank, bi) => {
        const key = `${question.id}_${bi+1}`;
        const userAnswer = answers[key] || '';
        const isCorrect = userAnswer.trim().toLowerCase() === blank.trim().toLowerCase();
        newFeedback[key] = isCorrect ? 'correct' : 'incorrect';
        
        console.log('🔍 Individual Bookmark Cloze Comparison Debug:', {
          questionId: question.id,
          blankIndex: bi,
          key,
          userAnswer: `"${userAnswer}"`,
          correctAnswer: `"${blank}"`,
          isCorrect
        });
      });
    } else if (question.answer) {
      const userAnswer = answers[question.id] || '';
      let isCorrect = false;
      
      if (question.type === 'T-F') {
        let userAnswerConverted = '';
        if (userAnswer === 'R') userAnswerConverted = 'True';
        else if (userAnswer === 'F') userAnswerConverted = 'False';
        else userAnswerConverted = userAnswer;
        
        isCorrect = userAnswerConverted === question.answer;
        
        console.log('🔍 Individual Bookmark T-F Comparison Debug:', {
          questionId: question.id,
          userAnswer,
          userAnswerConverted,
          correctAnswer: question.answer,
          isCorrect
        });
      } else if (question.type === 'Short') {
        isCorrect = userAnswer.trim().toLowerCase() === (question.answer || '').trim().toLowerCase();
        
        console.log('🔍 Individual Bookmark Short Answer Comparison Debug:', {
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
    setFeedback(prev => ({ ...prev, ...newFeedback }));
    setIndividualFeedback(prev => ({ ...prev, [questionId]: true }));
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
    setIndividualFeedback({});
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
          <div className="flex items-center gap-2">
            <button
              onClick={testMediaUpload}
              className="px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              title="Test media upload functionality"
            >
              🧪 Test Media
            </button>
            <ThemeSelector />
          </div>
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
            {/* Render questions with memoized components */}
            <div className="space-y-4">
              {bookmarks.map((question, index) => (
                <QuestionItem
                  key={question.id || index}
                  question={question}
                  answers={answers}
                  feedback={feedback}
                  onChange={handleAnswerChange}
                  showFeedback={showFeedback}
                  individualFeedback={individualFeedback}
                  onShowIndividualAnswer={handleShowIndividualAnswer}
                  seqStart={index + 1}
                />
              ))}
            </div>
            
            <TestControls
              onCheck={checkAnswers}
              onShow={doTestForMe}
              onReset={resetAnswers}
              allAnswered={allAnswered}
            />
            
            {/* Bottom Back to Quiz Selection Button */}
            <div className="flex justify-start mt-8 pt-6 border-t border-gray-200 dark:border-gray-600">
              <button
                onClick={onBack}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Return to quiz selection"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Quiz Selection
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BookmarksViewer;
