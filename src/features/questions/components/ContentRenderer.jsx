/**
 * Content renderer for question content with mixed media support
 */

import React from 'react';
import { LatexRenderer, CodeRenderer } from '../../../shared/components/index.js';
import TableRenderer from './TableRenderer.jsx';
import { PATHS } from '../../../shared/constants/index.js';

/**
 * Renders ordered content elements (text, images, code, LaTeX, tables)
 * @param {Object} props - Component props
 * @param {Array} props.elements - Array of content elements to render
 * @param {Object} props.question - Question object (for interactive elements)
 * @param {Object} props.value - Current form values
 * @param {Function} props.onChange - Change handler
 * @param {boolean} props.showFeedback - Whether to show feedback
 * @param {Object} props.feedback - Feedback object
 */
export function ContentRenderer({ 
  elements = [], 
  question = null, 
  value = {}, 
  onChange = null, 
  showFeedback = false, 
  feedback = {} 
}) {
  if (!elements || elements.length === 0) return null;

  return (
    <div className="content-renderer">
      {elements.map((element, index) => {
        const key = `element-${index}`;
        
        try {
          switch (element.type) {
            case 'text':
              return (
                <div key={key} className="text-content my-2" style={{ whiteSpace: 'pre-wrap' }}>
                  <TextWithInlineLatex text={element.content || ''} />
                </div>
              );
            
            case 'image':
              return (
                <div key={key} className="image-content my-3">
                  <img
                    src={`${PATHS.VAULT}/${element.content || ''}`}
                    alt="Content visual"
                    className="max-w-full h-auto rounded-lg shadow-sm"
                    loading="lazy"
                  />
                </div>
              );
            
            case 'codeBlock':
              return (
                <div key={key} className="code-content my-3">
                  <CodeRenderer 
                    code={element.content?.code || ''} 
                    language={element.content?.lang || ''} 
                  />
                </div>
              );
            
            case 'table':
              return (
                <div key={key} className="table-content my-3">
                  <TableRenderer 
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
                <div key={key} className="latex-content my-2">
                  <LatexRenderer 
                    latex={element.content?.latex || ''} 
                    type={element.content?.latexType || 'inline'} 
                  />
                </div>
              );
            
            default:
              console.warn(`Unknown content element type: ${element.type}`);
              return null;
          }
        } catch (error) {
          console.error(`Error rendering content element ${element.type}:`, error);
          return (
            <div key={key} className="error-content my-2 p-2 bg-red-50 border border-red-200 rounded text-red-700">
              Error rendering {element.type} content
            </div>
          );
        }
      })}
    </div>
  );
}

/**
 * Render text with inline LaTeX processing
 * @param {Object} props - Component props
 * @param {string} props.text - Text content with potential inline LaTeX
 */
function TextWithInlineLatex({ text }) {
  if (!text) return null;

  // Simple inline LaTeX processing
  const parts = [];
  let remaining = text;
  let key = 0;
  
  // Process inline math $...$
  const inlineMathRegex = /\$([^$\n]+?)\$/g;
  remaining = remaining.replace(inlineMathRegex, (match, latex) => {
    const placeholder = `__INLINE_MATH_${key}__`;
    parts.push({ type: 'inline', content: latex.trim(), placeholder });
    key++;
    return placeholder;
  });
  
  // Split the text by placeholders and reconstruct with React elements
  let textParts = [remaining];
  
  parts.forEach(({ placeholder, type, content: latexContent }) => {
    const newParts = [];
    textParts.forEach(part => {
      if (typeof part === 'string' && part.includes(placeholder)) {
        const splitParts = part.split(placeholder);
        newParts.push(splitParts[0]);
        newParts.push(<LatexRenderer key={`inline-${key}`} latex={latexContent} type={type} />);
        newParts.push(splitParts[1]);
      } else {
        newParts.push(part);
      }
    });
    textParts = newParts;
  });
  
  // Filter out empty strings and return the result
  const filteredParts = textParts.filter(part => part !== '');
  
  return (
    <>
      {filteredParts.map((part, idx) => (
        <React.Fragment key={idx}>{part}</React.Fragment>
      ))}
    </>
  );
}

export default ContentRenderer;
