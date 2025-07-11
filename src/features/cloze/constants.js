/**
 * Cloze processing constants and pre-compiled regex patterns
 * Centralized location for all cloze-related patterns to avoid re-compilation
 */

// Pre-compiled regex patterns for better performance
export const CLOZE_PATTERNS = {
  // Standard Anki cloze patterns
  ANKI_CLOZE: /\{\{c(\d+)::([^}]+)\}\}/g,
  
  // Custom cloze patterns
  DOUBLE_EQUALS: /==([^=]+)==/g,
  SIMPLE_BRACES: /\{\{([^}]+)\}\}/g,
  
  // ID-aware blanks (processed cloze markers)
  ID_AWARE_BLANKS: /__CLOZE_(\d+)__/g,
  
  // Simple blank placeholders
  BLANK_PLACEHOLDERS: /_____/g,
  
  // LaTeX patterns
  DISPLAY_MATH: /\$\$([\s\S]+?)\$\$/g,
  INLINE_MATH: /\$([^$\n]+?)\$/g
};

// Cloze marker types for consistent detection
export const CLOZE_MARKER_TYPES = {
  ANKI: 'anki',
  DOUBLE_EQUALS: 'double_equals', 
  SIMPLE_BRACES: 'simple_braces',
  ID_AWARE: 'id_aware',
  BLANK: 'blank'
};

// Constants for rendering
export const CLOZE_CONSTANTS = {
  BLANK_PLACEHOLDER: '_____',
  DEFAULT_INPUT_WIDTH: 'w-24',
  FEEDBACK_CORRECT_ICON: '✅',
  FEEDBACK_INCORRECT_ICON: '❌'
};

/**
 * Check if content contains any cloze markers
 * @param {string} content - Content to check
 * @returns {boolean} True if cloze markers found
 */
export function hasClozeMarkers(content) {
  if (!content || typeof content !== 'string') return false;
  
  return CLOZE_PATTERNS.ANKI.test(content) ||
         CLOZE_PATTERNS.DOUBLE_EQUALS.test(content) ||
         CLOZE_PATTERNS.SIMPLE_BRACES.test(content) ||
         CLOZE_PATTERNS.ID_AWARE_BLANKS.test(content) ||
         CLOZE_PATTERNS.BLANK_PLACEHOLDERS.test(content);
}

/**
 * Detect the type of cloze markers in content
 * @param {string} content - Content to analyze
 * @returns {string[]} Array of detected marker types
 */
export function detectClozeMarkerTypes(content) {
  if (!content || typeof content !== 'string') return [];
  
  const types = [];
  
  if (CLOZE_PATTERNS.ID_AWARE_BLANKS.test(content)) {
    types.push(CLOZE_MARKER_TYPES.ID_AWARE);
  }
  if (CLOZE_PATTERNS.BLANK_PLACEHOLDERS.test(content)) {
    types.push(CLOZE_MARKER_TYPES.BLANK);
  }
  if (CLOZE_PATTERNS.ANKI_CLOZE.test(content)) {
    types.push(CLOZE_MARKER_TYPES.ANKI);
  }
  if (CLOZE_PATTERNS.DOUBLE_EQUALS.test(content)) {
    types.push(CLOZE_MARKER_TYPES.DOUBLE_EQUALS);
  }
  if (CLOZE_PATTERNS.SIMPLE_BRACES.test(content)) {
    types.push(CLOZE_MARKER_TYPES.SIMPLE_BRACES);
  }
  
  return types;
}
