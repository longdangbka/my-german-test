import React from 'react';
import '../../../assets/styles/answer-contrast.css';
import VaultImage from '../../../shared/components/VaultImage.jsx';
import BookmarkButton from '../../bookmarks/BookmarkButton.jsx';
import { AnkiButton } from '../../anki';
import CodeBlock from '../components/CodeBlock';
import TableWithLatex from '../components/TableWithLatex';
import QuestionIdDisplay from '../../../shared/components/QuestionIdDisplay.jsx';
import { renderSimpleLatex } from '../../../shared/utils/simpleLatexRenderer';

// Import centralized cloze utilities
import { 
  stripMarkers as stripCloze, 
  findCloze, 
  getClozeIds, 
  replaceWithBlanks as toBlanks 
} from '../../../cloze.js';

// Import focused cloze rendering components
import {
  InlineClozeText,
  GenericRenderer,
  CleanTextRenderer,
  ClozeDebugInfo
} from '../components/ClozeRenderers.jsx';

// Legacy export for backward compatibility - now uses centralized utility
export { stripCloze };

// Helper: extract cloze numbers from content using centralized utility
const getClozeNums = (content) => {
  if (!content) return new Set();
  
  const ids = getClozeIds(content);
  const clozeNums = new Set(ids);
  
  if (clozeNums.size > 0) {
    console.log(`🔍 CLOZE NUMBER - Found cloze numbers ${Array.from(clozeNums)} in content`);
  }
  
  return clozeNums;
};

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
export function Renderer({ q, value, feedback, onChange, showFeedback, seq, quizName, groupAudio = null, showAnkiButton = false }) {
  // Debugging info for developer troubleshooting
  console.log('🔍 CLOZE RENDERER - Rendering CLOZE question:', q.id);
  console.log('🔍 CLOZE RENDERER - Blanks found:', q.blanks?.length || 0);
  
  // Add visual debugging for development
  const isDebug = window.location.search.includes('debug');
  
  // In debug mode, show detailed information using focused component
  if (isDebug) {
    return (
      <div className="question-block p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 transition-all duration-200">
        <ClozeDebugInfo question={q} isDebug={true} />
        
        {/* Show the actual rendered content */}
        <div className="border-t pt-4">
          <h5 className="font-bold mb-2">Rendered Content:</h5>
          {(!q.blanks || q.blanks.length === 0) ? (
            <div>
              <p className="text-red-600 mb-2">⚠️ No blanks - rendering as read-only</p>
              {renderOrderedElements(q.orderedElements || [], q)}
            </div>
          ) : (
            <div>
              <p className="text-green-600 mb-2">✅ Has blanks - rendering with inputs</p>
              {renderElementsWithCloze(q.orderedElements || [], q, value, onChange, showFeedback, feedback)}
            </div>
          )}
        </div>
      </div>
    );
  }
  
  // Safety check: ensure question data doesn't contain Anki format {{cN::content}}
  // This should only happen if there's a bug in the question processing pipeline
  const cleanQuestionData = (question) => {
    const cleanedQuestion = { ...question };
    
    // Get all cloze numbers in the question content using centralized utility
    // Check both question.text and question.rawText (for bookmarked questions)
    const textToCheck = question.rawText || question.text;
    const clozeNums = getClozeNums(textToCheck);
    console.log('🔍 CLOZE PROCESSING - Checking text:', textToCheck?.substring(0, 100) + '...');
    console.log('🔍 CLOZE PROCESSING - Found cloze numbers:', Array.from(clozeNums));
    
    // Process text with centralized utilities - convert cloze markers to blanks for display
    if (cleanedQuestion.text && findCloze(cleanedQuestion.text).length > 0) {
      console.warn('🚨 FRONTEND CLOZE WARNING - Found Anki format in question.text:', cleanedQuestion.text);
      cleanedQuestion.text = toBlanks(cleanedQuestion.text); // Replace all cloze with blanks
      console.warn('🚨 FRONTEND CLOZE WARNING - Cleaned question.text:', cleanedQuestion.text);
    }
    
    // Check and clean orderedElements using centralized utilities
    if (cleanedQuestion.orderedElements) {
      cleanedQuestion.orderedElements = cleanedQuestion.orderedElements.map(element => {
        if (element.type === 'text' && element.content) {
          // Add any cloze numbers from elements to the set (check original content in rawText)
          if (question.rawText) {
            const elementClozeNums = getClozeNums(question.rawText);
            elementClozeNums.forEach(num => clozeNums.add(num));
          }
          
          // Also check the element content itself for any remaining cloze markers
          const elementClozes = findCloze(element.content);
          if (elementClozes.length > 0) {
            const elementClozeNums = getClozeIds(element.content);
            elementClozeNums.forEach(num => clozeNums.add(num));
            
            console.log('🔍 CLOZE EXTRACTION - Found cloze in element:', element.content);
            console.log('🔍 CLOZE EXTRACTION - Extracted cloze numbers:', elementClozeNums);
          }
          
          const originalContent = element.content;
          // Use centralized utility to convert cloze markers to blanks
          const cleanedContent = toBlanks(originalContent);
          
          if (originalContent !== cleanedContent) {
            console.warn('🚨 FRONTEND CLOZE WARNING - Content was modified:', { original: originalContent, cleaned: cleanedContent });
          }
          
          return { ...element, content: cleanedContent };
        }
        return element;
      });
    }
    
    // Process explanation elements using centralized utilities
    if (cleanedQuestion.explanationOrderedElements) {
      cleanedQuestion.explanationOrderedElements = cleanedQuestion.explanationOrderedElements.map(element => {
        if (element.type === 'text' && element.content) {
          // For explanations, use stripCloze to show the inner content
          const originalContent = element.content;
          const cleanedContent = stripCloze(originalContent);
          
          if (originalContent !== cleanedContent) {
            console.warn('🚨 EXPLANATION CLOZE WARNING - Stripped cloze from explanation:', {
              original: originalContent,
              cleaned: cleanedContent
            });
          }
          
          return { ...element, content: cleanedContent };
        }
        return element;
      });
    }
    
    // Process feedback text and other text fields using centralized utilities
    if (cleanedQuestion.feedback) {
      Object.keys(cleanedQuestion.feedback).forEach(key => {
        if (typeof cleanedQuestion.feedback[key] === 'string' && 
            findCloze(cleanedQuestion.feedback[key]).length > 0) {
          cleanedQuestion.feedback[key] = stripCloze(cleanedQuestion.feedback[key]);
        }
      });
    }
    
    // If we found cloze numbers, ensure blanks array is updated and log information
    if (clozeNums.size > 0 && Array.isArray(cleanedQuestion.blanks)) {
      console.log('🔍 CLOZE STRUCTURE - Blanks array:', cleanedQuestion.blanks);
      console.log('🔍 CLOZE STRUCTURE - Cloze numbers found:', Array.from(clozeNums).sort());
    }
    
    return cleanedQuestion;
  };
  
  const cleanedQ = cleanQuestionData(q);
  
  // Use the new ordered elements approach for questions without blanks
  if (!q.blanks || q.blanks.length === 0) {
    return (
      <div className="question-block p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 transition-all duration-200">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {renderOrderedElements(q.orderedElements || [], q)}
            {showFeedback && q.explanation && (
              <div className="mt-2 text-sm text-gray-600">
                <strong>Erklärung:</strong>
                {renderOrderedElements(q.explanationOrderedElements || [], q)}
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
            {showAnkiButton && (
              <AnkiButton question={q} />
            )}
          </div>
        </div>
        
        {/* Question ID display */}
        <div className="mt-2 flex justify-end">
          <QuestionIdDisplay questionId={q.id} />
        </div>
      </div>
    );
  }
  

  
  // For cloze questions with blanks, render all content in order using focused components
  return (
    <div className="question-block p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1 text-gray-900 dark:text-gray-100">
          {/* Render all content elements using the new simplified function */}
          {renderElementsWithCloze(cleanedQ.orderedElements || [], cleanedQ, value, onChange, showFeedback, feedback)}
        </div>
        <div className="flex items-center space-x-2">
          <BookmarkButton 
            question={cleanedQ} 
            quizName={quizName} 
            questionIndex={seq}
            groupAudio={groupAudio}
          />
          {showAnkiButton && (
            <AnkiButton question={q} />
          )}
        </div>
      </div>
      
      {/* Question ID display */}
      <div className="mt-2 flex justify-end">
        <QuestionIdDisplay questionId={cleanedQ.id} />
      </div>
      
      {showFeedback && cleanedQ.explanation && (
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 text-sm">
          <strong className="text-blue-800 dark:text-blue-200">💡 Erklärung:</strong>
          <div className="mt-2">
            {cleanedQ.explanationOrderedElements ? (
              renderOrderedElements(cleanedQ.explanationOrderedElements, cleanedQ)
            ) : (
              <CleanTextRenderer text={cleanedQ.explanation} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Simplified function to render elements with cloze handling using focused components
function renderElementsWithCloze(elements, question, value, onChange, showFeedback, feedback) {
  if (!elements || elements.length === 0) return null;
  
  const result = [];
  let currentInlineGroup = [];
  let globalBlankIndex = 0;
  
  // Helper function to flush the current inline group with cloze handling
  const flushInlineGroup = () => {
    if (currentInlineGroup.length === 0) return;
    
    // Combine all text content in the group
    const combinedTextParts = [];
    
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
      result.push(
        <GenericRenderer key={`inline-group-${result.length}`} element={{ type: 'text' }}>
          <InlineClozeText
            text={combinedText}
            question={question}
            value={value}
            onChange={onChange}
            showFeedback={showFeedback}
            feedback={feedback}
            startBlankIndex={globalBlankIndex}
          />
        </GenericRenderer>
      );
      
      // Update global blank index based on cloze markers found
      const clozeCount = findCloze(combinedText).length;
      globalBlankIndex += clozeCount;
    }
    
    currentInlineGroup = [];
  };
  
  elements.forEach((element, index) => {
    try {
      switch (element.type) {
        case 'text':
          // Add text elements to the current inline group
          // Preserve line breaks by treating whitespace-only text with line breaks specially
          if (element.content && element.content.trim() === '' && element.content.includes('\n')) {
            // This is whitespace that contains line breaks - flush current group and add minimal spacing
            flushInlineGroup();
            // For single line breaks, just add a small margin div; for multiple line breaks, add more spacing
            const lineBreaks = (element.content.match(/\n/g) || []).length;
            if (lineBreaks === 1) {
              // Single line break - add minimal spacing
              result.push(<div key={`spacing-${result.length}`} style={{ height: '0.3rem' }} />);
            } else {
              // Multiple line breaks - add proportional spacing
              result.push(<div key={`spacing-${result.length}`} style={{ height: `${Math.min(lineBreaks * 0.3, 1.2)}rem` }} />);
            }
          } else {
            // Regular text content
            currentInlineGroup.push(element);
          }
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
              <GenericRenderer key={`element-${index}`} element={element}>
                {renderSimpleLatex(`$$${element.content?.latex || ''}$$`)}
              </GenericRenderer>
            );
          }
          break;
        
        case 'image':
          flushInlineGroup();
          result.push(
            <GenericRenderer key={`element-${index}`} element={element}>
              <VaultImage
                src={element.content || ''}
                alt="content visual"
                style={{ maxWidth: '100%', margin: '8px 0' }}
              />
            </GenericRenderer>
          );
          break;
        
        case 'codeBlock':
          flushInlineGroup();
          result.push(
            <GenericRenderer key={`element-${index}`} element={element}>
              <CodeBlock 
                code={element.content?.code || ''} 
                lang={element.content?.lang || ''} 
              />
            </GenericRenderer>
          );
          break;
        
        case 'table':
          flushInlineGroup();
          result.push(
            <GenericRenderer key={`element-${index}`} element={element}>
              <TableWithLatex 
                htmlTable={element.content || ''} 
                question={question}
                value={value}
                onChange={onChange}
                showFeedback={showFeedback}
                feedback={feedback}
              />
            </GenericRenderer>
          );
          break;
        
        case 'latexPlaceholder':
          // Convert LaTeX placeholder back to LaTeX element using stored placeholders
          if (question.latexPlaceholders && question.latexPlaceholders.length > 0) {
            const placeholderData = question.latexPlaceholders.find(p => p.placeholder === element.content);
            if (placeholderData) {
              // For single-line LaTeX expressions that were on separate lines, 
              // treat them as block elements to preserve line breaks
              if (placeholderData.latexType === 'inline') {
                // Check if we should treat this as a block to preserve line structure
                // Single-line LaTeX like $x=5$ on its own line should be treated as block
                flushInlineGroup();
                result.push(
                  <GenericRenderer key={`latex-${index}`} element={element}>
                    <div style={{ margin: '0.1rem 0' }}>
                      {renderSimpleLatex(`$${placeholderData.latex || ''}$`)}
                    </div>
                  </GenericRenderer>
                );
              } else {
                // Display LaTeX as block
                flushInlineGroup();
                result.push(
                  <GenericRenderer key={`latex-${index}`} element={element}>
                    <div className="my-2">
                      {renderSimpleLatex(`$$${placeholderData.latex || ''}$$`)}
                    </div>
                  </GenericRenderer>
                );
              }
            } else {
              console.warn('LaTeX placeholder not found in stored placeholders:', element.content);
              // Fallback: treat as text
              currentInlineGroup.push({
                type: 'text',
                content: element.content
              });
            }
          } else {
            console.warn('No LaTeX placeholders found in question object');
            // Fallback: treat as text
            currentInlineGroup.push({
              type: 'text',
              content: element.content
            });
          }
          break;
        
        default:
          console.warn('Unknown element type in cloze renderer:', element.type);
          break;
      }
    } catch (error) {
      console.error('Error rendering element in cloze:', element, error);
    }
  });
  
  // Flush any remaining inline group
  flushInlineGroup();
  
  return result;
}

// Function to render elements in their original order with proper inline grouping
// Simplified function to render elements without cloze interaction (read-only) 
function renderOrderedElements(elements, question = null) {
  if (!elements || elements.length === 0) return null;
  
  // Safety check: clean any Anki format from elements using centralized utilities
  elements = elements.map(element => {
    if (element.type === 'text' && element.content) {
      // Check for Anki cloze format and extract inner content using stripCloze
      const foundClozes = findCloze(element.content);
      if (foundClozes.length > 0) {
        console.log('� CLOZE RENDERING - Found Anki format in element:', element.content);
        
        // Extract and show the inner content from cloze markers
        const cleanedContent = stripCloze(element.content);
        console.log('� CLOZE RENDERING - Converted to plain text:', cleanedContent);
        return { ...element, content: cleanedContent };
      }
    }
    return element;
  });
  
  const result = [];
  let currentInlineGroup = [];
  
  // Helper function to flush the current inline group
  const flushInlineGroup = () => {
    if (currentInlineGroup.length === 0) return;
    
    const combinedTextParts = [];
    
    currentInlineGroup.forEach((el, index) => {
      const content = el.type === 'text' ? el.content || '' : '';
      
      // Add space before element if needed
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
      result.push(
        <GenericRenderer key={`inline-group-${result.length}`} element={{ type: 'text' }}>
          <CleanTextRenderer text={combinedText} />
        </GenericRenderer>
      );
    }
    
    currentInlineGroup = [];
  };
  
  elements.forEach((element, index) => {
    try {
      switch (element.type) {
        case 'text':
          // Add text elements to the current inline group
          // Preserve line breaks by treating whitespace-only text with line breaks specially
          if (element.content && element.content.trim() === '' && element.content.includes('\n')) {
            // This is whitespace that contains line breaks - flush current group and add minimal spacing
            flushInlineGroup();
            // For single line breaks, just add a small margin div; for multiple line breaks, add more spacing
            const lineBreaks = (element.content.match(/\n/g) || []).length;
            if (lineBreaks === 1) {
              // Single line break - add minimal spacing
              result.push(<div key={`spacing-${result.length}`} style={{ height: '0.3rem' }} />);
            } else {
              // Multiple line breaks - add proportional spacing
              result.push(<div key={`spacing-${result.length}`} style={{ height: `${Math.min(lineBreaks * 0.3, 1.2)}rem` }} />);
            }
          } else {
            // Regular text content
            currentInlineGroup.push(element);
          }
          break;
        
        case 'latex':
          if (element.content?.latexType === 'inline') {
            currentInlineGroup.push({
              type: 'text',
              content: `$${element.content?.latex || ''}$`
            });
          } else {
            flushInlineGroup();
            result.push(
              <GenericRenderer key={`element-${index}`} element={element}>
                {renderSimpleLatex(`$$${element.content?.latex || ''}$$`)}
              </GenericRenderer>
            );
          }
          break;
        
        case 'image':
          flushInlineGroup();
          result.push(
            <GenericRenderer key={`element-${index}`} element={element}>
              <VaultImage
                src={element.content || ''}
                alt="content visual"
                style={{ maxWidth: '100%', margin: '8px 0' }}
              />
            </GenericRenderer>
          );
          break;
        
        case 'codeBlock':
          flushInlineGroup();
          result.push(
            <GenericRenderer key={`element-${index}`} element={element}>
              <CodeBlock 
                code={element.content?.code || ''} 
                lang={element.content?.lang || ''} 
              />
            </GenericRenderer>
          );
          break;
        
        case 'table':
          flushInlineGroup();
          result.push(
            <GenericRenderer key={`element-${index}`} element={element}>
              <TableWithLatex htmlTable={element.content || ''} />
            </GenericRenderer>
          );
          break;
        
        case 'latexPlaceholder':
          // Convert LaTeX placeholder back to LaTeX element using stored placeholders
          if (question && question.latexPlaceholders && question.latexPlaceholders.length > 0) {
            const placeholderData = question.latexPlaceholders.find(p => p.placeholder === element.content);
            if (placeholderData) {
              // For single-line LaTeX expressions that were on separate lines, 
              // treat them as block elements to preserve line breaks
              if (placeholderData.latexType === 'inline') {
                // Check if we should treat this as a block to preserve line structure
                // Single-line LaTeX like $x=5$ on its own line should be treated as block
                flushInlineGroup();
                result.push(
                  <GenericRenderer key={`element-${index}`} element={element}>
                    <div className="my-1">
                      {renderSimpleLatex(`$${placeholderData.latex || ''}$`)}
                    </div>
                  </GenericRenderer>
                );
              } else {
                // Display LaTeX as block
                flushInlineGroup();
                result.push(
                  <GenericRenderer key={`element-${index}`} element={element}>
                    <div className="my-2">
                      {renderSimpleLatex(`$$${placeholderData.latex || ''}$$`)}
                    </div>
                  </GenericRenderer>
                );
              }
            } else {
              console.warn('LaTeX placeholder not found in stored placeholders:', element.content);
              // Fallback: treat as text
              currentInlineGroup.push({
                type: 'text',
                content: element.content
              });
            }
          } else {
            console.warn('No latexPlaceholders found in question for placeholder:', element.content);
            // Fallback: treat as text
            currentInlineGroup.push({
              type: 'text',
              content: element.content
            });
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
