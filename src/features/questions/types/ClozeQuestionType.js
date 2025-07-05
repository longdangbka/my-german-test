import React from 'react';
import BaseQuestionType from './BaseQuestionType.js';
import ContentRenderer from '../components/ContentRenderer.jsx';
import '../../../answer-contrast.css';

/**
 * Cloze question type implementation
 * Handles fill-in-the-blank style questions with rich content support
 */
class ClozeQuestionType extends BaseQuestionType {
  /**
   * Initialize answers for a cloze question
   * @param {Object} question - The question object
   * @returns {Object} Initial answer state
   */
  initAnswers(question) {
    const answers = {};
    if (question.blanks && Array.isArray(question.blanks)) {
      question.blanks.forEach((_, blankIndex) => {
        answers[`${question.id}_${blankIndex + 1}`] = '';
      });
    }
    return answers;
  }

  /**
   * Initialize feedback for a cloze question
   * @param {Object} question - The question object
   * @returns {Object} Initial feedback state
   */
  initFeedback(question) {
    const feedback = {};
    if (question.blanks && Array.isArray(question.blanks)) {
      question.blanks.forEach((_, blankIndex) => {
        feedback[`${question.id}_${blankIndex + 1}`] = '';
      });
    }
    return feedback;
  }

  /**
   * Render the cloze question component
   * @param {Object} props - Component props
   * @returns {JSX.Element} Rendered component
   */
  render(props) {
    const { question, value, feedback, onChange, showFeedback, seq } = props;

    // If question has no blanks, render as read-only content
    if (!question.blanks || question.blanks.length === 0) {
      return (
        <div className="question-block">
          <ContentRenderer elements={question.orderedElements || []} />
          {showFeedback && question.explanation && (
            <div className="mt-2 text-sm text-gray-600">
              <strong>Erklärung:</strong>
              <ContentRenderer elements={question.explanationOrderedElements || []} />
            </div>
          )}
        </div>
      );
    }

    // Render cloze question with interactive blanks
    return (
      <div className="question-block p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 transition-all duration-200">
        <div className="text-gray-900 dark:text-gray-100">
          {this.renderOrderedElementsWithCloze(
            question.orderedElements || [],
            question,
            value,
            onChange,
            showFeedback,
            feedback
          )}
        </div>
        
        {showFeedback && question.explanation && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 text-sm">
            <strong className="text-blue-800 dark:text-blue-200">💡 Erklärung:</strong>
            <ContentRenderer elements={question.explanationOrderedElements || []} />
          </div>
        )}
      </div>
    );
  }

  /**
   * Render content elements with cloze blanks support
   * @param {Array} elements - Content elements to render
   * @param {Object} question - Question object
   * @param {Object} value - Current answers
   * @param {Function} onChange - Change handler
   * @param {boolean} showFeedback - Whether to show feedback
   * @param {Object} feedback - Feedback state
   * @returns {Array} Rendered elements
   */
  renderOrderedElementsWithCloze(elements, question, value, onChange, showFeedback, feedback) {
    if (!elements || elements.length === 0) return null;
    
    let blankIndex = 0; // Track current blank index across all text elements
    
    return elements.map((element, index) => {
      const key = `element-${index}`;
      
      try {
        switch (element.type) {
          case 'text':
            // Handle text with cloze markers
            const textContent = element.content || '';
            const parts = textContent.split('_____');
            
            return (
              <div
                key={key}
                style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}
                className="my-2"
              >
                {parts.map((segment, segmentIndex) => (
                  <React.Fragment key={`${key}-part-${segmentIndex}`}>
                    <ContentRenderer 
                      elements={[{ type: 'text', content: segment }]} 
                      inline={true}
                    />
                    {segmentIndex < parts.length - 1 && blankIndex < question.blanks.length && (
                      <>
                        {this.renderBlankInput(
                          question,
                          blankIndex,
                          value,
                          onChange,
                          showFeedback,
                          feedback,
                          `${question.id}_${blankIndex}_text_${segmentIndex}`
                        )}
                        {(() => { blankIndex++; return null; })()}
                      </>
                    )}
                  </React.Fragment>
                ))}
              </div>
            );
          
          case 'table':
            // Tables can contain cloze blanks too
            return (
              <div key={key} className="my-2">
                <ContentRenderer 
                  elements={[element]} 
                  question={question}
                  value={value}
                  onChange={onChange}
                  showFeedback={showFeedback}
                  feedback={feedback}
                />
              </div>
            );
          
          default:
            // For other element types, use ContentRenderer
            return (
              <div key={key} className="my-2">
                <ContentRenderer elements={[element]} />
              </div>
            );
        }
      } catch (error) {
        console.error('Error rendering element:', element, error);
        return null;
      }
    }).filter(Boolean);
  }

  /**
   * Render a blank input field
   * @param {Object} question - Question object
   * @param {number} blankIndex - Index of the blank
   * @param {Object} value - Current answers
   * @param {Function} onChange - Change handler
   * @param {boolean} showFeedback - Whether to show feedback
   * @param {Object} feedback - Feedback state
   * @param {string} uniqueKey - Unique key for React
   * @returns {JSX.Element} Input field component
   */
  renderBlankInput(question, blankIndex, value, onChange, showFeedback, feedback, uniqueKey) {
    const fieldName = `${question.id}_${blankIndex + 1}`;
    const inputValue = value[fieldName] || '';
    const feedbackValue = feedback[fieldName];
    const isCorrect = showFeedback && feedbackValue === 'correct';
    const isIncorrect = showFeedback && feedbackValue === 'incorrect';

    return (
      <>
        <input
          key={uniqueKey}
          name={fieldName}
          value={inputValue}
          onChange={onChange}
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
          className={`answer-input border rounded-lg px-2 py-1 mx-2 w-24 text-center inline-block focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 ${
            isCorrect 
              ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
              : isIncorrect 
              ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
              : ''
          }`}
          data-blank-index={blankIndex}
        />
        {showFeedback && (isCorrect || isIncorrect) && (
          <span className={`ml-2 ${isCorrect ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
            {isCorrect ? '✅' : '❌'}
          </span>
        )}
      </>
    );
  }
}

export default ClozeQuestionType;
