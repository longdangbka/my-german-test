import React from 'react';
import { getDisplayId } from '../../shared/utils/questionIdManager';

/**
 * Component to display a question's unique ID in a small, unobtrusive way
 */
const QuestionIdDisplay = ({ questionId, className = '' }) => {
  if (!questionId) return null;
  
  const displayId = getDisplayId(questionId);
  
  return (
    <div className={`question-id-display text-xs text-gray-500 dark:text-gray-400 font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md inline-block ${className}`}>
      ID: {displayId}
    </div>
  );
};

export default QuestionIdDisplay;
