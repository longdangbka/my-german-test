/**
 * True/False Question Type Implementation
 */

import React from 'react';
import { BaseQuestionType, createFieldName, createFeedback } from './BaseQuestionType.js';
import { ContentRenderer } from '../components/ContentRenderer.jsx';
import { compareAnswers } from '../../../shared/utils/index.js';
import { FEEDBACK_STATES } from '../../../shared/constants/index.js';

export class TrueFalseQuestionType extends BaseQuestionType {
  static initAnswers(question) {
    return {
      [question.id]: ''
    };
  }

  static initFeedback(question) {
    return {
      [question.id]: ''
    };
  }

  static isCompletelyAnswered(question, answers) {
    const answer = answers[question.id];
    return answer && answer.trim() !== '';
  }

  static checkAnswers(question, answers) {
    const userAnswer = answers[question.id] || '';
    const correctAnswer = question.answer || '';
    const isCorrect = compareAnswers(userAnswer, correctAnswer);
    
    return {
      [question.id]: createFeedback(isCorrect, correctAnswer)
    };
  }

  static getCorrectAnswers(question) {
    return {
      [question.id]: question.answer || ''
    };
  }

  static Renderer({ q: question, value, feedback, onChange, showFeedback, seq }) {
    const currentValue = value[question.id] || '';
    const currentFeedback = feedback[question.id];
    const isCorrect = showFeedback && currentFeedback === FEEDBACK_STATES.CORRECT;
    const isIncorrect = showFeedback && currentFeedback === FEEDBACK_STATES.INCORRECT;

    return (
      <div className="question-block p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 transition-all duration-200">
        <div className="text-gray-900 dark:text-gray-100 mb-4">
          <ContentRenderer elements={question.orderedElements || []} />
        </div>
        
        <div className="flex items-center gap-4 mb-4">
          <label className="text-gray-700 dark:text-gray-300 font-medium">
            Antwort:
          </label>
          <select 
            name={question.id} 
            value={currentValue} 
            onChange={onChange} 
            className={`answer-input border rounded-lg px-3 py-2 min-w-[120px] focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors ${
              isCorrect 
                ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                : isIncorrect 
                ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
            }`}
          >
            <option value="">-- Wählen Sie --</option>
            <option value="R">Richtig</option>
            <option value="F">Falsch</option>
          </select>
          
          {showFeedback && (isCorrect || isIncorrect) && (
            <span className="ml-2">
              {isCorrect ? (
                <span className="text-green-600 dark:text-green-400 font-medium">✅ Richtig</span>
              ) : (
                <span className="text-red-600 dark:text-red-400 font-medium">❌ Falsch</span>
              )}
            </span>
          )}
        </div>

        {showFeedback && question.explanation && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 text-sm">
            <strong className="text-blue-800 dark:text-blue-200">💡 Erklärung:</strong>
            <div className="mt-2 text-blue-700 dark:text-blue-300">
              <ContentRenderer elements={question.explanationOrderedElements || []} />
            </div>
          </div>
        )}
      </div>
    );
  }
}

// Export functions for backward compatibility
export const initAnswers = TrueFalseQuestionType.initAnswers.bind(TrueFalseQuestionType);
export const initFeedback = TrueFalseQuestionType.initFeedback.bind(TrueFalseQuestionType);
export const Renderer = TrueFalseQuestionType.Renderer.bind(TrueFalseQuestionType);

export default TrueFalseQuestionType;
