/**
 * Application-wide constants
 */

// Question types
export const QUESTION_TYPES = {
  TRUE_FALSE: 'T-F',
  CLOZE: 'CLOZE',
  MULTIPLE_CHOICE: 'MC', // Future extension
  SHORT_ANSWER: 'SA',    // Future extension
};

// Theme constants
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
};

// Feedback states
export const FEEDBACK_STATES = {
  CORRECT: 'correct',
  INCORRECT: 'incorrect',
  UNANSWERED: 'unanswered',
};

// File paths
export const PATHS = {
  VAULT: '/vault',
  AUDIOS: '/audios',
};

// Regex patterns
export const PATTERNS = {
  CLOZE_MARKER_NEW: /\{\{c::([^}]+)\}\}/g,   // New cloze syntax
  CLOZE_MARKER_LEGACY: /\{\{([^}]+)\}\}/g,   // Legacy cloze syntax
  LATEX_INLINE: /\$([^$\n]+?)\$/g,
  LATEX_DISPLAY: /\$\$([\s\S]+?)\$\$/g,
  IMAGE_LINK: /!\[\[([^\]]+)\]\]/g,
  CODE_BLOCK: /```(\w+)?\n([\s\S]*?)```/g,
};

/**
 * Parse cloze markers with support for both syntaxes:
 * - New syntax: {{c::[content]}} (avoids conflicts with LaTeX)
 * - Legacy syntax: {{[content]}} (for backward compatibility)
 * @param {string} text - Text to parse
 * @returns {Array} Array of {match, content, start, end} objects
 */
export function parseClozeMarkers(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }
  
  const markers = [];
  let i = 0;
  
  while (i < text.length) {
    // Look for cloze patterns: {{c:: or {{
    if (text[i] === '{' && text[i + 1] === '{') {
      
      const start = i;
      let isNewSyntax = false;
      let skipChars = 2; // Default for legacy {{
      
      // Check if it's the new syntax {{c::
      if (text[i + 2] === 'c' && text[i + 3] === ':' && text[i + 4] === ':') {
        isNewSyntax = true;
        skipChars = 5; // Skip {{c::
      }
      
      i += skipChars;
      let content = '';
      let braceCount = 1; // We've seen one opening {{
      
      while (i < text.length && braceCount > 0) {
        const char = text[i];
        
        if (char === '}' && text[i + 1] === '}') {
          // End of cloze marker
          braceCount--;
          if (braceCount === 0) {
            i += 2; // Skip closing }}
            break;
          } else {
            content += char;
            i++;
          }
        } else {
          content += char;
          i++;
        }
      }
      
      if (braceCount === 0) {
        // Only accept valid cloze markers with non-empty content
        if (content.trim()) {
          const matchText = isNewSyntax ? `{{c::${content}}}` : `{{${content}}}`;
          markers.push({
            match: matchText,
            content: content,
            start: start,
            end: i
          });
        }
      } else {
        // Unmatched braces, treat as regular text
        i = start + 1;
      }
    } else {
      i++;
    }
  }
  
  return markers;
}

export default {
  QUESTION_TYPES,
  THEMES,
  FEEDBACK_STATES,
  PATHS,
  PATTERNS,
};
