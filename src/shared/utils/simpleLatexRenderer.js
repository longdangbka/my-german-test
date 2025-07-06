import React from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

/**
 * Minimal LaTeX renderer that preserves inline flow
 * @param {string} text - Text with potential LaTeX
 * @returns {React.ReactNode} - Processed content with proper inline/block rendering
 */
export function renderSimpleLatex(text) {
  if (!text || typeof text !== 'string') {
    return text || '';
  }
  
  // Don't process if no dollar signs
  if (!text.includes('$')) {
    return text;
  }
  
  const result = [];
  
  // Split by line breaks first
  const lines = text.split('\n');
  
  lines.forEach((line, lineIndex) => {
    if (lineIndex > 0) {
      result.push('\n'); // Preserve line breaks
    }
    
    // Process this line for LaTeX
    const processedLine = processLatexInLine(line);
    if (Array.isArray(processedLine)) {
      result.push(...processedLine);
    } else {
      result.push(processedLine);
    }
  });
  
  // Return a single span with whiteSpace: 'pre-wrap' to preserve line breaks
  return <span style={{ whiteSpace: 'pre-wrap' }}>{result}</span>;
}

function processLatexInLine(line) {
  if (!line.includes('$')) {
    return line;
  }
  
  const result = [];
  let current = line;
  
  // First handle display math ($$...$$)
  while (current.includes('$$')) {
    const startIdx = current.indexOf('$$');
    const endIdx = current.indexOf('$$', startIdx + 2);
    
    if (endIdx === -1) break; // No closing $$
    
    // Add text before $$
    if (startIdx > 0) {
      result.push(...processInlineLatex(current.substring(0, startIdx)));
    }
    
    // Add block math - BlockMath component handles centering
    const mathContent = current.substring(startIdx + 2, endIdx);
    if (mathContent.trim()) {
      result.push(
        <BlockMath 
          key={`block-${result.length}`}
          math={mathContent.trim()}
          renderError={() => <span style={{color: 'red'}}>$$${mathContent}$$</span>}
        />
      );
    }
    
    // Continue with remaining text
    current = current.substring(endIdx + 2);
  }
  
  // Process remaining text for inline math
  if (current) {
    result.push(...processInlineLatex(current));
  }
  
  return result.length === 1 ? result[0] : result;
}

function processInlineLatex(text) {
  if (!text.includes('$')) {
    return [text];
  }
  
  const result = [];
  const parts = text.split('$');
  
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      // Regular text
      if (parts[i]) {
        result.push(parts[i]);
      }
    } else {
      // Inline math - FORCE INLINE with explicit styling
      const mathContent = parts[i];
      if (mathContent) {
        result.push(
          <InlineMath 
            key={`inline-${result.length}`}
            math={mathContent}
            renderError={() => <span style={{color: 'red'}}>${mathContent}$</span>}
          />
        );
      }
    }
  }
  
  return result;
}

export default renderSimpleLatex;
