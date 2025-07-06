import React from 'react';
import LatexBlock from '../questionTypes/LatexBlock';

/**
 * Simple LaTeX text processor
 * Handles both inline $...$ and block $$...$$ LaTeX
 * 
 * @param {string} text - Text that may contain LaTeX
 * @returns {React.ReactNode} - Processed content
 */
export function renderWithInlineLatex(text) {
  if (!text || typeof text !== 'string') {
    return text || '';
  }
  
  console.log('🔍 LATEX RENDERER - Input:', text);
  
  // Simple approach: first replace block math, then inline math
  const parts = [];
  let currentText = text;
  let keyCounter = 0;
  
  // Handle block math ($$...$$) first
  const blockParts = currentText.split('$$');
  if (blockParts.length > 1) {
    for (let i = 0; i < blockParts.length; i++) {
      if (i % 2 === 0) {
        // Even indices are regular text
        if (blockParts[i]) {
          parts.push(blockParts[i]);
        }
      } else {
        // Odd indices are block math
        const latex = blockParts[i].trim();
        if (latex) {
          parts.push(
            <LatexBlock 
              key={`block-${keyCounter++}`} 
              latex={latex} 
              type="block" 
            />
          );
        }
      }
    }
  } else {
    parts.push(currentText);
  }
  
  // Now handle inline math in text parts
  const finalParts = [];
  for (const part of parts) {
    if (typeof part === 'string') {
      // Handle inline math in this text part
      const inlineParts = part.split('$');
      if (inlineParts.length > 1) {
        for (let i = 0; i < inlineParts.length; i++) {
          if (i % 2 === 0) {
            // Even indices are regular text
            if (inlineParts[i]) {
              finalParts.push(inlineParts[i]);
            }
          } else {
            // Odd indices are inline math
            const latex = inlineParts[i].trim();
            if (latex) {
              finalParts.push(
                <LatexBlock 
                  key={`inline-${keyCounter++}`} 
                  latex={latex} 
                  type="inline" 
                />
              );
            }
          }
        }
      } else {
        finalParts.push(part);
      }
    } else {
      // This is already a LaTeX component
      finalParts.push(part);
    }
  }
  
  console.log('🔍 LATEX RENDERER - Result parts:', finalParts.length);
  
  // Filter out empty strings
  const filteredParts = finalParts.filter(part => 
    part !== '' && part !== null && part !== undefined
  );
  
  // Return appropriate result
  if (filteredParts.length === 0) return text;
  if (filteredParts.length === 1) return filteredParts[0];
  return React.createElement(React.Fragment, { key: 'latex-fragment' }, ...filteredParts);
}

export default renderWithInlineLatex;
