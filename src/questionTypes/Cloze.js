import React from 'react';
import '../answer-contrast.css';
import VaultImage from '../components/VaultImage.jsx';
import BookmarkButton from '../components/BookmarkButton.jsx';
import CodeBlock from './CodeBlock';
import LatexBlock from './LatexBlock';
import TableWithLatex from './TableWithLatex';

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
              {parts.map((seg, i) => (
                <React.Fragment key={`${key}-part-${i}`}>
                  {renderWithInlineLatex(seg)}
                  {i < parts.length - 1 && blankIndex < question.blanks.length && (
                    <>
                      {showFeedback ? (
                        // When showing feedback, display only the answer with check/cross symbol
                        <span className="inline-flex items-center gap-2 mx-2">
                          {/* Show correct/incorrect symbol */}
                          <span className={
                            feedback[`${question.id}_${blankIndex + 1}`] === 'correct'
                              ? 'text-green-500 dark:text-green-400'
                              : 'text-red-500 dark:text-red-400'
                          }>
                            {feedback[`${question.id}_${blankIndex + 1}`] === 'correct' ? '✅' : '❌'}
                          </span>
                          {/* Show correct answer in a styled box */}
                          <span className="inline-block px-3 py-1 bg-green-50 dark:bg-green-900/30 border border-green-300 dark:border-green-600 rounded text-sm font-medium">
                            {renderWithInlineLatex(question.blanks[blankIndex] || '')}
                          </span>
                        </span>
                      ) : (
                        // When not showing feedback, display the input field
                        <input
                          key={`${question.id}_${blankIndex}_text_${i}`}
                          name={`${question.id}_${blankIndex + 1}`}
                          value={value[`${question.id}_${blankIndex + 1}`] || ''}
                          onChange={onChange}
                          autoComplete="off"
                          autoCorrect="off"
                          spellCheck="false"
                          className="answer-input border rounded-lg px-2 py-1 mx-2 w-24 text-center inline-block focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                          data-blank-index={blankIndex}
                        />
                      )}
                      {(() => { blankIndex++; return null; })()}
                    </>
                  )}
                </React.Fragment>
              ))}
            </div>
          );
        
        case 'image':
          return (
            <div key={key} className="my-2">
              <VaultImage
                src={element.content || ''}
                alt="content visual"
                style={{ maxWidth: '100%', margin: '8px 0' }}
              />
            </div>
          );
        
        case 'codeBlock':
          return (
            <div key={key} className="my-2">
              <CodeBlock 
                code={element.content?.code || ''} 
                lang={element.content?.lang || ''} 
              />
            </div>
          );
        
        case 'table':
          return (
            <div key={key} className="my-2">
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
        
        case 'latex':
          return (
            <div key={key} className="my-2">
              <LatexBlock 
                latex={element.content?.latex || ''} 
                type={element.content?.latexType || 'inline'} 
              />
            </div>
          );
        
        case 'latexPlaceholder':
          // For cloze questions, latexPlaceholders should have been converted to latex elements
          // If we still see them here, it indicates a parsing issue
          console.warn('Found unprocessed latexPlaceholder in renderOrderedElementsWithCloze:', element.content);
          return null;
        
        default:
          console.warn('Unknown element type:', element.type);
          return null;
      }
    } catch (error) {
      console.error('Error rendering element:', element, error);
      return null;
    }
  }).filter(Boolean);
}

// Function to render elements in their original order
function renderOrderedElements(elements) {
  if (!elements || elements.length === 0) return null;
  
  return elements.map((element, index) => {
    const key = `element-${index}`;
    
    try {
      switch (element.type) {
        case 'text':
          return (
            <div
              key={key}
              style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}
              className="my-2"
            >
              {renderWithInlineLatex(element.content || '')}
            </div>
          );
        
        case 'image':
          return (
            <div key={key} className="my-2">
              <VaultImage
                src={element.content || ''}
                alt="content visual"
                style={{ maxWidth: '100%', margin: '8px 0' }}
              />
            </div>
          );
        
        case 'codeBlock':
          return (
            <div key={key} className="my-2">
              <CodeBlock 
                code={element.content?.code || ''} 
                lang={element.content?.lang || ''} 
              />
            </div>
          );
        
        case 'table':
          return (
            <div key={key} className="my-2">
              <TableWithLatex htmlTable={element.content || ''} />
            </div>
          );
        
        case 'latex':
          return (
            <div key={key} className="my-2">
              <LatexBlock 
                latex={element.content?.latex || ''} 
                type={element.content?.latexType || 'inline'} 
              />
            </div>
          );
        
        case 'latexPlaceholder':
          // LaTeX placeholders should be processed by the text rendering or converted to latex elements
          console.warn('Found unprocessed latexPlaceholder in renderOrderedElements:', element.content);
          return null;
        
        default:
          console.warn('Unknown element type:', element.type);
          return null;
      }
    } catch (error) {
      console.error('Error rendering element:', element, error);
      return null;
    }
  }).filter(Boolean);
}

// Utility to render both $$…$$ display and $…$ inline LaTeX
function renderWithInlineLatex(text) {
  const parts = [];
  let lastIndex = 0;
  // match either $$…$$ or $…$ or HTML table
  const regex = /(\$\$[\s\S]+?\$\$)|\$(.+?)\$|(<table[\s\S]+?<\/table>)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    // push plain text before this match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const raw = match[0];
    if (raw.startsWith('<table')) {
      // If it's a table, render it as HTML
      parts.push(<span key={match.index} dangerouslySetInnerHTML={{ __html: raw }} />);
    } else if (raw.startsWith('$$')) {
      // strip the $$ delimiters for display math
      const displayContent = raw.slice(2, -2);
      parts.push(
        <LatexBlock key={match.index} latex={displayContent} type="display" />
      );
    } else if (raw.startsWith('$')) {
      // strip the $ delimiters for inline math
      const inlineContent = raw.slice(1, -1);
      parts.push(
        <LatexBlock key={match.index} latex={inlineContent} type="inline" />
      );
    }
    lastIndex = regex.lastIndex;
  }
  // push any remaining trailing text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}
