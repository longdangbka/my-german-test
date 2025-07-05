/**
 * Validation utilities
 */

/**
 * Check if a value is empty or only whitespace
 * @param {any} value - Value to check
 * @returns {boolean} True if empty
 */
export function isEmpty(value) {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * Check if all required fields in an object are filled
 * @param {Object} obj - Object to validate
 * @param {Array<string>} requiredFields - Array of required field names
 * @returns {boolean} True if all fields are filled
 */
export function areFieldsFilled(obj, requiredFields) {
  if (!obj || !Array.isArray(requiredFields)) return false;
  
  return requiredFields.every(field => !isEmpty(obj[field]));
}

/**
 * Validate answer format for different question types
 * @param {string} type - Question type
 * @param {any} answer - Answer to validate
 * @returns {boolean} True if valid
 */
export function isValidAnswer(type, answer) {
  switch (type) {
    case 'T-F':
      return ['R', 'F', 'true', 'false'].includes(answer);
    case 'CLOZE':
      return typeof answer === 'string' && answer.trim().length > 0;
    case 'MC':
      return typeof answer === 'string' && answer.length > 0;
    default:
      return !isEmpty(answer);
  }
}

export default {
  isEmpty,
  areFieldsFilled,
  isValidAnswer,
};
