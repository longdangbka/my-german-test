/**
 * Cloze deletion processing utilities
 * Handles cloze numbering and LaTeX processing within cloze content
 */

import { convertLatexForAnki } from './convert.js';
import { REGEX_PATTERNS, DEBUG_CONFIG } from './config.js';

/**
 * Check if text contains cloze deletions
 * @param {string} text - Text to check
 * @returns {boolean} - Whether text contains cloze deletions
 */
export function hasClozes(text) {
  if (!text) return false;
  // Use the pre-compiled regex pattern
  return REGEX_PATTERNS.CLOZE(text);
}

/**
 * Check if a question object contains cloze deletions
 * @param {object} question - Question object
 * @returns {boolean} - Whether question contains cloze deletions
 */
export function questionHasClozes(question) {
  const textToCheck = question.rawText || question.text || '';
  const explanationToCheck = question.rawExplanation || question.explanation || '';
  
  return hasClozes(textToCheck) || hasClozes(explanationToCheck);
}

/**
 * Process LaTeX within cloze content
 * @param {string} content - Content that may contain LaTeX
 * @returns {string} - Content with LaTeX converted for Anki
 */
function processLatexInContent(content) {
  if (!content) return content;
  
  return content
    // Display math: $$...$$
    .replace(/\$\$([\s\S]*?)\$\$/g, (match, latex) => convertLatexForAnki(latex.trim(), true))
    // Inline math: $...$
    .replace(/\$([^$\n]+)\$/g, (match, latex) => convertLatexForAnki(latex.trim(), false));
}

/**
 * Fix cloze numbering in text and handle LaTeX within cloze fields
 * Convert {{c1:[content]}} to {{c1::content}}, {{c2::content}}, etc.
 * @param {string} text - Text containing cloze deletions
 * @returns {string} - Text with sequential cloze numbering and processed LaTeX
 */
export function fixClozeNumbering(text) {
  if (!text) return '';
  
  if (DEBUG_CONFIG.ENABLED) {
    console.log(`${DEBUG_CONFIG.PREFIX} - Fixing cloze numbering in:`, text);
  }
  
  let counter = 1;
  
  // Handle new syntax {{c1:[content]}} and convert to proper Anki format
  let result = text.replace(/\{\{c(\d*)?:\[([^\]]+)\]\}\}/g, (match, number, content) => {
    const processedContent = processLatexInContent(content);
    const clozeNumber = number || counter++;
    return `{{c${clozeNumber}::${processedContent}}}`;
  });
  
  // Renumber any existing numbered clozes to ensure sequential numbering
  const allClozes = result.match(/\{\{c\d+::[^}]+\}\}/g) || [];
  if (allClozes.length > 0) {
    // Reset counter and renumber all clozes sequentially
    counter = 1;
    result = result.replace(/\{\{c\d+::([^}]+)\}\}/g, (match, content) => {
      const processedContent = processLatexInContent(content);
      return `{{c${counter++}::${processedContent}}}`;
    });
  }
  
  if (DEBUG_CONFIG.ENABLED) {
    console.log(`${DEBUG_CONFIG.PREFIX} - Fixed cloze numbering result:`, result);
  }
  
  return result;
}
