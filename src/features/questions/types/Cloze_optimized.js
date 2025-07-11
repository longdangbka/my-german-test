/**
 * Cloze Question Type Renderer
 * 
 * Optimized cloze question renderer with clean separation of concerns:
 * - Core initialization functions for answers and feedback
 * - Separated rendering logic for cloze vs. non-cloze elements
 * - Single unified renderer component with footer controls
 */

import React from 'react';
import '../../../assets/styles/answer-contrast.css';
import VaultImage from '../../../shared/components/VaultImage.jsx';
import BookmarkButton from '../../bookmarks/BookmarkButton.jsx';
import { AnkiButton } from '../../anki';
import CodeBlock from '../components/CodeBlock';
import TableWithLatex from '../components/TableWithLatex';
import QuestionIdDisplay from '../../../shared/components/QuestionIdDisplay.jsx';
import { renderSimpleLatex } from '../../../shared/utils/simpleLatexRenderer';

// Centralized cloze utilities
import { 
  stripMarkers as stripCloze, 
  findCloze, 
  getClozeIds as getClozeNums
} from '../../cloze';

// Shared rendering components
import {
  InlineClozeText,
  GenericRenderer,
  CleanTextRenderer
} from '../components/ClozeRenderers.jsx';

// ============================================================================
// CORE INITIALIZATION FUNCTIONS
// ============================================================================

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

// ============================================================================
// SEPARATED RENDERING LOGIC
// ============================================================================

/**
 * Renders non-cloze elements (text, LaTeX, images, code blocks, tables)
 */
function renderOrderedElements(elements, question = null) {
  if (!elements || elements.length === 0) return null;
  
  // Clean any Anki format from elements
  const cleanElements = elements.map(element => {
    if (element.type === 'text' && element.content) {
      const foundClozes = findCloze(element.content);
      if (foundClozes.length > 0) {
        return { ...element, content: stripCloze(element.content) };
      }
    }
    return element;
  });
  
  const result = [];
  let currentInlineGroup = [];
  
  const flushInlineGroup = () => {
    if (currentInlineGroup.length === 0) return;
    
    const combinedText = currentInlineGroup
      .map((el, index) => {
        const content = el.type === 'text' ? el.content || '' : '';
        if (index > 0 && content.trim()) {
          const prevContent = currentInlineGroup[index - 1].content || '';
          if (prevContent.trim() && !prevContent.match(/\s$/) && !content.match(/^[\s.,;:!?]/)) {
            return ' ' + content;
          }
        }
        return content;
      })
      .join('');
    
    if (combinedText.trim()) {
      result.push(
        <GenericRenderer key={`inline-group-${result.length}`} element={{ type: 'text' }}>
          <CleanTextRenderer text={combinedText} />
        </GenericRenderer>
      );
    }
    
    currentInlineGroup = [];
  };
  
  cleanElements.forEach((element, index) => {
    switch (element.type) {
      case 'text':
        if (element.content?.trim() === '' && element.content.includes('\n')) {
          flushInlineGroup();
          const lineBreaks = (element.content.match(/\n/g) || []).length;
          const height = lineBreaks === 1 ? '0.3rem' : `${Math.min(lineBreaks * 0.3, 1.2)}rem`;
          result.push(<div key={`spacing-${result.length}`} style={{ height }} />);
        } else {
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
        if (question?.latexPlaceholders) {
          const placeholderData = question.latexPlaceholders.find(p => p.placeholder === element.content);
          if (placeholderData) {
            if (placeholderData.latexType === 'inline') {
              flushInlineGroup();
              result.push(
                <GenericRenderer key={`element-${index}`} element={element}>
                  <div className="my-1">
                    {renderSimpleLatex(`$${placeholderData.latex || ''}$`)}
                  </div>
                </GenericRenderer>
              );
            } else {
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
            currentInlineGroup.push({ type: 'text', content: element.content });
          }
        } else {
          currentInlineGroup.push({ type: 'text', content: element.content });
        }
        break;
    }
  });
  
  flushInlineGroup();
  return result;
}

/**
 * Renders text and LaTeX blocks with inline blanks via InlineClozeText
 * Falls back to read-only renderers for images, code, tables
 */
function renderClozeElements(elements, question, value, onChange, showFeedback, feedback) {
  if (!elements || elements.length === 0) return null;
  
  const result = [];
  let currentInlineGroup = [];
  let globalBlankIndex = 0;
  
  const flushInlineGroup = () => {
    if (currentInlineGroup.length === 0) return;
    
    const combinedText = currentInlineGroup
      .map((el, index) => {
        const content = el.type === 'text' ? el.content || '' : '';
        if (index > 0 && content.trim()) {
          const prevContent = currentInlineGroup[index - 1].content || '';
          if (prevContent.trim() && !prevContent.match(/\s$/) && !content.match(/^[\s.,;:!?]/)) {
            return ' ' + content;
          }
        }
        return content;
      })
      .join('');
    
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
      
      const clozeCount = findCloze(combinedText).length;
      globalBlankIndex += clozeCount;
    }
    
    currentInlineGroup = [];
  };
  
  elements.forEach((element, index) => {
    switch (element.type) {
      case 'text':
        if (element.content?.trim() === '' && element.content.includes('\n')) {
          flushInlineGroup();
          const lineBreaks = (element.content.match(/\n/g) || []).length;
          const height = lineBreaks === 1 ? '0.3rem' : `${Math.min(lineBreaks * 0.3, 1.2)}rem`;
          result.push(<div key={`spacing-${result.length}`} style={{ height }} />);
        } else {
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
        if (question?.latexPlaceholders) {
          const placeholderData = question.latexPlaceholders.find(p => p.placeholder === element.content);
          if (placeholderData) {
            if (placeholderData.latexType === 'inline') {
              flushInlineGroup();
              result.push(
                <GenericRenderer key={`latex-${index}`} element={element}>
                  <div style={{ margin: '0.1rem 0' }}>
                    {renderSimpleLatex(`$${placeholderData.latex || ''}$`)}
                  </div>
                </GenericRenderer>
              );
            } else {
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
            currentInlineGroup.push({ type: 'text', content: element.content });
          }
        } else {
          currentInlineGroup.push({ type: 'text', content: element.content });
        }
        break;
    }
  });
  
  flushInlineGroup();
  return result;
}

// ============================================================================
// SINGLE UNIFIED RENDERER COMPONENT
// ============================================================================

export function Renderer({ q, value, feedback, onChange, showFeedback, seq, quizName, groupAudio = null, showAnkiButton = false }) {
  // Clean question data to remove any Anki format markers
  const cleanQuestionData = (question) => {
    const cleanedQuestion = { ...question };
    
    const textToCheck = question.rawText || question.text;
    const clozeNums = getClozeNums(textToCheck);
    
    if (cleanedQuestion.text && findCloze(cleanedQuestion.text).length > 0) {
      cleanedQuestion.text = stripCloze(cleanedQuestion.text);
    }
    
    if (cleanedQuestion.orderedElements) {
      cleanedQuestion.orderedElements = cleanedQuestion.orderedElements.map(element => {
        if (element.type === 'text' && element.content && findCloze(element.content).length > 0) {
          return { ...element, content: stripCloze(element.content) };
        }
        return element;
      });
    }
    
    if (cleanedQuestion.explanationOrderedElements) {
      cleanedQuestion.explanationOrderedElements = cleanedQuestion.explanationOrderedElements.map(element => {
        if (element.type === 'text' && element.content && findCloze(element.content).length > 0) {
          return { ...element, content: stripCloze(element.content) };
        }
        return element;
      });
    }
    
    if (cleanedQuestion.feedback && findCloze(cleanedQuestion.feedback).length > 0) {
      cleanedQuestion.feedback = stripCloze(cleanedQuestion.feedback);
    }
    
    if (clozeNums.size > 0 && Array.isArray(cleanedQuestion.blanks)) {
      const expectedBlanks = Array.from(clozeNums).sort((a, b) => a - b);
      if (cleanedQuestion.blanks.length !== expectedBlanks.length) {
        cleanedQuestion.blanks = expectedBlanks.map(num => `Blank ${num}`);
      }
    }
    
    return cleanedQuestion;
  };
  
  const cleanedQ = cleanQuestionData(q);
  
  // Choose between cloze vs. non-cloze paths
  const hasValidBlanks = cleanedQ.blanks && cleanedQ.blanks.length > 0;
  
  return (
    <div className="question-block p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1 text-gray-900 dark:text-gray-100">
          {hasValidBlanks ? 
            renderClozeElements(cleanedQ.orderedElements || [], cleanedQ, value, onChange, showFeedback, feedback) :
            renderOrderedElements(cleanedQ.orderedElements || [], cleanedQ)
          }
        </div>
        <div className="flex items-center space-x-2">
          <BookmarkButton 
            question={cleanedQ} 
            quizName={quizName} 
            questionIndex={seq}
            groupAudio={groupAudio}
          />
        </div>
      </div>
      
      {/* UI Controls Organized in Footer */}
      <div className="mt-2 flex justify-end items-center space-x-2">
        {showAnkiButton && (
          <AnkiButton question={cleanedQ} compact={true} />
        )}
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
