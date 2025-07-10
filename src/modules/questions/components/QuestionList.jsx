import React from 'react';
import { questionTypes } from '../types';

export default function QuestionList({ 
  questions, 
  answers, 
  feedback, 
  onChange, 
  showFeedback, 
  seqStart = 1, 
  quizName, 
  showAnkiButton = false,
  individualFeedback = {},
  onShowIndividualAnswer
}) {
  let seq = seqStart;
  return (
    <div className="space-y-4">
      {questions.map(q => {
        const { Renderer } = questionTypes[q.type] || {};
        if (!Renderer) return null;
        
        // Check if this individual question should show feedback
        const shouldShowFeedback = showFeedback || individualFeedback[q.id];
        
        return (
          <div key={q.id} className="relative">
            <Renderer
              q={q}
              value={answers}
              feedback={feedback}
              onChange={onChange}
              showFeedback={shouldShowFeedback}
              seq={seq++}
              quizName={quizName}
              showAnkiButton={showAnkiButton}
            />
            
            {/* Individual "See Answer" button */}
            {onShowIndividualAnswer && !shouldShowFeedback && (
              <div className="mt-2 flex justify-end">
                <button
                  onClick={() => onShowIndividualAnswer(q.id)}
                  className="px-3 py-1 text-sm bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white rounded-md transition-all duration-200 shadow-sm"
                  title="Show correct answer for this question"
                >
                  👁️ See Answer
                </button>
              </div>
            )}
            
            {/* Hide answer button when feedback is showing */}
            {onShowIndividualAnswer && shouldShowFeedback && (
              <div className="mt-2 flex justify-end">
                <button
                  onClick={() => onShowIndividualAnswer(q.id, true)} // true = hide
                  className="px-3 py-1 text-sm bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 text-white rounded-md transition-all duration-200 shadow-sm"
                  title="Hide answer for this question"
                >
                  🙈 Hide Answer
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
