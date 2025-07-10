/**
 * Cloze Rendering Components
 * 
 * Small, focused components for rendering different parts of cloze questions.
 * Uses centralized cloze utilities for consistent processing.
 */

import React from 'react';
import { renderSimpleLatex } from '../../../shared/utils/simpleLatexRenderer';
import { 
  stripMarkers, 
  findCloze, 
  ClozeBlank 
} from '../../../cloze.js';

/**
 * Component to render inline cloze text with input fields or feedback.
 * Handles the conversion of text with cloze markers to interactive elements.
 * 
 * FIXED: Now properly handles multiple clozes with the same ID by creating
 * only one input field per unique cloze group, not per cloze marker.
 */
export function InlineClozeText({ 
  text, 
  question, 
  value, 
  onChange, 
  showFeedback, 
  feedback, 
  startBlankIndex = 0,
  globalRenderedClozeIds = null // NEW: Global tracking of rendered cloze IDs
}) {
  console.log('🔍 INLINE CLOZE TEXT - Received text:', text);
  console.log('🔍 INLINE CLOZE TEXT - Question blanks:', question?.blanks?.length || 0);
  console.log('🔍 INLINE CLOZE TEXT - showFeedback:', showFeedback);
  console.log('🔍 INLINE CLOZE TEXT - hasOnChange:', !!onChange);
  console.log('🔍 INLINE CLOZE TEXT - Call stack:', new Error().stack?.split('\n').slice(1, 4));
  
  if (!text || typeof text !== 'string') {
    return null;
  }

  // Check for blank placeholders (processed cloze markers)
  const hasBlankPlaceholders = /_____/.test(text);
  const hasIdAwareBlanks = /__CLOZE_\d+__/.test(text);
  
  console.log('🔍 INLINE CLOZE TEXT - Blank analysis:', {
    hasBlankPlaceholders,
    hasIdAwareBlanks,
    textSample: text.substring(0, 100) + (text.length > 100 ? '...' : '')
  });
  
  // Check for raw cloze markers (unprocessed)
  const clozes = findCloze(text);
  
  // If neither blanks nor cloze markers, render as plain text with LaTeX support
  if (!hasBlankPlaceholders && !hasIdAwareBlanks && clozes.length === 0) {
    return (
      <span style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
        {renderSimpleLatex(text)}
      </span>
    );
  }

  // CRITICAL FIX: Handle blank placeholders (processed cloze markers)
  if (hasBlankPlaceholders || hasIdAwareBlanks) {
    return renderTextWithBlankPlaceholders(text, question, value, onChange, showFeedback, feedback, startBlankIndex, globalRenderedClozeIds);
  }

  // Handle raw cloze markers (fallback for unprocessed clozes)
  // CRITICAL FIX: Use global tracking if available, otherwise local tracking
  const renderedClozeIds = globalRenderedClozeIds || new Set();
  const isLocalTracking = !globalRenderedClozeIds;
  
  let result = [];
  let lastIndex = 0;
  let currentBlankIndex = startBlankIndex;
  
  // Process each cloze marker in order
  clozes.forEach((cloze, index) => {
    const { id, fullMatch } = cloze;
    const clozeStartIndex = text.indexOf(fullMatch, lastIndex);
    
    if (clozeStartIndex === -1) return; // Skip if not found
    
    // Add text before this cloze marker
    if (clozeStartIndex > lastIndex) {
      const beforeText = text.slice(lastIndex, clozeStartIndex);
      result.push(renderSimpleLatex(beforeText));
    }
    
    // Only render an input field if we haven't rendered one for this cloze ID yet
    // EMERGENCY FIX: Allow input rendering even if question.blanks is empty for ID-aware blanks
    const hasValidBlanks = question.blanks && question.blanks.length > 0;
    const shouldRenderInput = !renderedClozeIds.has(id) && (
      hasValidBlanks ? currentBlankIndex < question.blanks.length : true
    );
    
    if (shouldRenderInput) {
      result.push(
        <ClozeBlank
          key={`blank-${currentBlankIndex}`}
          question={question}
          blankIndex={currentBlankIndex}
          value={value}
          onChange={onChange}
          showFeedback={showFeedback}
          feedback={feedback}
          renderLatex={renderSimpleLatex}
        />
      );
      renderedClozeIds.add(id);
      currentBlankIndex++;
    } else {
      // For subsequent clozes with the same ID, just show the blank placeholder
      result.push(<span key={`placeholder-${index}`} className="cloze-placeholder">_____</span>);
    }
    
    lastIndex = clozeStartIndex + fullMatch.length;
  });
  
  // Add remaining text after the last cloze
  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex);
    result.push(renderSimpleLatex(remainingText));
  }

  return (
    <span style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
      {result.map((element, index) => (
        <React.Fragment key={`element-${index}`}>
          {element}
        </React.Fragment>
      ))}
    </span>
  );
}

// Helper function to render text with blank placeholders (_____ or __CLOZE_N__) 
function renderTextWithBlankPlaceholders(text, question, value, onChange, showFeedback, feedback, startBlankIndex, globalRenderedClozeIds = null) {
  const result = [];
  
  // Check for ID-aware blanks first
  const hasIdAwareBlanks = /__CLOZE_\d+__/.test(text);
  
  if (hasIdAwareBlanks) {
    // Handle ID-aware blanks with global tracking
    const renderedClozeIds = globalRenderedClozeIds || new Set();
    let lastIndex = 0;
    let currentBlankIndex = startBlankIndex;
    
    // Create a fresh regex for iteration
    const idAwareBlankPattern = /__CLOZE_(\d+)__/g;
    let match;
    
    while ((match = idAwareBlankPattern.exec(text)) !== null) {
      const clozeId = parseInt(match[1]);
      const matchStart = match.index;
      const matchEnd = matchStart + match[0].length;
      
      // Add text before this blank
      if (matchStart > lastIndex) {
        const beforeText = text.slice(lastIndex, matchStart);
        if (beforeText) {
          result.push(renderSimpleLatex(beforeText));
        }
      }
      
      // Only render an input field if we haven't rendered one for this cloze ID yet
      const shouldRenderInput = !renderedClozeIds.has(clozeId) && currentBlankIndex < (question.blanks?.length || 0);
      
      // EMERGENCY FIX: If no blanks array but we have ID-aware blanks, force input rendering
      const emergencyFix = !question.blanks || question.blanks.length === 0;
      const shouldRenderInputFixed = emergencyFix ? !renderedClozeIds.has(clozeId) : shouldRenderInput;
      
      console.log('🔍 ID-AWARE BLANK - Processing:', {
        clozeId,
        hasRendered: renderedClozeIds.has(clozeId),
        currentBlankIndex,
        totalBlanks: question.blanks?.length || 0,
        shouldRenderInput,
        emergencyFix,
        shouldRenderInputFixed,
        renderedClozeIds: Array.from(renderedClozeIds),
        matchStart,
        matchEnd,
        lastIndex,
        matchText: match[0],
        beforeText: matchStart > lastIndex ? text.slice(lastIndex, matchStart) : '(none)'
      });
      
      if (shouldRenderInputFixed) {
        console.log('🔍 ID-AWARE BLANK - RENDERING INPUT FIELD');
        result.push(
          <ClozeBlank
            key={`blank-${currentBlankIndex}`}
            question={question}
            blankIndex={currentBlankIndex}
            value={value}
            onChange={onChange}
            showFeedback={showFeedback}
            feedback={feedback}
            renderLatex={renderSimpleLatex}
          />
        );
        renderedClozeIds.add(clozeId);
        currentBlankIndex++;
      } else {
        console.log('🔍 ID-AWARE BLANK - RENDERING PLACEHOLDER (already rendered or no more blanks)');
        // For subsequent clozes with the same ID, just show a placeholder
        result.push(<span key={`placeholder-${match.index}`} className="cloze-placeholder">_____</span>);
      }
      
      lastIndex = matchEnd;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      const remainingText = text.slice(lastIndex);
      if (remainingText) {
        console.log('🔍 ID-AWARE BLANK - Adding remaining text:', remainingText);
        result.push(renderSimpleLatex(remainingText));
      }
    }
    
    console.log('🔍 ID-AWARE BLANK - Final result array:', result.map((item, idx) => ({
      index: idx,
      type: typeof item,
      isReactElement: React.isValidElement(item),
      content: typeof item === 'string' ? item : (React.isValidElement(item) ? item.type.name || item.type : 'unknown'),
      actualContent: typeof item === 'string' ? item : (React.isValidElement(item) ? `React<${item.type.name || item.type}>` : JSON.stringify(item))
    })));
    
    console.log('🔍 ID-AWARE BLANK - Result array details:', result);
  } else {
    // Handle regular blanks (legacy behavior)
    console.log('🔍 REGULAR BLANKS - Processing legacy blank placeholders');
    const blankSections = text.split('_____');
    let currentBlankIndex = startBlankIndex;
    
    console.log('🔍 REGULAR BLANKS - Sections:', blankSections.length, 'Question blanks:', question?.blanks?.length || 0);
    
    for (let i = 0; i < blankSections.length; i++) {
      // Add text section with LaTeX rendering
      if (blankSections[i]) {
        result.push(renderSimpleLatex(blankSections[i]));
      }
      
      // Add input field if there's a blank after this section
      const shouldAddInput = i < blankSections.length - 1;
      const hasValidQuestion = question && question.blanks;
      const withinBlankLimit = hasValidQuestion ? currentBlankIndex < question.blanks.length : true;
      
      // EMERGENCY FIX: If no blanks array, allow input rendering anyway
      const shouldRenderInputRegular = shouldAddInput && (withinBlankLimit || !hasValidQuestion);
      
      console.log('🔍 REGULAR BLANKS - Blank', i, ':', {
        shouldAddInput,
        hasValidQuestion,
        withinBlankLimit,
        shouldRenderInputRegular
      });
      
      if (shouldRenderInputRegular) {
        console.log('🔍 REGULAR BLANKS - RENDERING INPUT FIELD for blank', currentBlankIndex);
        result.push(
          <ClozeBlank
            key={`blank-${currentBlankIndex}`}
            question={question}
            blankIndex={currentBlankIndex}
            value={value}
            onChange={onChange}
            showFeedback={showFeedback}
            feedback={feedback}
            renderLatex={renderSimpleLatex}
          />
        );
        currentBlankIndex++;
      }
    }
  }
  
  return (
    <span style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
      {result.map((element, index) => (
        <React.Fragment key={`element-${index}`}>
          {element}
        </React.Fragment>
      ))}
    </span>
  );
}

/**
 * Generic component to render various content types in a consistent way.
 * Abstracts the common rendering patterns for different element types.
 */
export function GenericRenderer({ element, index, children, className = "my-2" }) {
  const key = `element-${index}`;
  
  if (element?.type === 'text' && children) {
    // For text elements, use inline rendering
    return <React.Fragment key={key}>{children}</React.Fragment>;
  }
  
  // For block elements, wrap in a div
  return (
    <div key={key} className={className}>
      {children}
    </div>
  );
}

/**
 * Component to render clean text content (stripped of cloze markers).
 * Used for explanations and other content where cloze markers should be hidden.
 */
export function CleanTextRenderer({ text, className = "" }) {
  if (!text || typeof text !== 'string') {
    return null;
  }
  
  const cleanText = stripMarkers(text);
  
  return (
    <span className={className} style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
      {renderSimpleLatex(cleanText)}
    </span>
  );
}

/**
 * Debug component to show cloze processing information.
 * Only renders when debug mode is enabled.
 */
export function ClozeDebugInfo({ question, isDebug = false }) {
  if (!isDebug) return null;
  
  const textToCheck = question.rawText || question.text;
  const clozes = findCloze(textToCheck || '');
  
  return (
    <div className="debug-info bg-yellow-100 p-4 mb-4 text-sm border-l-4 border-yellow-500">
      <h4 className="font-bold text-lg mb-2">🔍 DEBUG INFO - CLOZE Question</h4>
      <div className="space-y-2">
        <div><strong>ID:</strong> {question.id}</div>
        <div><strong>Type:</strong> {question.type}</div>
        <div><strong>Has Blanks:</strong> {question.blanks ? `Yes (${question.blanks.length})` : 'No'}</div>
        <div><strong>Cloze Markers Found:</strong> {clozes.length}</div>
        {clozes.length > 0 && (
          <div><strong>Cloze Details:</strong> 
            <pre className="bg-gray-100 p-2 mt-1 text-xs">{JSON.stringify(clozes, null, 2)}</pre>
          </div>
        )}
        <div><strong>Blanks:</strong> 
          <pre className="bg-gray-100 p-2 mt-1 text-xs">{JSON.stringify(question.blanks, null, 2)}</pre>
        </div>
        <div><strong>Elements Count:</strong> {question.orderedElements?.length || 0}</div>
        {question.orderedElements?.[0] && (
          <div><strong>First Element:</strong> 
            <pre className="bg-gray-100 p-2 mt-1 text-xs">{JSON.stringify(question.orderedElements[0], null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
