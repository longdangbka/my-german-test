/**
 * Centralized Cloze Logic Module
 * 
 * This ES module provides a single source of truth for handling Anki-style cloze deletions
 * with any cN:: markers (c1::, c2::, c3::, etc.). All cloze parsing, blanking, stripping, 
 * and rendering logic is centralized here to ensure consistent behavior across the entire app.
 * 
 * API Overview:
 * - parseClozes(text): { ids: number[], parts: Array<string|ClozeInfo> }
 * - stripMarkers(text): string
 * - replaceWithBlanks(text): string
 * - renderWithInputs(parts, props): ReactNode[]
 * 
 * Features:
 * - Numbered clozes (c1, c2, ...) and sequential renumbering
 * - Converting markers to blanks for preview/non-interactive views
 * - Stripping markers entirely while preserving inner text
 * - Injecting input fields or React components for interactive mode
 * - Inline/block LaTeX support inside cloze spans
 */

import React from 'react';

// Single regex pattern used by all functions for any cloze markers
export const CLOZE_RE = /\{\{c(\d+)::([^}]+)\}\}/g;

// Blank placeholder used for rendering
const BLANK_PLACEHOLDER = '_____';

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

/**
 * Parse cloze text and return structured data for rendering
 * This is the main API function that replaces all ad-hoc parsing logic
 * 
 * @param {string} text - The text containing cloze markers
 * @returns {ParsedCloze} Object with ids array and parts array for rendering
 * 
 * @example
 * parseClozes("Hello {{c1::world}} and {{c2::universe}}")
 * // Returns: {
 * //   ids: [1, 2],
 * //   parts: [
 * //     "Hello ", 
 * //     {id: 1, content: "world", fullMatch: "{{c1::world}}", start: 6, end: 19},
 * //     " and ",
 * //     {id: 2, content: "universe", fullMatch: "{{c2::universe}}", start: 24, end: 39}
 * //   ]
 * // }
 */
export function parseClozes(text) {
  if (!text || typeof text !== 'string') {
    return { ids: [], parts: [text || ''] };
  }
  
  // Reset regex lastIndex to ensure consistent behavior
  CLOZE_RE.lastIndex = 0;
  
  const clozes = Array.from(text.matchAll(CLOZE_RE), (m, index) => ({ 
    id: +m[1], 
    content: m[2],
    fullMatch: m[0],
    start: m.index,
    end: m.index + m[0].length
  }));
  
  if (clozes.length === 0) {
    return { ids: [], parts: [text] };
  }
  
  // Extract unique IDs
  const ids = [...new Set(clozes.map(c => c.id))].sort((a, b) => a - b);
  
  // Build parts array
  const parts = [];
  let lastIndex = 0;
  
  clozes.forEach(cloze => {
    // Add text before this cloze
    if (cloze.start > lastIndex) {
      const textBefore = text.slice(lastIndex, cloze.start);
      if (textBefore) parts.push(textBefore);
    }
    
    // Add the cloze info object
    parts.push(cloze);
    lastIndex = cloze.end;
  });
  
  // Add remaining text after last cloze
  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex);
    if (remainingText) parts.push(remainingText);
  }
  
  return { ids, parts };
}

/**
 * Strip all cloze markers from text, leaving only the inner content
 * This replaces all ad-hoc stripping logic throughout the app
 * 
 * @param {string} text - The text containing cloze markers to strip
 * @returns {string} Text with cloze markers removed, showing only inner content
 * 
 * @example
 * stripMarkers("Hello {{c1::world}} and {{c2::universe}}")
 * // Returns: "Hello world and universe"
 */
export function stripMarkers(text) {
  if (!text || typeof text !== 'string') return text || '';
  
  return text.replace(CLOZE_RE, (_, id, content) => content);
}

/**
 * Replace cloze markers with blank placeholders for preview/non-interactive views
 * Can target specific cloze IDs or all clozes
 * 
 * @param {string} text - The text containing cloze markers to convert to blanks
 * @param {number|null} targetId - Specific cloze ID to blank out (null for all)
 * @returns {string} Text with specified cloze markers replaced by blank placeholders
 * 
 * @example
 * replaceWithBlanks("Hello {{c1::world}} and {{c2::universe}}", 1)
 * // Returns: "Hello _____ and {{c2::universe}}"
 * 
 * replaceWithBlanks("Hello {{c1::world}} and {{c2::universe}}")
 * // Returns: "Hello _____ and _____"
 */
export function replaceWithBlanks(text, targetId = null) {
  if (!text || typeof text !== 'string') return text || '';
  
  return text.replace(CLOZE_RE, (fullMatch, id, content) => {
    const clozeId = +id;
    if (targetId === null || clozeId === targetId) {
      return BLANK_PLACEHOLDER;
    }
    return fullMatch; // Keep original if not targeting this ID
  });
}

/**
 * Render cloze text with interactive inputs or React components
 * This is the main React rendering function that replaces all ad-hoc rendering logic
 * 
 * @param {Array<string|ClozeInfo>} parts - Parts array from parseClozes()
 * @param {Object} props - Rendering configuration
 * @param {function} props.renderBlank - Function to render blank inputs: (blankIndex, clozeInfo) => ReactNode
 * @param {function} [props.renderText] - Optional function to render text parts: (text) => ReactNode
 * @param {number} [props.startingBlankIndex] - Starting index for blank numbering
 * @returns {ReactNode[]} Array of React nodes for rendering
 * 
 * @example
 * const { parts } = parseClozes("Hello {{c1::world}} and {{c1::universe}}");
 * renderWithInputs(parts, {
 *   renderBlank: (idx, clozeInfo) => 
 *     <input key={idx} placeholder={clozeInfo.content} />,
 *   renderText: (text) => <span>{text}</span>
 * })
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

/**
 * Extract blanks from cloze content for question processing
 * Groups clozes by ID and extracts unique content for each group
 * 
 * @param {string|Object} content - Text content or question object with rawText
 * @returns {string[]} Array of unique blank content strings
 * 
 * @example
 * extractClozeBlanksByGroup("{{c1::hello}} {{c2::world}} {{c1::hello}}")
 * // Returns: ["hello", "world"]
 */
export function extractClozeBlanksByGroup(content) {
  const text = typeof content === 'string' ? content : (content?.rawText || content?.text || '');
  if (!text) return [];
  
  const { ids } = parseClozes(text);
  const blanksByGroup = new Map();
  
  // Reset regex for fresh scan
  CLOZE_RE.lastIndex = 0;
  
  // Find all clozes and group by ID
  const matches = Array.from(text.matchAll(CLOZE_RE));
  matches.forEach(match => {
    const id = +match[1];
    const content = match[2];
    
    if (!blanksByGroup.has(id)) {
      blanksByGroup.set(id, content);
    }
  });
  
  // Return in ID order
  return ids.map(id => blanksByGroup.get(id)).filter(Boolean);
}

/**
 * Extract ALL cloze blanks individually (not grouped by ID)
 * Each cloze marker becomes a separate blank, regardless of ID duplication
 * 
 * @param {string|Object} content - Text content or question object with rawText
 * @returns {string[]} Array of all blank content strings in order
 * 
 * @example
 * extractAllClozeBlanks("{{c1::hello}} {{c2::world}} {{c1::again}}")
 * // Returns: ["hello", "world", "again"]
 */
export function extractAllClozeBlanks(content) {
  const text = typeof content === 'string' ? content : (content?.rawText || content?.text || '');
  if (!text) return [];
  
  // Reset regex for fresh scan
  CLOZE_RE.lastIndex = 0;
  
  // Find all clozes in order and extract content
  const matches = Array.from(text.matchAll(CLOZE_RE));
  return matches.map(match => match[2]);
}

/**
 * Convert cloze text to ID-aware blanks format
 * Creates placeholders like __CLOZE_1__ for each unique cloze ID
 * 
 * @param {string} text - Text containing cloze markers
 * @returns {string} Text with ID-aware blank placeholders
 * 
 * @example
 * toIdAwareBlanks("{{c1::hello}} {{c2::world}} {{c1::again}}")
 * // Returns: "__CLOZE_1__ __CLOZE_2__ __CLOZE_1__"
 */
export function toIdAwareBlanks(text) {
  if (!text || typeof text !== 'string') return text || '';
  
  return text.replace(CLOZE_RE, (fullMatch, id, content) => {
    return `__CLOZE_${id}__`;
  });
}

/**
 * Convert cloze text to sequentially numbered blank placeholders
 * Creates unique placeholders for each cloze occurrence regardless of ID
 * 
 * @param {string} text - Text containing cloze markers
 * @returns {string} Text with sequentially numbered blank placeholders
 * 
 * @example
 * toSequentialBlanks("{{c1::hello}} {{c2::world}} {{c1::again}}")
 * // Returns: "__CLOZE_1__ __CLOZE_2__ __CLOZE_3__"
 */
export function toSequentialBlanks(text) {
  if (!text || typeof text !== 'string') return text || '';
  
  let counter = 1;
  return text.replace(CLOZE_RE, (fullMatch, id, content) => {
    return `__CLOZE_${counter++}__`;
  });
}

/**
 * Extract blanks from ID-aware blank text
 * Processes text with __CLOZE_N__ placeholders to extract unique blanks
 * 
 * @param {string} text - Text containing ID-aware blanks
 * @param {string[]} originalBlanks - Original blanks array for reference
 * @returns {string[]} Array of unique blank content
 */
export function extractBlanksFromIdAwareBlanks(text, originalBlanks = []) {
  if (!text || typeof text !== 'string') return [];
  
  const idAwarePattern = /__CLOZE_(\d+)__/g;
  const foundIds = new Set();
  let match;
  
  while ((match = idAwarePattern.exec(text)) !== null) {
    foundIds.add(parseInt(match[1]));
  }
  
  // Return blanks for found IDs in order
  const sortedIds = Array.from(foundIds).sort((a, b) => a - b);
  return sortedIds.map(id => originalBlanks[id - 1]).filter(Boolean);
}

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
    question.blanks = extractAllClozeBlanks(text);
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
    toIdAware = false, 
    toSequential = false,
    replaceWithBlanks: shouldReplaceWithBlanks = false 
  } = options;
  
  return elements.map(element => {
    if (element.type === 'text' && element.content) {
      let content = element.content;
      
      if (shouldStrip) {
        content = stripMarkers(content);
      } else if (toIdAware) {
        content = toIdAwareBlanks(content);
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

/**
 * Check if text contains cloze markers
 * 
 * @param {string} text - Text to check
 * @returns {boolean} True if text contains cloze markers
 */
export function hasCloze(text) {
  if (!text || typeof text !== 'string') return false;
  return CLOZE_RE.test(text);
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
 * Get all unique cloze IDs present in the text.
 * 
 * @param {string} text - The text to analyze for cloze IDs
 * @returns {number[]} Sorted array of unique cloze IDs
 * 
 * @example
 * getClozeIds("Hello {{c1::world}} and {{c2::universe}} {{c1::again}}")
 * // Returns: [1, 2]
 */
export function getClozeIds(text) {
  if (!text || typeof text !== 'string') return [];
  
  const { ids } = parseClozes(text);
  return ids;
}

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
  const expectedAnswer = question.blanks && question.blanks[blankIndex];

  if (showFeedback) {
    const elements = [];
    
    // Always show user's answer if they provided one
    if (userAnswer) {
      elements.push(React.createElement('span', {
        key: 'user-answer',
        className: `inline-block px-3 py-1 border rounded text-sm font-medium ${
          isCorrect
            ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-600 text-green-800 dark:text-green-200'
            : 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-600 text-red-800 dark:text-red-200'
        }`
      }, renderLatex ? renderLatex(userAnswer) : userAnswer));
      
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

// ============================================================================
// BACKWARD COMPATIBILITY & LEGACY FUNCTIONS
// ============================================================================

/**
 * @deprecated Use parseClozes() instead
 * Legacy function for backward compatibility - finds cloze markers
 */
export function findCloze(text) {
  if (!text || typeof text !== 'string') return [];
  
  CLOZE_RE.lastIndex = 0;
  
  return Array.from(text.matchAll(CLOZE_RE), m => ({ 
    id: +m[1], 
    content: m[2],
    fullMatch: m[0]
  }));
}

/**
 * @deprecated Use stripMarkers() instead  
 * Legacy function for backward compatibility
 */
export function stripCloze(text) {
  return stripMarkers(text);
}

/**
 * @deprecated Use replaceWithBlanks() instead
 * Legacy function for backward compatibility
 */
export function toBlanks(text, targetId = null) {
  return replaceWithBlanks(text, targetId);
}

/**
 * @deprecated Use findCloze() instead
 * Legacy function for backward compatibility - finds only c1:: markers
 */
export function findCloze1(text) {
  return findCloze(text).filter(c => c.id === 1);
}

/**
 * @deprecated Use stripMarkers() instead  
 * Legacy function for backward compatibility - strips only c1:: markers
 */
export function stripCloze1(text) {
  if (!text || typeof text !== 'string') return text || '';
  const c1Regex = /\{\{c1::([^}]+)\}\}/g;
  return text.replace(c1Regex, (_, content) => content);
}

/**
 * @deprecated Use replaceWithBlanks(text, 1) instead
 * Legacy function for backward compatibility - blanks only c1:: markers
 */
export function toBlank1(text) {
  return replaceWithBlanks(text, 1);
}

/**
 * @deprecated Use renderWithInputs() with parseClozes() instead
 * Legacy function for backward compatibility
 */
export function renderClozeText(text, targetId = null, renderBlank) {
  if (!text || typeof text !== 'string') return [text || ''];
  if (typeof renderBlank !== 'function') {
    throw new Error('renderBlank must be a function');
  }
  
  // Convert to new API format
  const { parts } = parseClozes(text);
  
  // Filter to target ID if specified
  const filteredParts = targetId === null ? parts : parts.map(part => {
    if (typeof part === 'object' && part.id !== targetId) {
      return part.fullMatch; // Keep as text if not target ID
    }
    return part;
  });
  
  return renderWithInputs(filteredParts, {
    renderBlank: (idx, clozeInfo) => renderBlank(idx, clozeInfo),
    renderText: (text) => text
  });
}

/**
 * @deprecated Use renderWithInputs() with parseClozes() and targetId=1 instead
 * Legacy function for backward compatibility - renders only c1:: markers
 */
export function renderCloze1Text(text, renderBlank) {
  return renderClozeText(text, 1, renderBlank);
}

// ============================================================================
// USAGE EXAMPLES & API DOCUMENTATION
// ============================================================================

/*
 * MAIN API USAGE EXAMPLES:
 * 
 * 1. PARSING CLOZES FOR STRUCTURED DATA:
 * const { ids, parts } = parseClozes("The {{c1::capital}} of {{c2::France}} is {{c1::Paris}}");
 * // Result: {
 * //   ids: [1, 2],
 * //   parts: [
 * //     "The ",
 * //     {id: 1, content: "capital", fullMatch: "{{c1::capital}}", start: 4, end: 19},
 * //     " of ",
 * //     {id: 2, content: "France", fullMatch: "{{c2::France}}", start: 23, end: 36},
 * //     " is ",
 * //     {id: 1, content: "Paris", fullMatch: "{{c1::Paris}}", start: 40, end: 52}
 * //   ]
 * // }
 * 
 * 2. STRIPPING MARKERS FOR DISPLAY:
 * const cleaned = stripMarkers("The {{c1::capital}} of {{c2::France}} is {{c1::Paris}}");
 * // Result: "The capital of France is Paris"
 * 
 * 3. CONVERTING TO BLANKS FOR PREVIEW:
 * const withBlanks = replaceWithBlanks("The {{c1::capital}} of {{c2::France}} is {{c1::Paris}}", 1);
 * // Result: "The _____ of {{c2::France}} is _____"
 * 
 * const allBlanks = replaceWithBlanks("The {{c1::capital}} of {{c2::France}} is {{c1::Paris}}");
 * // Result: "The _____ of _____ is _____"
 * 
 * 4. RENDERING WITH REACT INPUTS:
 * const { parts } = parseClozes("The {{c1::capital}} of {{c2::France}} is {{c1::Paris}}");
 * const rendered = renderWithInputs(parts, {
 *   renderBlank: (idx, clozeInfo) => 
 *     <input 
 *       key={idx} 
 *       placeholder={clozeInfo.content}
 *       className="cloze-input" 
 *     />,
 *   renderText: (text) => <span>{text}</span>
 * });
 * // Result: [
 * //   <span>The </span>,
 * //   <input placeholder="capital" />,
 * //   <span> of </span>,
 * //   <input placeholder="France" />,
 * //   <span> is </span>,
 * //   <span className="cloze-placeholder">_____</span>  // Second c1 becomes placeholder
 * // ]
 * 
 * 5. EXTRACTING BLANKS FOR QUESTION PROCESSING:
 * const blanks = extractClozeBlanksByGroup("{{c1::hello}} {{c2::world}} {{c1::hello}}");
 * // Result: ["hello", "world"]  // Unique content per cloze ID
 * 
 * 6. RENDERING CLOZE BLANK COMPONENTS:
 * <ClozeBlank
 *   question={question}
 *   blankIndex={0}
 *   value={formValues}
 *   onChange={handleChange}
 *   showFeedback={false}
 *   feedback={feedbackState}
 *   clozeInfo={{id: 1, content: "world"}}
 * />
 */

// ============================================================================
// UNIT TEST EXAMPLES
// ============================================================================

/*
 * UNIT TESTS TO IMPLEMENT:
 * 
 * describe('parseClozes', () => {
 *   test('parses single cloze', () => {
 *     const result = parseClozes("Hello {{c1::world}}!");
 *     expect(result.ids).toEqual([1]);
 *     expect(result.parts).toEqual([
 *       "Hello ",
 *       {id: 1, content: "world", fullMatch: "{{c1::world}}", start: 6, end: 19},
 *       "!"
 *     ]);
 *   });
 * 
 *   test('handles multiple clozes with same ID', () => {
 *     const result = parseClozes("{{c1::A}} and {{c1::B}}");
 *     expect(result.ids).toEqual([1]);
 *     expect(result.parts).toHaveLength(3);
 *   });
 * 
 *   test('handles empty text', () => {
 *     expect(parseClozes("")).toEqual({ids: [], parts: [""]});
 *     expect(parseClozes(null)).toEqual({ids: [], parts: [""]});
 *   });
 * });
 * 
 * describe('stripMarkers', () => {
 *   test('removes all cloze markers', () => {
 *     expect(stripMarkers("{{c1::hello}} {{c2::world}}")).toBe("hello world");
 *   });
 * 
 *   test('handles text without markers', () => {
 *     expect(stripMarkers("plain text")).toBe("plain text");
 *   });
 * 
 *   test('handles LaTeX inside clozes', () => {
 *     expect(stripMarkers("{{c1::$x=2$}}")).toBe("$x=2$");
 *   });
 * });
 * 
 * describe('replaceWithBlanks', () => {
 *   test('replaces all clozes with blanks', () => {
 *     expect(replaceWithBlanks("{{c1::A}} {{c2::B}}")).toBe("_____ _____");
 *   });
 * 
 *   test('replaces only target cloze ID', () => {
 *     expect(replaceWithBlanks("{{c1::A}} {{c2::B}}", 1)).toBe("_____ {{c2::B}}");
 *   });
 * });
 * 
 * describe('renderWithInputs', () => {
 *   test('renders mixed text and inputs', () => {
 *     const { parts } = parseClozes("Hello {{c1::world}}");
 *     const result = renderWithInputs(parts, {
 *       renderBlank: (idx, info) => `<input-${idx}>`,
 *       renderText: (text) => text
 *     });
 *     expect(result).toEqual(["Hello ", "<input-0>"]);
 *   });
 * });
 * 
 * describe('extractClozeBlanksByGroup', () => {
 *   test('extracts unique blanks per cloze ID', () => {
 *     expect(extractClozeBlanksByGroup("{{c1::A}} {{c2::B}} {{c1::A}}")).toEqual(["A", "B"]);
 *   });
 * });
 */
