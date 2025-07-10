/**
 * ClozeBlank Component
 * 
 * Centralized React component for rendering cloze blanks using the unified cloze.js API.
 * This replaces all ad-hoc blank rendering throughout the app.
 */

import React from 'react';
import { ClozeBlank as CoreClozeBlank } from '../../../cloze.js';

/**
 * React wrapper for the core ClozeBlank component from cloze.js
 * Provides additional styling and integration with the app's design system
 */
export default function ClozeBlank(props) {
  return <CoreClozeBlank {...props} />;
}

/**
 * Higher-order component for rendering cloze text with interactive blanks
 * Uses the centralized cloze parsing and rendering logic
 */
export function ClozeText({ 
  text, 
  question, 
  value, 
  onChange, 
  showFeedback, 
  feedback,
  startingBlankIndex = 0,
  className = '',
  renderText = null
}) {
  // Import the parsing and rendering functions dynamically to avoid circular deps
  const { parseClozes, renderWithInputs } = require('../../../cloze.js');
  
  if (!text) return null;
  
  const { parts } = parseClozes(text);
  
  if (parts.length === 0) return null;
  
  const rendered = renderWithInputs(parts, {
    renderBlank: (blankIndex, clozeInfo) => (
      <ClozeBlank
        key={`blank-${blankIndex}`}
        question={question}
        blankIndex={startingBlankIndex + blankIndex}
        value={value}
        onChange={onChange}
        showFeedback={showFeedback}
        feedback={feedback}
        clozeInfo={clozeInfo}
        className={className}
      />
    ),
    renderText: renderText || ((text) => (
      <span key={`text-${Math.random()}`} style={{ whiteSpace: 'pre-wrap' }}>
        {text}
      </span>
    )),
    startingBlankIndex
  });
  
  return (
    <span className={`cloze-text ${className}`}>
      {rendered.map((element, index) => (
        <React.Fragment key={index}>{element}</React.Fragment>
      ))}
    </span>
  );
}

/**
 * Utility component for rendering LaTeX-aware cloze text
 * Integrates with the app's LaTeX rendering system
 */
export function ClozeTextWithLatex({ 
  text, 
  question, 
  value, 
  onChange, 
  showFeedback, 
  feedback,
  startingBlankIndex = 0,
  className = ''
}) {
  // Import LaTeX renderer
  const { renderSimpleLatex } = require('../../../shared/utils/simpleLatexRenderer');
  
  return (
    <ClozeText
      text={text}
      question={question}
      value={value}
      onChange={onChange}
      showFeedback={showFeedback}
      feedback={feedback}
      startingBlankIndex={startingBlankIndex}
      className={className}
      renderText={(text) => (
        <span key={`latex-text-${Math.random()}`} style={{ whiteSpace: 'pre-wrap' }}>
          {renderSimpleLatex(text)}
        </span>
      )}
    />
  );
}
