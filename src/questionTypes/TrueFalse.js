import React from 'react';
import '../answer-contrast.css';
import VaultImage from '../components/VaultImage.jsx';
import CodeBlock from './CodeBlock';
import LatexBlock from './LatexBlock';
import TableWithLatex from './TableWithLatex';

export function initAnswers(q) {
  return { [q.id]: '' };
}
export function initFeedback(q) {
  return { [q.id]: '' };
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

export function Renderer({ q, value, feedback, onChange, showFeedback, seq }) {
  return (
    <div className="question-block p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 transition-all duration-200">
      <div className="flex items-center space-x-4">
        <div className="flex-1 text-gray-900 dark:text-gray-100">
          {/* Render content in original order */}
          {renderOrderedElements(q.orderedElements || [])}
          {/* Fallback to old approach if orderedElements not available */}
          {(!q.orderedElements || q.orderedElements.length === 0) && (
            <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>
              {renderWithInlineLatex(q.text)}
            </div>
          )}
        </div>
        <select name={q.id} value={value} onChange={onChange} className="answer-input border rounded-lg px-3 py-2 min-w-[120px]">
          <option value="">– Select –</option>
          <option value="R">✓ Richtig</option>
          <option value="F">✗ Falsch</option>
        </select>
        {showFeedback && (
          <span className={feedback === 'correct' ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}>
            {feedback === 'correct' ? '✅' : '❌'}
          </span>
        )}
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
          {renderOrderedElements(q.explanationOrderedElements || [])}
          {/* Fallback to old explanation format if orderedElements not available */}
          {(!q.explanationOrderedElements || q.explanationOrderedElements.length === 0) && (
            <>
              <div
                className="explanation mt-2 text-gray-700 dark:text-gray-300"
                style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}
              >
                {renderWithInlineLatex(q.explanation)}
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
              {q.explanationLatexBlocks && q.explanationLatexBlocks.length > 0 && (
                <div className="my-2">
                  {q.explanationLatexBlocks.map((lb, idx) => (
                    <LatexBlock key={idx} latex={lb.latex} type={lb.type} />
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
    </div>
  );
}