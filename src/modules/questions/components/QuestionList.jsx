import React from 'react';
import { questionTypes } from '../types';

export default function QuestionList({ questions, answers, feedback, onChange, showFeedback, seqStart = 1, quizName }) {
  let seq = seqStart;
  return (
    <div className="space-y-4">
      {questions.map(q => {
        const { Renderer } = questionTypes[q.type] || {};
        if (!Renderer) return null;
        return (
          <Renderer
            key={q.id}
            q={q}
            value={q.type === 'CLOZE' ? answers : answers[q.id]}
            feedback={q.type === 'CLOZE' ? feedback : feedback[q.id]}
            onChange={onChange}
            showFeedback={showFeedback}
            seq={seq++}
            quizName={quizName}
          />
        );
      })}
    </div>
  );
}
