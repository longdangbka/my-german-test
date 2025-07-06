import React from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

/**
 * Component to render text with LaTeX support
 * Converts $...$ to inline math and $$...$$ to display math
 */
export default function TextWithLatex({ children, className = "", ...props }) {
  // Function to render text with inline LaTeX
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

  const renderedContent = renderWithLatex(children);
  
  return (
    <span className={className} {...props}>
      {Array.isArray(renderedContent) ? renderedContent.map((part, idx) => (
        <React.Fragment key={idx}>{part}</React.Fragment>
      )) : renderedContent}
    </span>
  );
}
