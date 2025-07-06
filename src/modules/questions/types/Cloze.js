import React from 'react';
import '../../../assets/styles/answer-contrast.css';
import VaultImage from '../../../shared/components/VaultImage.jsx';
import BookmarkButton from '../../bookmarks/BookmarkButton.jsx';
import CodeBlock from '../components/CodeBlock';
import TableWithLatex from '../components/TableWithLatex';
import { renderSimpleLatex } from '../../../shared/utils/simpleLatexRenderer';

export function initAnswers(q) {
  const out = {};
  q.blanks.forEach((_, bi) => {
    out[`${q.id}_${bi+1}`] = '';
  });
  return out;
}
export function initFeedback(q) {
  const out = {};
  q.blanks.forEach((_, bi) => {
    out[`${q.id}_${bi+1}`] = '';
  });
  return out;
}
export function Renderer({ q, value, feedback, onChange, showFeedback, seq, quizName }) {
  console.log('🔍 CLOZE RENDERER - Question object:', q);
  console.log('🔍 CLOZE RENDERER - Question type:', q.type);
  console.log('🔍 CLOZE RENDERER - Question blanks:', q.blanks);
  console.log('🔍 CLOZE RENDERER - Question orderedElements:', q.orderedElements);
  
  // Add visual debugging for development
  const isDebug = window.location.search.includes('debug');
  
  // In debug mode, show detailed information
  if (isDebug) {
    return (
      <div className="question-block p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 transition-all duration-200">
        <div className="debug-info bg-yellow-100 p-4 mb-4 text-sm border-l-4 border-yellow-500">
          <h4 className="font-bold text-lg mb-2">🔍 DEBUG INFO - CLOZE Question</h4>
          <div className="space-y-2">
            <div><strong>ID:</strong> {q.id}</div>
            <div><strong>Type:</strong> {q.type}</div>
            <div><strong>Has Blanks:</strong> {q.blanks ? `Yes (${q.blanks.length})` : 'No'}</div>
            <div><strong>Blanks:</strong> <pre className="bg-gray-100 p-2 mt-1 text-xs">{JSON.stringify(q.blanks, null, 2)}</pre></div>
            <div><strong>Elements Count:</strong> {q.orderedElements?.length || 0}</div>
            <div><strong>First Element:</strong> <pre className="bg-gray-100 p-2 mt-1 text-xs">{JSON.stringify(q.orderedElements?.[0], null, 2)}</pre></div>
            <div><strong>Text Property:</strong> <pre className="bg-gray-100 p-2 mt-1 text-xs">{q.text}</pre></div>
          </div>
        </div>
        
        {/* Show the actual rendered content */}
        <div className="border-t pt-4">
          <h5 className="font-bold mb-2">Rendered Content:</h5>
          {(!q.blanks || q.blanks.length === 0) ? (
            <div>
              <p className="text-red-600 mb-2">⚠️ No blanks - rendering as read-only</p>
              {renderOrderedElements(q.orderedElements || [])}
            </div>
          ) : (
            <div>
              <p className="text-green-600 mb-2">✅ Has blanks - rendering with inputs</p>
              {renderOrderedElementsWithCloze(q.orderedElements || [], q, value, onChange, showFeedback, feedback)}
            </div>
          )}
        </div>
      </div>
    );
  }
  
  // Use the new ordered elements approach for questions without blanks
  if (!q.blanks || q.blanks.length === 0) {
    return (
      <div className="question-block p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 transition-all duration-200">
        {isDebug && (
          <div className="debug-info bg-yellow-100 p-2 mb-4 text-xs">
            <strong>DEBUG - No blanks found:</strong><br/>
            Type: {q.type}<br/>
            Blanks: {JSON.stringify(q.blanks)}<br/>
            Elements: {q.orderedElements?.length || 0}
          </div>
        )}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {renderOrderedElements(q.orderedElements || [])}
            {showFeedback && q.explanation && (
              <div className="mt-2 text-sm text-gray-600">
                <strong>Erklärung:</strong>
                {renderOrderedElements(q.explanationOrderedElements || [])}
              </div>
            )}
          </div>
          <BookmarkButton 
            question={q} 
            quizName={quizName} 
            questionIndex={seq} 
          />
        </div>
      </div>
    );
  }
  
  // For cloze questions with blanks, render all content in order
  return (
    <div className="question-block p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 transition-all duration-200">
      {isDebug && (
        <div className="debug-info bg-yellow-100 p-2 mb-4 text-xs">
          <strong>DEBUG - CLOZE with blanks:</strong><br/>
          Type: {q.type}<br/>
          Blanks: {JSON.stringify(q.blanks)}<br/>
          Elements: {q.orderedElements?.length || 0}<br/>
          First element: {JSON.stringify(q.orderedElements?.[0])}
        </div>
      )}
      <div className="flex items-start justify-between">
        <div className="flex-1 text-gray-900 dark:text-gray-100">
          {/* Render all content elements in original order */}
          {renderOrderedElementsWithCloze(q.orderedElements || [], q, value, onChange, showFeedback, feedback)}
        </div>
        <BookmarkButton 
          question={q} 
          quizName={quizName} 
          questionIndex={seq} 
        />
      </div>
      
      {showFeedback && q.explanation && (
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 text-sm">
          <strong className="text-blue-800 dark:text-blue-200">💡 Erklärung:</strong>
          {renderOrderedElements(q.explanationOrderedElements || [])}
        </div>
      )}
    </div>
  );
}

// Function to render elements in their original order, with special handling for cloze text
function renderOrderedElementsWithCloze(elements, question, value, onChange, showFeedback, feedback) {
  if (!elements || elements.length === 0) return null;
  
  const result = [];
  let currentInlineGroup = [];
  let globalBlankIndex = 0; // Track current blank index across all text elements
  
  // Helper function to flush the current inline group with cloze handling
  const flushInlineGroup = () => {
    if (currentInlineGroup.length > 0) {
      // Combine all text content in the group and render as one unit with cloze handling
      const combinedTextParts = [];
      let currentBlankIndex = globalBlankIndex;
      
      currentInlineGroup.forEach((el, index) => {
        const content = el.type === 'text' ? el.content || '' : '';
        
        // Add space before element if needed (same logic as other question types)
        let processedContent = content;
        if (index > 0 && content.trim()) {
          const prevElement = currentInlineGroup[index - 1];
          const prevContent = prevElement.type === 'text' ? prevElement.content || '' : '';
          
          if (prevContent.trim() && 
              !prevContent.match(/\s$/) && 
              !content.match(/^[\s.,;:!?]/) &&
              !prevContent.match(/[-=]$/) &&
              !content.match(/^[-=]/)) {
            processedContent = ' ' + content;
          }
        }
        
        combinedTextParts.push(processedContent);
      });
      
      const combinedText = combinedTextParts.join('');
      
      if (combinedText.trim()) {
        // Handle text with cloze markers
        const parts = combinedText.split('_____');
        
        result.push(
          <div
            key={`inline-group-${result.length}`}
            style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}
            className="my-2 text-content"
          >
            {parts.map((seg, i) => (
              <React.Fragment key={`group-${result.length}-part-${i}`}>
                {renderSimpleLatex(seg)}
                {i < parts.length - 1 && currentBlankIndex < question.blanks.length && (
                  <>
                    {showFeedback ? (
                      // When showing feedback, display user input (if any) and expected answer
                      <span className="inline-flex items-center gap-2 mx-2">
                        {/* Show what the user typed (if anything) with colored background */}
                        {value[`${question.id}_${currentBlankIndex + 1}`] ? (
                          <>
                            <span className={`inline-block px-3 py-1 border rounded text-sm font-medium ${
                              feedback[`${question.id}_${currentBlankIndex + 1}`] === 'correct'
                                ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-600 text-green-800 dark:text-green-200'
                                : 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-600 text-red-800 dark:text-red-200'
                            }`}>
                              {renderSimpleLatex(value[`${question.id}_${currentBlankIndex + 1}`])}
                            </span>
                            {/* Show correct/incorrect symbol */}
                            <span className={
                              feedback[`${question.id}_${currentBlankIndex + 1}`] === 'correct'
                                ? 'text-green-500 dark:text-green-400'
                                : 'text-red-500 dark:text-red-400'
                            }>
                              {feedback[`${question.id}_${currentBlankIndex + 1}`] === 'correct' ? '✅' : '❌'}
                            </span>
                          </>
                        ) : (
                          // If user left blank, show a placeholder and a cross
                          <>
                            <span className="inline-block px-3 py-1 border rounded text-sm font-medium bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400">
                              (blank)
                            </span>
                            <span className="text-red-500 dark:text-red-400">❌</span>
                          </>
                        )}
                        {/* Show expected answer in gray background */}
                        <span className="inline-block px-3 py-1 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-sm font-medium text-gray-800 dark:text-gray-200">
                          {renderSimpleLatex(question.blanks[currentBlankIndex] || '')}
                        </span>
                      </span>
                    ) : (
                      // When not showing feedback, display the input field
                      <input
                        key={`${question.id}_${currentBlankIndex}_group_${i}`}
                        name={`${question.id}_${currentBlankIndex + 1}`}
                        value={value[`${question.id}_${currentBlankIndex + 1}`] || ''}
                        onChange={onChange}
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck="false"
                        className="answer-input border rounded-lg px-2 py-1 mx-2 w-24 text-center inline-block focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                        data-blank-index={currentBlankIndex}
                      />
                    )}
                    {(() => { currentBlankIndex++; return null; })()}
                  </>
                )}
              </React.Fragment>
            ))}
          </div>
        );
        
        // Update global blank index
        globalBlankIndex = currentBlankIndex;
      }
      currentInlineGroup = [];
    }
  };
  
  elements.forEach((element, index) => {
    try {
      switch (element.type) {
        case 'text':
          // Add text elements to the current inline group
          currentInlineGroup.push(element);
          break;
        
        case 'latex':
          if (element.content?.latexType === 'inline') {
            // Treat inline LaTeX as part of the text flow
            currentInlineGroup.push({
              type: 'text',
              content: `$${element.content?.latex || ''}$`
            });
          } else {
            // Display math breaks the inline group
            flushInlineGroup();
            result.push(
              <div key={`element-${index}`} className="my-2">
                {renderSimpleLatex(`$$${element.content?.latex || ''}$$`)}
              </div>
            );
          }
          break;
        
        case 'image':
          flushInlineGroup();
          result.push(
            <div key={`element-${index}`} className="my-2">
              <VaultImage
                src={element.content || ''}
                alt="content visual"
                style={{ maxWidth: '100%', margin: '8px 0' }}
              />
            </div>
          );
          break;
        
        case 'codeBlock':
          flushInlineGroup();
          result.push(
            <div key={`element-${index}`} className="my-2">
              <CodeBlock 
                code={element.content?.code || ''} 
                lang={element.content?.lang || ''} 
              />
            </div>
          );
          break;
        
        case 'table':
          flushInlineGroup();
          result.push(
            <div key={`element-${index}`} className="my-2">
              <TableWithLatex 
                htmlTable={element.content || ''} 
                question={question}
                value={value}
                onChange={onChange}
                showFeedback={showFeedback}
                feedback={feedback}
              />
            </div>
          );
          break;
        
        case 'latexPlaceholder':
          // For cloze questions, latexPlaceholders should have been converted to latex elements
          // If we still see them here, it indicates a parsing issue
          console.warn('Found unprocessed latexPlaceholder in renderOrderedElementsWithCloze:', element.content);
          break;
        
        default:
          console.warn('Unknown element type:', element.type);
          break;
      }
    } catch (error) {
      console.error('Error rendering element:', element, error);
    }
  });
  
  // Flush any remaining inline group
  flushInlineGroup();
  
  return result;
}

// Function to render elements in their original order
// Function to render elements in their original order with proper inline grouping
function renderOrderedElements(elements) {
  if (!elements || elements.length === 0) return null;
  
  const result = [];
  let currentInlineGroup = [];
  
  // Helper function to flush the current inline group
  const flushInlineGroup = () => {
    if (currentInlineGroup.length > 0) {
      // Combine all text content in the group and render as one unit
      // Preserve spacing between elements by checking if they need separators
      const combinedText = currentInlineGroup
        .map((el, index) => {
          const content = el.type === 'text' ? el.content || '' : '';
          // Add space before element if:
          // 1. It's not the first element
          // 2. The previous element doesn't end with whitespace
          // 3. This element doesn't start with whitespace or punctuation
          if (index > 0 && content.trim()) {
            const prevElement = currentInlineGroup[index - 1];
            const prevContent = prevElement.type === 'text' ? prevElement.content || '' : '';
            
            if (prevContent.trim() && 
                !prevContent.match(/\s$/) && 
                !content.match(/^[\s.,;:!?]/) &&
                !prevContent.match(/[-=]$/) &&
                !content.match(/^[-=]/)) {
              return ' ' + content;
            }
          }
          return content;
        })
        .join('');
      
      if (combinedText.trim()) {
        result.push(
          <div
            key={`inline-group-${result.length}`}
            style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}
            className="my-2 text-content"
          >
            {renderSimpleLatex(combinedText)}
          </div>
        );
      }
      currentInlineGroup = [];
    }
  };
  
  elements.forEach((element, index) => {
    try {
      switch (element.type) {
        case 'text':
          // Add text elements to the current inline group
          currentInlineGroup.push(element);
          break;
        
        case 'latex':
          if (element.content?.latexType === 'inline') {
            // Treat inline LaTeX as part of the text flow
            currentInlineGroup.push({
              type: 'text',
              content: `$${element.content?.latex || ''}$`
            });
          } else {
            // Display math breaks the inline group
            flushInlineGroup();
            result.push(
              <div key={`element-${index}`} className="my-2">
                {renderSimpleLatex(`$$${element.content?.latex || ''}$$`)}
              </div>
            );
          }
          break;
        
        case 'image':
          flushInlineGroup();
          result.push(
            <div key={`element-${index}`} className="my-2">
              <VaultImage
                src={element.content || ''}
                alt="content visual"
                style={{ maxWidth: '100%', margin: '8px 0' }}
              />
            </div>
          );
          break;
        
        case 'codeBlock':
          flushInlineGroup();
          result.push(
            <div key={`element-${index}`} className="my-2">
              <CodeBlock 
                code={element.content?.code || ''} 
                lang={element.content?.lang || ''} 
              />
            </div>
          );
          break;
        
        case 'table':
          flushInlineGroup();
          result.push(
            <div key={`element-${index}`} className="my-2">
              <TableWithLatex htmlTable={element.content || ''} />
            </div>
          );
          break;
        
        case 'latexPlaceholder':
          // LaTeX placeholders should be processed by the text rendering or converted to latex elements
          console.warn('Found unprocessed latexPlaceholder in renderOrderedElements:', element.content);
          break;
        
        default:
          console.warn('Unknown element type:', element.type);
          break;
      }
    } catch (error) {
      console.error('Error rendering element:', element, error);
    }
  });
  
  // Flush any remaining inline group
  flushInlineGroup();
  
  return result;
}
