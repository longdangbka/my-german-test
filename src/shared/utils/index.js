/**
 * Shared utility functions index
 */

export { default as textUtils } from './textUtils.js';
export { default as validationUtils } from './validationUtils.js';

// Re-export commonly used functions for convenience
export {
  decodeHtmlEntities,
  normalizeText,
  compareAnswers,
  createUniqueKey,
  extractMatches,
} from './textUtils.js';

export {
  isEmpty,
  areFieldsFilled,
  isValidAnswer,
} from './validationUtils.js';
