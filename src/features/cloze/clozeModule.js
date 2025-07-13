/**
 * Centralized Cloze Logic Module
 * 
 * This module provides a single source of truth for handling Anki-style cloze deletions
 * with any cN:: markers (c1::, c2::, c3::, etc.). All cloze parsing, blanking, stripping, 
 * and rendering logic is centralized here to ensure consistent behavior across the entire app.
 */

import React from 'react';

// ============================================================================
// CORE CONSTANTS AND TYPES
// ============================================================================

// Single regex pattern used by all functions for any cloze markers
// match {{c1::…}} non-greedily across lines
export const CLOZE_RE = /\{\{c(\d+)::([\s\S]+?)\}\}/g;

// Blank placeholder used for rendering
const BLANK_PLACEHOLDER = '_____';

// ============================================================================
// NEW: extract LaTeX chunks and turn them into placeholders
// so that backslashes, braces, subscripts, etc. never confuse our cloze regex
// ============================================================================
const LATEX_INLINE_RE  = /\$(?:\\.|[^\$\\])+\$/g;
const LATEX_DISPLAY_RE = /\$\$[\s\S]+?\$\$/g;

function extractLatexPlaceholders(text) {
  const placeholders = [];
  let idx = 0;

  // first strip out display math
  let t = text.replace(LATEX_DISPLAY_RE, m => {
    const key = `__LATEX_${idx}__`;
    placeholders.push({ placeholder: key, latex: m, latexType: 'display' });
    idx++;
    return key;
  });
  // then inline math
  t = t.replace(LATEX_INLINE_RE, m => {
    const key = `__LATEX_${idx}__`;
    placeholders.push({ placeholder: key, latex: m, latexType: 'inline' });
    idx++;
    return key;
  });

  return { processedText: t, latexPlaceholders: placeholders };
}

/**
 * ClozeInfo interface for parsed cloze data
 * @typedef {Object} ClozeInfo
 * @property {number} id - The cloze number (e.g., 1 for c1::)
 * @property {string} content - The content inside the cloze marker
 * @property {string} fullMatch - The complete cloze marker string
 * @property {number} start - Start position in original text
 * @property {number} end - End position in original text
 */

/**
 * ParsedCloze result containing ids and mixed content parts
 * @typedef {Object} ParsedCloze
 * @property {number[]} ids - Array of unique cloze IDs found
 * @property {Array<string|ClozeInfo>} parts - Mixed array of text strings and cloze info objects
 */

// ============================================================================
// PARSING AND TEXT PROCESSING
// ============================================================================

/**
 * Parse cloze text and return structured data for rendering
 * 
 * @param {string} text - The text containing cloze markers
 * @returns {Object} { ids, parts, latexPlaceholders }
 */
export function parseClozes(originalText) {
  if (!originalText || typeof originalText !== 'string') {
    return { ids: [], parts: [originalText || ''], latexPlaceholders: [] };
  }
  
  // STEP 1: pull out any LaTeX so it can't break our cloze‐regex
  const { processedText, latexPlaceholders } = extractLatexPlaceholders(originalText);

  // Reset regex lastIndex to ensure consistent behavior
  CLOZE_RE.lastIndex = 0;
  
  const clozes = Array.from(processedText.matchAll(CLOZE_RE), m => ({
    id: +m[1],
    content: m[2],      // this content still has __LATEX_n__ placeholders in it
    fullMatch: m[0],
    start: m.index,
    end: m.index + m[0].length
  }));
  
  if (clozes.length === 0) {
    return { ids: [], parts: [processedText], latexPlaceholders };
  }
  
  // Extract unique IDs
  const ids = [...new Set(clozes.map(c => c.id))].sort((a, b) => a - b);
  
  // Build parts array
  const parts = [];
  let lastIndex = 0;
  
  clozes.forEach(cloze => {
    // Add text before this cloze
    if (cloze.start > lastIndex) {
      const textBefore = processedText.slice(lastIndex, cloze.start);
      if (textBefore) parts.push(textBefore);
    }
    
    // Add the cloze info object
    parts.push(cloze);
    lastIndex = cloze.end;
  });
  
  // Add remaining text after last cloze
  if (lastIndex < processedText.length) {
    const remainingText = processedText.slice(lastIndex);
    if (remainingText) parts.push(remainingText);
  }
  
  return { ids, parts, latexPlaceholders };
}

/**
 * Strip all cloze markers from text, leaving only the inner content
 * 
 * @param {string} text - The text containing cloze markers to strip
 * @returns {string} Text with cloze markers removed, showing only inner content
 */
export function stripMarkers(text) {
  if (!text || typeof text !== 'string') return text || '';
  
  // STEP 1: pull out any LaTeX so it can't break our cloze‐regex
  const { processedText, latexPlaceholders } = extractLatexPlaceholders(text);
  
  // Strip cloze markers from processed text
  const stripped = processedText.replace(CLOZE_RE, (_, id, content) => content);
  
  // STEP 2: restore LaTeX placeholders
  let result = stripped;
  latexPlaceholders.forEach(({ placeholder, latex }) => {
    result = result.replace(placeholder, latex);
  });
  
  return result;
}

/**
 * Replace cloze markers with blank placeholders for preview/non-interactive views
 * 
 * @param {string} text - The text containing cloze markers to convert to blanks
 * @param {number|null} targetId - Specific cloze ID to blank out (null for all)
 * @returns {string} Text with specified cloze markers replaced by blank placeholders
 */
export function replaceWithBlanks(text, targetId = null) {
  if (!text || typeof text !== 'string') return text || '';
  
  // STEP 1: pull out any LaTeX so it can't break our cloze‐regex
  const { processedText, latexPlaceholders } = extractLatexPlaceholders(text);
  
  // Replace cloze markers with blanks in processed text
  const blanked = processedText.replace(CLOZE_RE, (fullMatch, id, content) => {
    const clozeId = +id;
    if (targetId === null || clozeId === targetId) {
      return BLANK_PLACEHOLDER;
    }
    return fullMatch; // Keep original if not targeting this ID
  });
  
  // STEP 2: restore LaTeX placeholders
  let result = blanked;
  latexPlaceholders.forEach(({ placeholder, latex }) => {
    result = result.replace(placeholder, latex);
  });
  
  return result;
}

// ============================================================================
// RENDERING UTILITIES
// ============================================================================

/**
 * Render cloze text with interactive inputs or React components
 * 
 * @param {Array<string|ClozeInfo>} parts - Parts array from parseClozes()
 * @param {Object} props - Rendering configuration
 * @param {function} props.renderBlank - Function to render blank inputs: (blankIndex, clozeInfo) => ReactNode
 * @param {function} [props.renderText] - Optional function to render text parts: (text) => ReactNode
 * @param {number} [props.startingBlankIndex] - Starting index for blank numbering
 * @returns {ReactNode[]} Array of React nodes for rendering
 */
export function renderWithInputs(parts, props) {
  if (!Array.isArray(parts)) return [];
  if (typeof props.renderBlank !== 'function') {
    throw new Error('renderBlank must be a function');
  }
  
  const { renderBlank, renderText = (text) => text, startingBlankIndex = 0 } = props;
  
  const renderedClozeIds = new Set();
  let blankIndex = startingBlankIndex;
  
  return parts.map((part, partIndex) => {
    if (typeof part === 'string') {
      // Text part
      return React.isValidElement(renderText(part)) 
        ? React.cloneElement(renderText(part), { key: `text-${partIndex}` })
        : renderText(part);
    } else {
      // ClozeInfo part
      const { id } = part;
      
      // Only render input for first occurrence of each cloze ID
      if (!renderedClozeIds.has(id)) {
        renderedClozeIds.add(id);
        const element = renderBlank(blankIndex, part);
        blankIndex++;
        
        return React.isValidElement(element)
          ? React.cloneElement(element, { key: `blank-${partIndex}` })
          : element;
      } else {
        // For subsequent occurrences, render a placeholder
        return React.createElement('span', 
          { key: `placeholder-${partIndex}`, className: 'cloze-placeholder' },
          BLANK_PLACEHOLDER
        );
      }
    }
  });
}

// ============================================================================
// BLANK EXTRACTION UTILITIES
// ============================================================================

/**
 * Extract blanks from cloze content for question processing
 * Groups clozes by ID and extracts unique content for each group
 * 
 * @param {string|Object} content - Text content or question object with rawText
 * @returns {Object} { blanks: string[], latexPlaceholders: array }
 */
export function extractClozeBlanksByGroup(content) {
  const text = typeof content === 'string' ? content : (content?.rawText || content?.text || '');
  if (!text) return { blanks: [], latexPlaceholders: [] };
  
  const { ids, latexPlaceholders } = parseClozes(text);
  const blanksByGroup = new Map();
  
  // STEP 1: pull out any LaTeX so it can't break our cloze‐regex
  const { processedText } = extractLatexPlaceholders(text);
  
  // Reset regex for fresh scan
  CLOZE_RE.lastIndex = 0;
  
  // Find all clozes and group by ID
  const matches = Array.from(processedText.matchAll(CLOZE_RE));
  matches.forEach(match => {
    const id = +match[1];
    const content = match[2];  // this content has __LATEX_n__ placeholders in it
    
    if (!blanksByGroup.has(id)) {
      blanksByGroup.set(id, content);
    }
  });
  
  // Return in ID order
  const blanks = ids.map(id => blanksByGroup.get(id)).filter(Boolean);
  return { blanks, latexPlaceholders };
}

/**
 * Extract ALL cloze blanks individually (not grouped by ID)
 * Each cloze marker becomes a separate blank, regardless of ID duplication
 * 
 * @param {string|Object} content - Text content or question object with rawText
 * @returns {Object} { blanks: string[], latexPlaceholders: array }
 */
export function extractAllClozeBlanks(content) {
  const text = typeof content === 'string' ? content : (content?.rawText || content?.text || '');
  if (!text) return { blanks: [], latexPlaceholders: [] };
  
  // STEP 1: pull out any LaTeX so it can't break our cloze‐regex
  const { processedText, latexPlaceholders } = extractLatexPlaceholders(text);
  
  // Reset regex for fresh scan
  CLOZE_RE.lastIndex = 0;
  
  // Find all clozes in order and extract content
  const matches = Array.from(processedText.matchAll(CLOZE_RE));
  const blanks = matches.map(match => match[2]); // content with __LATEX_n__ placeholders
  
  return { blanks, latexPlaceholders };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert cloze text to sequentially numbered blank placeholders
 * Creates unique placeholders for each cloze occurrence regardless of ID
 * 
 * @param {string} text - Text containing cloze markers
 * @returns {string} Text with sequentially numbered blank placeholders
 */
export function toSequentialBlanks(text) {
  if (!text || typeof text !== 'string') return text || '';
  
  // STEP 1: pull out any LaTeX so it can't break our cloze‐regex
  const { processedText, latexPlaceholders } = extractLatexPlaceholders(text);
  
  let counter = 1;
  const sequential = processedText.replace(CLOZE_RE, (fullMatch, id, content) => {
    return `__CLOZE_${counter++}__`;
  });
  
  // STEP 2: restore LaTeX placeholders
  let result = sequential;
  latexPlaceholders.forEach(({ placeholder, latex }) => {
    result = result.replace(placeholder, latex);
  });
  
  return result;
}

/**
 * Check if text contains cloze markers
 * 
 * @param {string} text - Text to check
 * @returns {boolean} True if text contains cloze markers
 */
export function hasCloze(text) {
  if (!text || typeof text !== 'string') return false;
  
  // Extract LaTeX first to avoid false positives
  const { processedText } = extractLatexPlaceholders(text);
  return CLOZE_RE.test(processedText);
}

/**
 * Get all unique cloze IDs present in the text
 * 
 * @param {string} text - The text to analyze for cloze IDs
 * @returns {number[]} Sorted array of unique cloze IDs
 */
export function getClozeIds(text) {
  if (!text || typeof text !== 'string') return [];
  
  const { ids } = parseClozes(text);
  return ids;
}

/**
 * Find cloze markers in text (legacy API)
 * 
 * @param {string} text - Text to search for cloze markers
 * @returns {Array} Array of cloze objects with id, content, fullMatch
 */
export function findCloze(text) {
  if (!text || typeof text !== 'string') return [];
  
  // Extract LaTeX first to ensure proper cloze parsing
  const { processedText, latexPlaceholders } = extractLatexPlaceholders(text);
  
  CLOZE_RE.lastIndex = 0;
  
  const clozes = Array.from(processedText.matchAll(CLOZE_RE), m => ({ 
    id: +m[1], 
    content: m[2], // content with __LATEX_n__ placeholders
    fullMatch: m[0]
  }));
  
  // Restore LaTeX in content for legacy compatibility
  return clozes.map(cloze => ({
    ...cloze,
    content: restoreLatexInText(cloze.content, latexPlaceholders)
  }));
}

// Helper function for restoring LaTeX in text
function restoreLatexInText(text, latexPlaceholders) {
  let result = text;
  latexPlaceholders.forEach(({ placeholder, latex }) => {
    result = result.replace(placeholder, latex);
  });
  return result;
}

/**
 * Validate cloze text structure
 * Checks for proper cloze marker format and content
 * 
 * @param {string} text - Text to validate
 * @returns {Object} Validation result with isValid and errors
 */
export function validateClozeText(text) {
  if (!text || typeof text !== 'string') {
    return { isValid: false, errors: ['Text is empty or invalid'] };
  }
  
  const { parts, ids } = parseClozes(text);
  const errors = [];
  
  if (ids.length === 0) {
    return { isValid: true, errors: [], message: 'No cloze markers found' };
  }
  
  // Check for empty cloze content
  const clozePartsWithContent = parts.filter(part => 
    typeof part === 'object' && part.content && part.content.trim()
  );
  
  if (clozePartsWithContent.length !== parts.filter(part => typeof part === 'object').length) {
    errors.push('Some cloze markers have empty content');
  }
  
  // Check for sequential numbering
  const sortedIds = [...ids].sort((a, b) => a - b);
  for (let i = 0; i < sortedIds.length; i++) {
    if (sortedIds[i] !== i + 1) {
      errors.push(`Cloze IDs are not sequential (found ${ids.join(', ')}, expected 1-${ids.length})`);
      break;
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    ids,
    clozeCount: ids.length
  };
}

/**
 * Legacy function: Replace cloze markers with blank placeholders (alias for replaceWithBlanks)
 * 
 * @param {string} text - Text containing cloze markers
 * @param {number|null} targetId - Specific cloze ID to blank out (null for all)  
 * @returns {string} Text with specified cloze markers replaced by blank placeholders
 */
export function toBlanks(text, targetId = null) {
  return replaceWithBlanks(text, targetId);
}

// ============================================================================
// QUESTION PROCESSING UTILITIES
// ============================================================================

/**
 * Ensure question has proper cloze structure
 * Validates and repairs cloze question data
 * 
 * @param {Object} question - Question object to validate
 * @returns {Object} Validated/repaired question object
 */
export function ensureClozeQuestion(question) {
  if (!question) return question;
  
  // Ensure blanks array exists and is populated
  if (!question.blanks || question.blanks.length === 0) {
    const text = question.rawText || question.text || '';
    const { blanks, latexPlaceholders } = extractAllClozeBlanks(text);
    question.blanks = blanks;
    question.latexPlaceholders = latexPlaceholders;
  }
  
  return question;
}

/**
 * Process cloze elements in a question's ordered elements
 * Handles conversion and cleanup of cloze markers in structured content
 * 
 * @param {Array} elements - Array of ordered elements
 * @param {Object} options - Processing options
 * @returns {Array} Processed elements
 */
export function processClozeElements(elements, options = {}) {
  if (!Array.isArray(elements)) return elements;
  
  const { 
    stripMarkers: shouldStrip = false, 
    toSequential = false,
    replaceWithBlanks: shouldReplaceWithBlanks = false 
  } = options;
  
  return elements.map(element => {
    if (element.type === 'text' && element.content) {
      let content = element.content;
      
      if (shouldStrip) {
        content = stripMarkers(content);
      } else if (toSequential) {
        content = toSequentialBlanks(content);
      } else if (shouldReplaceWithBlanks) {
        content = replaceWithBlanks(content);
      }
      
      return { ...element, content };
    }
    return element;
  });
}

// ============================================================================
// REACT COMPONENTS
// ============================================================================

/**
 * React component for rendering a cloze blank (input field or feedback display)
 * This centralizes all blank rendering logic
 * 
 * @param {Object} props - Component props
 * @param {Object} props.question - Question object with id and blanks
 * @param {number} props.blankIndex - Index of this blank in the question
 * @param {Object} props.value - Current form values object
 * @param {function} props.onChange - Change handler for input
 * @param {boolean} props.showFeedback - Whether to show feedback mode
 * @param {Object} props.feedback - Feedback object with correctness info
 * @param {string} [props.className] - Additional CSS classes
 * @param {Object} [props.clozeInfo] - Optional cloze info for context
 */
export function ClozeBlank({ 
  question, 
  blankIndex, 
  value, 
  onChange, 
  showFeedback, 
  feedback,
  className = '',
  clozeInfo = null,
  renderLatex = null
}) {
  if (!question) return null;
  
  const fieldName = `${question.id}_${blankIndex + 1}`;
  const userAnswer = value && value[fieldName];
  const isCorrect = feedback && feedback[fieldName] === 'correct';
  let expectedAnswer = question.blanks && question.blanks[blankIndex];

  // Helper function to restore LaTeX placeholders in text
  const restoreLatexPlaceholders = (text) => {
    if (!text || !question?.latexPlaceholders || question.latexPlaceholders.length === 0) {
      return text;
    }
    
    let processedText = text;
    
    // Replace LaTeX placeholders with their original LaTeX content
    question.latexPlaceholders.forEach(({ placeholder, latex, latexType }) => {
      if (processedText.includes(placeholder)) {
        // The latex already includes the delimiters ($..$ or $$..$$)
        processedText = processedText.replace(placeholder, latex);
      }
    });
    
    return processedText;
  };

  // Restore LaTeX placeholders in expected answer
  if (expectedAnswer) {
    expectedAnswer = restoreLatexPlaceholders(expectedAnswer);
  }

  if (showFeedback) {
    const elements = [];
    
    // Always show user's answer if they provided one
    if (userAnswer) {
      // Restore LaTeX placeholders in user answer for display
      const displayUserAnswer = restoreLatexPlaceholders(userAnswer);
      
      elements.push(React.createElement('span', {
        key: 'user-answer',
        className: `inline-block px-3 py-1 border rounded text-sm font-medium ${
          isCorrect
            ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-600 text-green-800 dark:text-green-200'
            : 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-600 text-red-800 dark:text-red-200'
        }`
      }, renderLatex ? renderLatex(displayUserAnswer) : displayUserAnswer));
      
      // Add feedback symbol after user answer
      elements.push(React.createElement('span', {
        key: 'feedback-symbol',
        className: isCorrect 
          ? 'text-green-500 dark:text-green-400'
          : 'text-red-500 dark:text-red-400'
      }, isCorrect ? '✅' : '❌'));
    } else {
      // If no user answer, show blank indicator
      elements.push(React.createElement('span', {
        key: 'blank-indicator',
        className: 'inline-block px-3 py-1 border rounded text-sm font-medium bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'
      }, '(blank)'));
      
      // Add X symbol for blank answer
      elements.push(React.createElement('span', {
        key: 'feedback-symbol',
        className: 'text-red-500 dark:text-red-400'
      }, '❌'));
    }
    
    // Always show the correct answer for learning purposes
    if (expectedAnswer) {
      elements.push(React.createElement('span', {
        key: 'correct-label',
        className: 'text-xs text-gray-500 dark:text-gray-400 font-medium'
      }, '→'));
      
      elements.push(React.createElement('span', {
        key: 'expected-answer',
        className: 'inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-600 rounded text-sm font-medium text-blue-800 dark:text-blue-200'
      }, renderLatex ? renderLatex(expectedAnswer) : expectedAnswer));
    }
    
    return React.createElement('span', {
      className: 'inline-flex items-center gap-2 mx-2'
    }, elements);
  }

  // Input mode
  return React.createElement('input', {
    name: fieldName,
    value: userAnswer || '',
    onChange: onChange,
    autoComplete: 'off',
    autoCorrect: 'off',
    spellCheck: 'false',
    className: `answer-input border rounded-lg px-2 py-1 mx-2 w-24 text-center inline-block focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 ${className}`,
    'data-blank-index': blankIndex,
    'data-cloze-id': clozeInfo?.id,
    'data-cloze-content': clozeInfo?.content
  });
}
