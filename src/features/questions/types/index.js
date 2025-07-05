/**
 * Question types module exports
 * Provides all available question type implementations
 */

import BaseQuestionType from './BaseQuestionType.js';
import TrueFalseQuestionType from './TrueFalseQuestionType.js';
import ClozeQuestionType from './ClozeQuestionType.js';

// Question type registry for easy access
export const QUESTION_TYPES = {
  'true-false': TrueFalseQuestionType,
  'cloze': ClozeQuestionType,
  // Add more question types here as they are implemented
};

/**
 * Factory function to create a question type instance
 * @param {string} type - Question type identifier
 * @returns {BaseQuestionType|null} Question type instance or null if not found
 */
export function createQuestionType(type) {
  const QuestionTypeClass = QUESTION_TYPES[type];
  if (QuestionTypeClass) {
    return new QuestionTypeClass();
  }
  console.warn(`Unknown question type: ${type}`);
  return null;
}

/**
 * Get all available question type identifiers
 * @returns {Array<string>} Array of question type identifiers
 */
export function getAvailableQuestionTypes() {
  return Object.keys(QUESTION_TYPES);
}

/**
 * Check if a question type is supported
 * @param {string} type - Question type identifier
 * @returns {boolean} True if supported, false otherwise
 */
export function isQuestionTypeSupported(type) {
  return type in QUESTION_TYPES;
}

// Named exports for individual classes
export {
  BaseQuestionType,
  TrueFalseQuestionType,
  ClozeQuestionType,
};

// Default export for the factory function
export default createQuestionType;
