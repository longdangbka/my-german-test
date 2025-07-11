/**
 * Content conversion utilities for Anki
 * Handles LaTeX, code blocks, tables, and markdown to HTML conversion
 */

import { REGEX_PATTERNS, DEBUG_CONFIG } from './config.js';

/**
 * Convert LaTeX to Anki-compatible format
 * @param {string} latex - LaTeX expression
 * @param {boolean} isDisplay - Whether it's display math or inline
 * @returns {string} - Anki-compatible LaTeX
 */
export function convertLatexForAnki(latex, isDisplay = false) {
  if (!latex) return '';
  
  // Keep LaTeX in original format for Anki
  return isDisplay ? `$$${latex}$$` : `$${latex}$`;
}

/**
 * Convert code block to HTML for Anki
 * @param {string} code - Code content
 * @param {string} language - Programming language
 * @returns {string} - HTML code block
 */
export function convertCodeBlockToHtml(code, language = '') {
  if (!code) return '';
  
  const formattedCode = code.split('\n').join('\n');
  
  return `<div style="background-color: #f8f8f8; border: 1px solid #ddd; border-radius: 4px; padding: 12px; margin: 8px 0; font-family: 'Courier New', Courier, monospace; white-space: pre-wrap; overflow-x: auto;"><code class="language-${language}">${formattedCode}</code></div>`;
}

/**
 * Process cell content in markdown tables
 * @param {string} cell - Cell content
 * @returns {string} - Processed cell content
 */
function processCellContent(cell) {
  return cell
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // Bold
    .replace(/\*(.*?)\*/g, '<em>$1</em>')              // Italic
    .replace(/`([^`]+)`/g, '<code>$1</code>');         // Inline code
}

/**
 * Convert markdown table to HTML table for Anki
 * @param {string} tableMarkdown - Markdown table
 * @returns {string} - HTML table
 */
export function convertTableToHtml(tableMarkdown) {
  if (!tableMarkdown) return '';
  
  const lines = tableMarkdown.trim().split('\n').filter(line => line.trim());
  if (lines.length < 2) return tableMarkdown;
  
  // Find the separator line
  let separatorIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('---') || lines[i].includes(':--') || lines[i].includes('--:')) {
      separatorIndex = i;
      break;
    }
  }
  
  if (separatorIndex === -1) {
    return tableMarkdown; // No proper separator found
  }
  
  let html = '<table border="1" style="border-collapse: collapse;">';
  
  // Process header (lines before separator)
  if (separatorIndex > 0) {
    html += '<thead>';
    for (let i = 0; i < separatorIndex; i++) {
      const headerCells = lines[i].split('|').map(cell => cell.trim()).filter(cell => cell);
      if (headerCells.length > 0) {
        html += '<tr>';
        headerCells.forEach(cell => {
          html += `<th style="padding: 8px; background-color: #f0f0f0;">${processCellContent(cell)}</th>`;
        });
        html += '</tr>';
      }
    }
    html += '</thead>';
  }
  
  // Process body (lines after separator)
  if (lines.length > separatorIndex + 1) {
    html += '<tbody>';
    for (let i = separatorIndex + 1; i < lines.length; i++) {
      const rowCells = lines[i].split('|').map(cell => cell.trim()).filter(cell => cell);
      if (rowCells.length > 0) {
        html += '<tr>';
        rowCells.forEach(cell => {
          html += `<td style="padding: 8px;">${processCellContent(cell)}</td>`;
        });
        html += '</tr>';
      }
    }
    html += '</tbody>';
  }
  
  html += '</table>';
  return html;
}

/**
 * Process LaTeX in text while avoiding LaTeX inside cloze deletions
 * @param {string} text - Text to process
 * @param {RegExp} latexRegex - Regex to match LaTeX
 * @param {boolean} isDisplay - Whether it's display math
 * @returns {string} - Text with LaTeX processed, but cloze contents preserved
 */
export function processLatexAvoidingClozes(text, latexRegex, isDisplay) {
  if (!text) return text;
  
  // Extract all cloze deletions and their positions
  const clozeRegex = /\{\{c(\d+)?(::|:\[)[^\}]+\}\}/g;
  const clozes = [];
  let match;
  
  while ((match = clozeRegex.exec(text)) !== null) {
    clozes.push({
      start: match.index,
      end: match.index + match[0].length,
      content: match[0]
    });
  }
  
  // Process LaTeX, but skip any matches that are inside cloze deletions
  return text.replace(latexRegex, (latexMatch, latex, offset) => {
    const matchStart = offset;
    const matchEnd = offset + latexMatch.length;
    
    // Check if this LaTeX match is inside any cloze deletion
    for (const cloze of clozes) {
      if (matchStart >= cloze.start && matchEnd <= cloze.end) {
        return latexMatch; // Don't process LaTeX inside cloze
      }
    }
    
    return convertLatexForAnki(latex.trim(), isDisplay);
  });
}

/**
 * Process markdown content with structured elements (from question parser)
 * @param {Array} orderedElements - Structured elements from question parser
 * @param {Object} mediaMap - Map of original to processed media filenames
 * @param {boolean} preserveTables - Whether to preserve tables as markdown
 * @returns {string} - Processed HTML content
 */
export function processStructuredContent(orderedElements, mediaMap = {}, preserveTables = true) {
  let html = '';
  
  for (const element of orderedElements) {
    switch (element.type) {
      case 'text':
        // Process basic markdown in text
        let textHtml = element.content
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/`([^`]+)`/g, '<code>$1</code>');
        html += textHtml;
        break;
        
      case 'latex':
        if (element.content?.latex) {
          const isDisplay = element.content.latexType === 'display';
          html += convertLatexForAnki(element.content.latex, isDisplay);
        }
        break;
        
      case 'image':
        const imageName = element.content;
        const processedImageName = mediaMap[imageName] || imageName;
        html += `<img src="${processedImageName}" alt="Question Image" style="max-width: 500px; height: auto;">`;
        break;
        
      case 'codeBlock':
        if (element.content?.code) {
          html += convertCodeBlockToHtml(element.content.code, element.content.lang);
        }
        break;
        
      case 'table':
        if (preserveTables) {
          html += element.content; // Keep as markdown
        } else {
          html += convertTableToHtml(element.content);
        }
        break;
        
      case 'latexPlaceholder':
        html += element.content;
        break;
        
      default:
        html += element.content || '';
        break;
    }
  }
  
  return html;
}

/**
 * Process markdown content with regex-based approach (fallback)
 * @param {string} content - Markdown content
 * @param {Object} mediaMap - Map of original to processed media filenames
 * @param {boolean} preserveTables - Whether to preserve tables as markdown
 * @returns {string} - Processed HTML content
 */
export function processRegexContent(content, mediaMap = {}, preserveTables = true) {
  let html = content;
  
  // Process LaTeX (avoiding cloze deletions)
  html = processLatexAvoidingClozes(html, REGEX_PATTERNS.LATEX_DISPLAY, true);
  html = processLatexAvoidingClozes(html, REGEX_PATTERNS.LATEX_INLINE, false);
  
  // Process code blocks
  html = html.replace(REGEX_PATTERNS.CODE_BLOCKS, (match, lang, code) => {
    return convertCodeBlockToHtml(code.trim(), lang);
  });
  
  // Process inline code
  html = html.replace(REGEX_PATTERNS.INLINE_CODE, '<code>$1</code>');
  
  // Process tables
  if (!preserveTables) {
    html = html.replace(REGEX_PATTERNS.TABLE, (match) => {
      return convertTableToHtml(match.trim());
    });
  }
  
  // Process basic markdown
  html = html
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n\s*\n/g, '<br><br>')
    .replace(/\n/g, '<br>');
  
  // Clean up extra spaces and line breaks
  html = html
    .replace(/\s+/g, ' ')
    .replace(/(<br>\s*){3,}/g, '<br><br>')
    .trim();
    
  return html;
}
