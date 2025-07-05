/**
 * Base question type interface and utilities
 */

import { FEEDBACK_STATES } from '../../../shared/constants/index.js';
import { isEmpty } from '../../../shared/utils/index.js';

/**
 * Base question type implementation
 * All question types should implement these methods
 */
export class BaseQuestionType {
  /**
   * Initialize answers for this question type
   * @param {Object} question - Question object
   * @returns {Object} Initial answers object
   */
  static initAnswers(question) {
    throw new Error('initAnswers must be implemented by subclass');
  }

  /**
   * Initialize feedback for this question type
   * @param {Object} question - Question object
   * @returns {Object} Initial feedback object
   */
  static initFeedback(question) {
    throw new Error('initFeedback must be implemented by subclass');
  }

  /**
   * Render the question
   * @param {Object} props - Component props
   * @returns {React.Component} Rendered question component
   */
  static Renderer(props) {
    throw new Error('Renderer must be implemented by subclass');
  }

  /**
   * Check if the question is completely answered
   * @param {Object} question - Question object
   * @param {Object} answers - Current answers
   * @returns {boolean} True if completely answered
   */
  static isCompletelyAnswered(question, answers) {
    const questionAnswers = this.getQuestionAnswers(question, answers);
    return Object.values(questionAnswers).every(answer => !isEmpty(answer));
  }

  /**
   * Get all answers for this specific question
   * @param {Object} question - Question object
   * @param {Object} answers - All answers
   * @returns {Object} Answers for this question only
   */
  static getQuestionAnswers(question, answers) {
    const questionAnswers = {};
    Object.keys(answers).forEach(key => {
      if (key.startsWith(question.id)) {
        questionAnswers[key] = answers[key];
      }
    });
    return questionAnswers;
  }

  /**
   * Check answers for this question type
   * @param {Object} question - Question object
   * @param {Object} answers - User answers
   * @returns {Object} Feedback object
   */
  static checkAnswers(question, answers) {
    throw new Error('checkAnswers must be implemented by subclass');
  }

  /**
   * Provide correct answers for this question type
   * @param {Object} question - Question object
   * @returns {Object} Correct answers object
   */
  static getCorrectAnswers(question) {
    throw new Error('getCorrectAnswers must be implemented by subclass');
  }
}

/**
 * Create a standardized field name for question answers
 * @param {string} questionId - Question ID
 * @param {number|string} fieldIndex - Field index or identifier
 * @returns {string} Standardized field name
 */
export function createFieldName(questionId, fieldIndex = '') {
  return fieldIndex ? `${questionId}_${fieldIndex}` : questionId;
}

/**
 * Create feedback entry
 * @param {boolean} isCorrect - Whether the answer is correct
 * @param {string} correctAnswer - The correct answer (optional)
 * @returns {string} Feedback state
 */
export function createFeedback(isCorrect, correctAnswer = null) {
  return isCorrect ? FEEDBACK_STATES.CORRECT : FEEDBACK_STATES.INCORRECT;
}

export default {
  BaseQuestionType,
  createFieldName,
  createFeedback,
};
