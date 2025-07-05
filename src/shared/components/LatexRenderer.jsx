import React from 'react';
import { InlineMath, BlockMath } from 'react-katex';

/**
 * Renders LaTeX content with proper math delimiters
 * @param {Object} props - Component props
 * @param {string} props.latex - LaTeX content to render
 * @param {string} props.type - Type of LaTeX ('inline' or 'display')
 * @param {string} props.className - Additional CSS classes
 */
export default function LatexRenderer({ latex, type = 'inline', className = '' }) {
  if (!latex) return null;

  const trimmedLatex = latex.trim();
  
  if (!trimmedLatex) return null;

  try {
    if (type === 'display') {
      return <BlockMath math={trimmedLatex} className={className} />;
    } else {
      return <InlineMath math={trimmedLatex} className={className} />;
    }
  } catch (error) {
    console.warn('LaTeX rendering error:', error);
    return <span className={`text-red-500 ${className}`}>LaTeX Error: {trimmedLatex}</span>;
  }
}
