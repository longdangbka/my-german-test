/**
 * Content extraction utilities for parsing markdown content
 */

import { PATTERNS, PATHS } from '../../shared/constants/index.js';
import { extractMatches, decodeHtmlEntities } from '../../shared/utils/index.js';

/**
 * Extract all content elements from text and preserve their order
 * @param {string} text - Raw text content
 * @returns {Object} Extracted content with ordered elements
 */
export function extractContentElements(text) {
  if (!text) return { orderedElements: [], images: [], codeBlocks: [], latexBlocks: [], htmlTables: [] };

  const orderedElements = [];
  const images = [];
  const codeBlocks = [];
  const latexBlocks = [];
  const htmlTables = [];
  
  // Create a map to track all content positions
  const contentMap = [];
  
  // Extract images
  const imageMatches = extractMatches(text, PATTERNS.IMAGE_LINK);
  imageMatches.forEach(match => {
    const imageName = match.content;
    images.push(imageName);
    contentMap.push({
      type: 'image',
      index: match.index,
      content: imageName,
      length: match.full.length
    });
  });
  
  // Extract code blocks
  const codeMatches = extractMatches(text, PATTERNS.CODE_BLOCK);
  codeMatches.forEach(match => {
    const [, lang = '', code = ''] = match.full.match(PATTERNS.CODE_BLOCK) || [];
    const codeBlock = { lang: lang.trim(), code: code.trim() };
    codeBlocks.push(codeBlock);
    contentMap.push({
      type: 'codeBlock',
      index: match.index,
      content: codeBlock,
      length: match.full.length
    });
  });
  
  // Extract LaTeX display blocks first (longer pattern)
  const displayLatexMatches = extractMatches(text, PATTERNS.LATEX_DISPLAY);
  displayLatexMatches.forEach(match => {
    const latexBlock = { latex: match.content.trim(), latexType: 'display' };
    latexBlocks.push(latexBlock);
    contentMap.push({
      type: 'latex',
      index: match.index,
      content: latexBlock,
      length: match.full.length
    });
  });
  
  // Extract LaTeX inline blocks
  const inlineLatexMatches = extractMatches(text, PATTERNS.LATEX_INLINE);
  inlineLatexMatches.forEach(match => {
    // Skip if this inline LaTeX is part of a display LaTeX block
    const isPartOfDisplay = displayLatexMatches.some(displayMatch => 
      match.index >= displayMatch.index && 
      match.index < displayMatch.index + displayMatch.full.length
    );
    
    if (!isPartOfDisplay) {
      const latexBlock = { latex: match.content.trim(), latexType: 'inline' };
      latexBlocks.push(latexBlock);
      contentMap.push({
        type: 'latex',
        index: match.index,
        content: latexBlock,
        length: match.full.length
      });
    }
  });
  
  // Extract markdown tables
  const tableMatches = extractTableContent(text);
  tableMatches.forEach(match => {
    htmlTables.push(match.html);
    contentMap.push({
      type: 'table',
      index: match.index,
      content: match.html,
      length: match.length
    });
  });
  
  // Sort content by position and create ordered elements
  contentMap.sort((a, b) => a.index - b.index);
  
  // Build ordered elements with text segments
  let currentIndex = 0;
  
  contentMap.forEach(item => {
    // Add text before this element
    if (item.index > currentIndex) {
      const textContent = text.slice(currentIndex, item.index).trim();
      if (textContent) {
        orderedElements.push({
          type: 'text',
          content: textContent
        });
      }
    }
    
    // Add the content element
    orderedElements.push({
      type: item.type,
      content: item.content
    });
    
    currentIndex = item.index + item.length;
  });
  
  // Add remaining text
  if (currentIndex < text.length) {
    const textContent = text.slice(currentIndex).trim();
    if (textContent) {
      orderedElements.push({
        type: 'text',
        content: textContent
      });
    }
  }
  
  // If no special content was found, treat the entire text as a single text element
  if (orderedElements.length === 0 && text.trim()) {
    orderedElements.push({
      type: 'text',
      content: text.trim()
    });
  }
  
  return {
    orderedElements,
    images,
    codeBlocks,
    latexBlocks,
    htmlTables
  };
}

/**
 * Extract markdown tables and convert them to HTML
 * @param {string} text - Text containing markdown tables
 * @returns {Array} Array of table objects with HTML and position info
 */
function extractTableContent(text) {
  const tables = [];
  const lines = text.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check if this line looks like a table row
    if (line.startsWith('|') && line.endsWith('|')) {
      const tableStart = i;
      const tableLines = [line];
      
      // Look for continuation of the table
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j].trim();
        if (nextLine.startsWith('|') && nextLine.endsWith('|')) {
          tableLines.push(nextLine);
        } else if (nextLine === '') {
          // Empty line might be part of table formatting
          continue;
        } else {
          break;
        }
      }
      
      if (tableLines.length >= 2) {
        const html = convertMarkdownTableToHtml(tableLines);
        const startPos = text.indexOf(tableLines[0]);
        const endPos = text.lastIndexOf(tableLines[tableLines.length - 1]) + tableLines[tableLines.length - 1].length;
        
        tables.push({
          html,
          index: startPos,
          length: endPos - startPos
        });
        
        // Skip past this table
        i += tableLines.length - 1;
      }
    }
  }
  
  return tables;
}

/**
 * Convert markdown table to HTML
 * @param {Array<string>} tableLines - Lines containing the markdown table
 * @returns {string} HTML table
 */
function convertMarkdownTableToHtml(tableLines) {
  if (tableLines.length < 2) return '';
  
  const rows = tableLines.map(line => 
    line.split('|').slice(1, -1).map(cell => cell.trim())
  );
  
  // Check if second row is a separator (contains only dashes and spaces)
  const hasSeparator = rows.length > 1 && 
    rows[1].every(cell => /^[\s\-:]*$/.test(cell));
  
  let html = '<table>';
  
  if (hasSeparator && rows.length > 2) {
    // First row is header
    html += '<thead><tr>';
    rows[0].forEach(cell => {
      html += `<th>${cell}</th>`;
    });
    html += '</tr></thead>';
    
    // Remaining rows are body (skip separator)
    html += '<tbody>';
    for (let i = 2; i < rows.length; i++) {
      html += '<tr>';
      rows[i].forEach(cell => {
        html += `<td>${cell}</td>`;
      });
      html += '</tr>';
    }
    html += '</tbody>';
  } else {
    // All rows are body
    html += '<tbody>';
    rows.forEach(row => {
      html += '<tr>';
      row.forEach(cell => {
        html += `<td>${cell}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody>';
  }
  
  html += '</table>';
  return html;
}

export default {
  extractContentElements,
};
