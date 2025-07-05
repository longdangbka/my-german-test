/**
 * Text processing utilities
 */

/**
 * Decode HTML entities from text
 * @param {string} html - HTML string to decode
 * @returns {string} Decoded text
 */
export function decodeHtmlEntities(html) {
  if (!html) return '';
  
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  return tempDiv.textContent || tempDiv.innerText || html;
}

/**
 * Safely trim and normalize text
 * @param {string} text - Text to normalize
 * @returns {string} Normalized text
 */
export function normalizeText(text) {
  return (text || '').trim();
}

/**
 * Compare two strings for equality (case-insensitive, trimmed)
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {boolean} True if strings are equal
 */
export function compareAnswers(a, b) {
  return normalizeText(a).toLowerCase() === normalizeText(b).toLowerCase();
}

/**
 * Generate a unique key for React components
 * @param {...any} parts - Parts to combine into key
 * @returns {string} Unique key
 */
export function createUniqueKey(...parts) {
  return parts.filter(Boolean).join('_');
}

/**
 * Extract content between delimiters
 * @param {string} text - Source text
 * @param {RegExp} pattern - Pattern to match
 * @returns {Array} Array of matches
 */
export function extractMatches(text, pattern) {
  if (!text || !pattern) return [];
  
  const matches = [];
  let match;
  
  // Reset regex lastIndex to ensure clean matching
  pattern.lastIndex = 0;
  
  while ((match = pattern.exec(text)) !== null) {
    matches.push({
      full: match[0],
      content: match[1] || match[2] || '',
      index: match.index,
    });
    
    // Prevent infinite loops on global regexes
    if (!pattern.global) break;
  }
  
  return matches;
}

export default {
  decodeHtmlEntities,
  normalizeText,
  compareAnswers,
  createUniqueKey,
  extractMatches,
};
