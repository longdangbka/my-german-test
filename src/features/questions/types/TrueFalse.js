import React from 'react';
import '../../../assets/styles/answer-contrast.css';
import VaultImage from '../../../shared/components/VaultImage.jsx';
import BookmarkButton from '../../bookmarks/BookmarkButton.jsx';
import { AnkiButton } from '../../anki/ankiModule';
import CodeBlock from '../components/CodeBlock';
import TableWithLatex from '../components/TableWithLatex';
import QuestionIdDisplay from '../../../shared/components/QuestionIdDisplay.jsx';
import { renderSimpleLatex } from '../../../shared/utils/simpleLatexRenderer';

export function initAnswers(q) {
  return { [q.id]: '' };
}
export function initFeedback(q) {
  return { [q.id]: '' };
}

// Function to render elements in their original order with proper inline grouping
function renderOrderedElements(elements, question) {
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
          // Convert latexPlaceholder back to proper LaTeX element
          // Find the original LaTeX content from the question's latexPlaceholders array
          flushInlineGroup();
          
          const placeholder = element.content || '';
          const latexInfo = question?.latexPlaceholders?.find(lp => lp.placeholder === placeholder);
          
          if (latexInfo) {
            // Render as a separate div to ensure proper line spacing for each LaTeX expression
            result.push(
              <div key={`element-${index}`} className="my-2">
                {renderSimpleLatex(latexInfo.original)}
              </div>
            );
          } else {
            // Fallback if latexPlaceholders info is not available
            result.push(
              <div key={`element-${index}`} className="my-2">
                {renderSimpleLatex(`$${placeholder}$`)}
              </div>
            );
          }
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

export function Renderer({ q, value, feedback, onChange, showFeedback, seq, quizName, groupAudio = null, showAnkiButton = false }) {
  // Extract the actual value for this question
  const questionValue = typeof value === 'object' ? (value?.[q.id] || '') : (value || '');
  const questionFeedback = typeof feedback === 'object' ? feedback?.[q.id] : feedback;
  
  return (
    <div className="question-block p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 transition-all duration-200">
      <div className="flex items-start space-x-4">
        <div className="flex-1 text-gray-900 dark:text-gray-100">
          {/* Render content in original order */}
          {renderOrderedElements(q.orderedElements || [], q)}
          {/* Fallback to old approach if orderedElements not available */}
          {(!q.orderedElements || q.orderedElements.length === 0) && (
            <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>
              {renderSimpleLatex(q.text)}
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <BookmarkButton 
            question={q} 
            quizName={quizName} 
            questionIndex={seq}
            groupAudio={groupAudio}
          />
          {showFeedback ? (
            // When showing feedback, display user selection and expected answer
            <div className="flex items-center space-x-2">
              {/* Show what the user selected (if anything) */}
              {questionValue ? (
                <>
                  <span className={`inline-block px-3 py-1 border rounded text-sm font-medium ${
                    questionFeedback === 'correct'
                      ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-600 text-green-800 dark:text-green-200'
                      : 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-600 text-red-800 dark:text-red-200'
                  }`}>
                    {questionValue === 'R' ? '✓ Richtig' : '✗ Falsch'}
                  </span>
                  {/* Show correct/incorrect symbol */}
                  <span className={questionFeedback === 'correct' ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}>
                    {questionFeedback === 'correct' ? '✅' : '❌'}
                  </span>
                </>
              ) : (
                // If user didn't select anything, show placeholder and cross
                <>
                  <span className="inline-block px-3 py-1 border rounded text-sm font-medium bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400">
                    (not selected)
                  </span>
                  <span className="text-red-500 dark:text-red-400">❌</span>
                </>
              )}
              {/* Show expected answer in gray background */}
              <span className="inline-block px-3 py-1 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-sm font-medium text-gray-800 dark:text-gray-200">
                {q.answer === 'True' ? '✓ Richtig' : '✗ Falsch'}
              </span>
            </div>
          ) : (
            <select name={q.id} value={questionValue} onChange={onChange} className="answer-input border rounded-lg px-3 py-2 min-w-[120px]">
              <option value="">– Select –</option>
              <option value="R">✓ Richtig</option>
              <option value="F">✗ Falsch</option>
            </select>
          )}
        </div>
      </div>
      
      {/* Fallback rendering for old format (images, code blocks, tables separately) */}
      {(!q.orderedElements || q.orderedElements.length === 0) && (
        <>
          {q.images && q.images.length > 0 && (
            <div className="my-2">
              {q.images.map((img, idx) => (
                <VaultImage
                  key={idx}
                  src={img}
                  alt="question visual"
                  style={{ maxWidth: '100%', margin: '8px 0' }}
                />
              ))}
            </div>
          )}
          {q.codeBlocks && q.codeBlocks.length > 0 && (
            <div className="my-2">
              {q.codeBlocks.map((cb, idx) => (
                <CodeBlock key={idx} code={cb.code} lang={cb.lang} />
              ))}
            </div>
          )}
          {q.htmlTables?.map((html, i) => (
            <TableWithLatex key={i} htmlTable={html} />
          ))}
        </>
      )}
      
      {showFeedback && q.explanation && (
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 text-sm">
          <strong className="text-blue-800 dark:text-blue-200">💡 Erklärung:</strong>
          {renderOrderedElements(q.explanationOrderedElements || [], q)}
          {/* Fallback to old explanation format if orderedElements not available */}
          {(!q.explanationOrderedElements || q.explanationOrderedElements.length === 0) && (
            <>
              <div
                className="explanation mt-2 text-gray-700 dark:text-gray-300"
                style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}
              >
                {renderSimpleLatex(q.explanation)}
              </div>
              {q.explanationImages && q.explanationImages.length > 0 && (
                <div className="my-2">
                  {q.explanationImages.map((img, idx) => (
                    <VaultImage
                      key={idx}
                      src={img}
                      alt="explanation visual"
                      style={{ maxWidth: '100%', margin: '8px 0' }}
                    />
                  ))}
                </div>
              )}
              {q.explanationCodeBlocks && q.explanationCodeBlocks.length > 0 && (
                <div className="my-2">
                  {q.explanationCodeBlocks.map((cb, idx) => (
                    <CodeBlock key={idx} code={cb.code} lang={cb.lang} />
                  ))}
                </div>
              )}
              {q.explanationHtmlTables?.map((html, i) => (
                <TableWithLatex key={i} htmlTable={html} />
              ))}
            </>
          )}
        </div>
      )}
      
      {/* Question ID display and Anki button */}
      <div className="mt-2 flex justify-end items-center space-x-2">
        {showAnkiButton && (
          <AnkiButton question={q} compact={true} />
        )}
        <QuestionIdDisplay questionId={q.id} />
      </div>
    </div>
  );
}