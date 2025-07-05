import React from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

/**
 * TableRenderer component for rendering HTML tables with LaTeX support and optional cloze functionality
 * @param {Object} props - Component props
 * @param {string} props.htmlTable - HTML table string
 * @param {Object} props.question - Question object (for cloze functionality)
 * @param {Object} props.value - Current form values
 * @param {Function} props.onChange - Change handler
 * @param {boolean} props.showFeedback - Whether to show feedback
 * @param {Object} props.feedback - Feedback state
 * @param {number} props.startingBlankIndex - Starting blank index for numbering
 */
export default function TableRenderer({ 
  htmlTable, 
  question = null, 
  value = {}, 
  onChange = null, 
  showFeedback = false, 
  feedback = {}, 
  startingBlankIndex = 0 
}) {
  // Force component to re-mount when question changes to prevent caching issues
  const componentKey = question ? `${question.id}_${question.type}_table` : 'no-question';

  /**
   * Parse HTML table string and extract structured data
   * @returns {Object|null} Parsed table data or null if parsing fails
   */
  const parseTable = () => {
    try {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlTable;
      const table = tempDiv.querySelector('table');
      
      if (!table) return null;
      
      const thead = table.querySelector('thead');
      const tbody = table.querySelector('tbody');
      
      const headers = [];
      const rows = [];
      
      if (thead) {
        const headerRow = thead.querySelector('tr');
        if (headerRow) {
          headerRow.querySelectorAll('th').forEach(th => {
            // Use innerHTML to preserve LaTeX and other markup
            headers.push(th.innerHTML.trim());
          });
        }
      }
      
      if (tbody) {
        tbody.querySelectorAll('tr').forEach(tr => {
          const row = [];
          tr.querySelectorAll('td').forEach(td => {
            // Use innerHTML to preserve LaTeX and other markup
            row.push(td.innerHTML.trim());
          });
          rows.push(row);
        });
      }
      
      return { headers, rows };
    } catch (error) {
      console.error('Error parsing table:', error);
      return null;
    }
  };

  const tableData = parseTable();
  
  if (!tableData) {
    // Fallback to original HTML if parsing fails
    return <div dangerouslySetInnerHTML={{ __html: htmlTable }} />;
  }

  const { headers, rows } = tableData;

  return (
    <div key={componentKey} className="overflow-auto my-3">
      <table className="border-collapse border border-gray-400 dark:border-gray-600 w-full text-left text-sm">
        {headers.length > 0 && (
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              {headers.map((header, idx) => (
                <th key={idx} className="border border-gray-400 dark:border-gray-600 p-3 font-semibold text-gray-900 dark:text-gray-100">
                  <TableCell 
                    content={header} 
                    question={question}
                    value={value}
                    onChange={onChange}
                    showFeedback={showFeedback}
                    feedback={feedback}
                    startingBlankIndex={startingBlankIndex}
                  />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, rowIdx) => (
            <tr key={rowIdx} className="hover:bg-gray-50 dark:hover:bg-gray-800">
              {row.map((cell, cellIdx) => (
                <td key={cellIdx} className="border border-gray-400 dark:border-gray-600 p-3 text-gray-900 dark:text-gray-100">
                  <TableCell 
                    content={cell} 
                    question={question}
                    value={value}
                    onChange={onChange}
                    showFeedback={showFeedback}
                    feedback={feedback}
                    startingBlankIndex={startingBlankIndex}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Component to render individual table cells with LaTeX support and interactive cloze fields
 */
function TableCell({ 
  content, 
  question = null, 
  value = {}, 
  onChange = null, 
  showFeedback = false, 
  feedback = {}, 
  startingBlankIndex = 0 
}) {
  /**
   * Render text with inline LaTeX and cloze fields
   * @param {string} text - Text to render
   * @returns {JSX.Element|Array} Rendered content
   */
  const renderWithLatexAndCloze = (text) => {
    if (!text) return '';
    
    // Decode HTML entities first to ensure we get proper LaTeX delimiters
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = text;
    const decodedText = tempDiv.textContent || tempDiv.innerText || text;
    
    // Check if this cell contains cloze markers (original {{}} or {} markers)
    const hasClozeMarkers = /\{\{[^}]+\}\}|\{[^}]+\}/.test(decodedText);
    
    // If we have cloze functionality and this cell has markers, render interactive inputs
    if (hasClozeMarkers && question && onChange && question.blanks) {
      return renderCellWithClozeInputs(decodedText, question, value, onChange, showFeedback, feedback);
    }
    
    // Otherwise, render with LaTeX support only
    return renderWithLatex(decodedText);
  };

  /**
   * Render a cell with interactive cloze input fields
   * @param {string} text - Text content
   * @param {Object} question - Question object
   * @param {Object} value - Current values
   * @param {Function} onChange - Change handler
   * @param {boolean} showFeedback - Whether to show feedback
   * @param {Object} feedback - Feedback state
   * @returns {Array} Rendered content parts
   */
  const renderCellWithClozeInputs = (text, question, value, onChange, showFeedback, feedback) => {
    const parts = [];
    let remaining = text;
    
    // Find cloze markers and replace them with input fields
    const clozeRegex = /(\{\{[^}]+\}\}|\{[^}]+\})/g;
    const segments = remaining.split(clozeRegex);
    
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      
      // Check if this segment is a cloze marker
      if (clozeRegex.test(segment)) {
        // Extract the content inside the cloze marker
        const markerContent = segment.replace(/^\{\{?|\}?\}$/g, '');
        
        // Find the corresponding blank index in the question's blanks array
        const blankIndex = question.blanks.findIndex(blank => blank === markerContent);
        
        if (blankIndex !== -1) {
          const fieldName = `${question.id}_${blankIndex + 1}`;
          const inputValue = value[fieldName] || '';
          const feedbackKey = fieldName;
          const isCorrect = showFeedback && feedback[feedbackKey] === 'correct';
          const isIncorrect = showFeedback && feedback[feedbackKey] === 'incorrect';
          
          // Create a unique key that includes question id, blank index, and marker content
          // This prevents React from reusing cached input components
          const uniqueKey = `${question.id}_blank_${blankIndex}_${markerContent}_table`;
          
          parts.push(
            <span key={`${fieldName}-container-${i}`} style={{ display: 'inline-flex', alignItems: 'center' }}>
              <input
                key={uniqueKey}
                name={fieldName}
                type="text"
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
                data-marker-content={markerContent}
              />
              {showFeedback && (isCorrect || isIncorrect) && (
                <span className="ml-1 text-xs">
                  {isCorrect ? '✅' : '❌'}
                </span>
              )}
            </span>
          );
        } else {
          // If no matching blank found, just show the marker as text
          parts.push(<span key={i} className="text-gray-500">{segment}</span>);
        }
      } else if (segment) {
        // This is regular text - render with LaTeX processing
        const renderedText = renderWithLatex(segment);
        if (Array.isArray(renderedText)) {
          parts.push(...renderedText);
        } else {
          parts.push(renderedText);
        }
      }
    }
    
    return parts.filter(part => part !== '');
  };

  /**
   * Render text with inline LaTeX (non-interactive)
   * @param {string} text - Text to render
   * @returns {Array|string} Rendered content
   */
  const renderWithLatex = (text) => {
    if (!text) return '';
    
    // Split by LaTeX patterns and render appropriately
    const parts = [];
    let remaining = text;
    let key = 0;
    
    // Process display math $$...$$ first
    const displayMathRegex = /\$\$([\s\S]+?)\$\$/g;
    remaining = remaining.replace(displayMathRegex, (match, latex) => {
      const placeholder = `__DISPLAY_MATH_${key}__`;
      parts.push({ type: 'display', content: latex.trim(), placeholder });
      key++;
      return placeholder;
    });
    
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
          if (type === 'display') {
            newParts.push(<BlockMath key={`display-${key}`} math={latexContent} />);
          } else {
            newParts.push(<InlineMath key={`inline-${key}`} math={latexContent} />);
          }
          newParts.push(splitParts[1]);
        } else {
          newParts.push(part);
        }
      });
      textParts = newParts;
    });
    
    // Filter out empty strings and return the result
    return textParts.filter(part => part !== '');
  };

  const renderedContent = renderWithLatexAndCloze(content);
  
  return (
    <span style={{ whiteSpace: 'pre-wrap' }}>
      {Array.isArray(renderedContent) ? renderedContent.map((part, idx) => (
        <React.Fragment key={idx}>{part}</React.Fragment>
      )) : renderedContent}
    </span>
  );
}
