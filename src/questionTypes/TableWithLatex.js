import React from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import { parseClozeMarkers } from '../shared/constants/index.js';

export default function TableWithLatex({ htmlTable, question = null, value = {}, onChange = null, showFeedback = false, feedback = {}, startingBlankIndex = 0 }) {
  // Force component to re-mount when question changes to prevent caching issues
  const componentKey = question ? `${question.id}_${question.type}_table` : 'no-question';
  // Parse the table HTML and extract the structure
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
            // use innerHTML so that "$a+2$" isn't collapsed to plain text
            headers.push(th.innerHTML.trim());
          });
        }
      }
      
      if (tbody) {
        tbody.querySelectorAll('tr').forEach(tr => {
          const row = [];
          tr.querySelectorAll('td').forEach(td => {
            // again, innerHTML preserves any $…$ markup
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

// Component to render individual table cells with LaTeX support and interactive cloze fields
function TableCell({ content, question = null, value = {}, onChange = null, showFeedback = false, feedback = {}, startingBlankIndex = 0 }) {
  // Function to render text with inline LaTeX and cloze fields
  const renderWithLatexAndCloze = (text) => {
    if (!text) return '';
    
    // Decode HTML entities first to ensure we get proper LaTeX delimiters
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = text;
    const decodedText = tempDiv.textContent || tempDiv.innerText || text;
    
    // Check if this cell contains cloze markers (new {{c::}} syntax)
    const hasClozeMarkers = /\{\{c::([^}]+)\}\}/.test(decodedText);
    
    // If we have cloze functionality and this cell has markers, render interactive inputs
    if (hasClozeMarkers && question && onChange && question.blanks) {
      return renderCellWithClozeInputs(decodedText, question, value, onChange, showFeedback, feedback);
    }
    
    // Otherwise, render with LaTeX support only
    return renderWithLatex(decodedText);
  };

  // Function to render a cell with interactive cloze input fields
  const renderCellWithClozeInputs = (text, question, value, onChange, showFeedback, feedback) => {
    const parts = [];
    let remaining = text;
    
    // Use the new cloze parser to find markers that can contain LaTeX
    const clozeMarkers = parseClozeMarkers(remaining);
    
    if (clozeMarkers.length === 0) {
      // No cloze markers, just render with LaTeX
      return renderWithLatex(remaining);
    }
    
    let currentPos = 0;
    
    for (let i = 0; i < clozeMarkers.length; i++) {
      const marker = clozeMarkers[i];
      
      // Add text before this marker
      if (marker.start > currentPos) {
        const textBefore = remaining.slice(currentPos, marker.start);
        if (textBefore) {
          const renderedText = renderWithLatex(textBefore);
          if (Array.isArray(renderedText)) {
            parts.push(...renderedText);
          } else {
            parts.push(renderedText);
          }
        }
      }
      
      // Handle the cloze marker
      const markerContent = marker.content;
      
      // Find the corresponding blank index in the question's blanks array
      const blankIndex = question.blanks.findIndex(blank => blank === markerContent);
      
      if (blankIndex !== -1) {
        const fieldName = `${question.id}_${blankIndex + 1}`;
        const inputValue = value[fieldName] || '';
          const feedbackKey = fieldName;
          const isCorrect = showFeedback && feedback[feedbackKey] === 'correct';
          
          // Create a unique key that includes question id, blank index, and marker content
          // This prevents React from reusing cached input components
          const uniqueKey = `${question.id}_blank_${blankIndex}_${markerContent}_table`;
          
          parts.push(
            <span key={`${fieldName}-container-${i}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              {showFeedback ? (
                // When showing feedback, display user input (if any) and expected answer
                <>
                  {/* Show what the user typed (if anything) with colored background */}
                  {inputValue ? (
                    <>
                      <span className={`inline-block px-3 py-1 border rounded text-sm font-medium ${
                        isCorrect
                          ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-600 text-green-800 dark:text-green-200'
                          : 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-600 text-red-800 dark:text-red-200'
                      }`}>
                        {inputValue}
                      </span>
                      {/* Show correct/incorrect symbol */}
                      <span className={isCorrect ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}>
                        {isCorrect ? '✅' : '❌'}
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
                    {markerContent}
                  </span>
                </>
              ) : (
                <input
                  key={uniqueKey}
                  name={fieldName}
                  type="text"
                  value={inputValue}
                  onChange={onChange}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                  className="answer-input border rounded-lg px-2 py-1 mx-2 w-24 text-center inline-block focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  data-blank-index={blankIndex}
                  data-marker-content={markerContent}
                />
              )}
            </span>
          );
        } else {
          // If no matching blank found, just show the marker as text  
          parts.push(<span key={`marker-${i}`} className="text-gray-500">{marker.match}</span>);
        }
      
      currentPos = marker.end;
    }
    
    // Add remaining text after the last marker
    if (currentPos < remaining.length) {
      const textAfter = remaining.slice(currentPos);
      if (textAfter) {
        const renderedText = renderWithLatex(textAfter);
        if (Array.isArray(renderedText)) {
          parts.push(...renderedText);
        } else {
          parts.push(renderedText);
        }
      }
    }
    
    return parts.filter(part => part !== '');
  };

  // Function to render text with inline LaTeX (non-interactive)
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