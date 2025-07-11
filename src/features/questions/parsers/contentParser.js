// contentParser.js
// Centralized content parsing with normalized AST output

import { validateClozeText, toSequentialBlanks } from '../../cloze';

const DEBUG = process.env.NODE_ENV === 'development';

// Centralized regex patterns compiled once
const PATTERNS = {
  image: /!\[\[([^\]]+)\]\]/g,
  codeBlock: /```([\w-]*)\r?\n([\s\S]*?)```/g,
  table: /(^\|.+\|\r?\n\|[- :|]+\|\r?\n(?:\|.*\|\r?\n?)+)/gm,
  latexDisplay: /\$\$([\s\S]+?)\$\$/g,
  latexInline: /\$([^$\n]+?)\$/g
};

/**
 * Parses content preserving order of all elements (text, images, code, LaTeX, tables)
 * @param {string} text - The content to parse
 * @param {boolean} isCloze - Whether this is a cloze question
 * @returns {Object} Parsed elements and LaTeX placeholders
 */
export function parseContentWithOrder(text, isCloze = false) {
  const elements = [];
  let remaining = text;

  if (DEBUG) {
    console.log('🔍 PARSE ORDER - Processing text:', text);
    console.log('🔍 PARSE ORDER - Is cloze question:', isCloze);
  }
  
  // For CLOZE questions, validate and process cloze markers first
  if (isCloze) {
    const validation = validateClozeText(text);
    if (DEBUG) console.log('🔍 PARSE ORDER - Cloze validation:', validation);
    
    // Convert cloze markers to sequential blanks before processing LaTeX
    remaining = toSequentialBlanks(remaining);
    if (DEBUG) console.log('🔍 PARSE ORDER - After cloze processing:', remaining);
  }

  const { matches, latexPlaceholders } = findAllMatches(remaining, isCloze);
  
  // Process matches in order, extracting text between them
  let currentPos = 0;

  matches.forEach(({ type, match, start, end, content }) => {
    // Add text before this match
    if (start > currentPos) {
      const textBefore = remaining.slice(currentPos, start);
      if (textBefore.trim() || textBefore.includes('\n')) {
        elements.push({ type: 'text', content: textBefore });
      }
    }

    // Add the matched element
    elements.push(createElementFromMatch(type, match, content, isCloze, latexPlaceholders));
    currentPos = end;
  });

  // Add remaining text
  if (currentPos < remaining.length) {
    const remainingText = remaining.slice(currentPos);
    if (remainingText.trim() || remainingText.includes('\n')) {
      elements.push({ type: 'text', content: remainingText });
    }
  }

  return { elements, latexPlaceholders: latexPlaceholders.placeholders };
}

/**
 * Finds all content matches with their positions, excluding overlapping ones
 * @param {string} text - Text to search in
 * @param {boolean} isCloze - Whether this is a cloze question
 * @returns {Object} Non-overlapping matches and LaTeX placeholders
 */
function findAllMatches(text, isCloze) {
  const allMatches = [];
  const latexPlaceholders = { placeholders: [], index: 0 };

  // Find all matches with their positions
  Object.entries(PATTERNS).forEach(([type, regex]) => {
    let match;
    const regexClone = new RegExp(regex.source, regex.flags);
    while ((match = regexClone.exec(text)) !== null) {
      allMatches.push({
        type,
        match,
        start: match.index,
        end: match.index + match[0].length,
        content: match[0]
      });
    }
  });

  // Sort by position and remove overlapping matches
  allMatches.sort((a, b) => a.start !== b.start ? a.start - b.start : b.end - a.end);
  
  const nonOverlappingMatches = [];
  for (const currentMatch of allMatches) {
    const hasOverlap = nonOverlappingMatches.some(existing => 
      (currentMatch.start < existing.end && currentMatch.end > existing.start)
    );
    if (!hasOverlap) {
      nonOverlappingMatches.push(currentMatch);
    }
  }

  // Sort again by position for processing
  nonOverlappingMatches.sort((a, b) => a.start - b.start);

  return { matches: nonOverlappingMatches, latexPlaceholders };
}

/**
 * Creates an element from a regex match
 * @param {string} type - Element type
 * @param {Array} match - Regex match array
 * @param {string} content - Full matched content
 * @param {boolean} isCloze - Whether this is a cloze question
 * @param {Object} latexPlaceholders - LaTeX placeholder tracker
 * @returns {Object} Element object
 */
function createElementFromMatch(type, match, content, isCloze, latexPlaceholders) {
  switch (type) {
    case 'image':
      return { type: 'image', content: match[1] };
    
    case 'codeBlock':
      return { type: 'codeBlock', content: { lang: match[1], code: match[2] } };
    
    case 'table':
      return { type: 'table', content };
    
    case 'latexDisplay':
      return handleLatexMatch(content, match[1], 'display', isCloze, latexPlaceholders);
    
    case 'latexInline':
      return handleLatexMatch(content, match[1], 'inline', isCloze, latexPlaceholders);
    
    default:
      return { type: 'text', content };
  }
}

/**
 * Handles LaTeX matches, creating placeholders for cloze questions
 * @param {string} content - Full matched content
 * @param {string} latex - LaTeX content
 * @param {string} latexType - 'display' or 'inline'
 * @param {boolean} isCloze - Whether this is a cloze question
 * @param {Object} latexPlaceholders - LaTeX placeholder tracker
 * @returns {Object} Element object
 */
function handleLatexMatch(content, latex, latexType, isCloze, latexPlaceholders) {
  if (isCloze) {
    // For cloze, replace with placeholder
    const placeholder = `__LATEX_${latexType.toUpperCase()}_${latexPlaceholders.index}__`;
    latexPlaceholders.placeholders.push({ 
      placeholder, 
      original: content, 
      latex, 
      latexType 
    });
    latexPlaceholders.index++;
    return { type: 'latexPlaceholder', content: placeholder };
  } else {
    return { type: 'latex', content: { latex, latexType } };
  }
}

/**
 * Legacy function for backward compatibility
 * @param {string} text - Text to extract from
 * @param {boolean} isCloze - Whether this is a cloze question
 * @returns {Object} Extracted content in legacy format
 */
export function extractContentElements(text, isCloze = false) {
  const { elements, latexPlaceholders } = parseContentWithOrder(text, isCloze);
  
  // Convert to old format for compatibility
  let cleanedText = '';
  const images = [];
  const codeBlocks = [];
  const latexBlocks = [];
  const htmlTables = [];

  elements.forEach(element => {
  switch (element.type) {
    case 'text':
    case 'latexPlaceholder':
      cleanedText += element.content + ' ';
      break;
    case 'image':
      images.push(element.content);
      break;
    case 'codeBlock':
      codeBlocks.push(element.content);
      break;
    case 'table':
      if (isCloze) {
        cleanedText += element.content + ' ';
        htmlTables.push(mdTableToHtml(element.content));
        element.content = mdTableToHtml(element.content);
      } else {
        htmlTables.push(mdTableToHtml(element.content));
        element.content = mdTableToHtml(element.content);
      }
      break;
    case 'latex':
      latexBlocks.push(element.content);
      break;
    default:
      // Unknown element type, skip
      break;
  }
  });

  return {
    text: cleanedText.trim(),
    images,
    codeBlocks,
    latexBlocks,
    htmlTables,
    latexPlaceholders,
    orderedElements: elements
  };
}

/**
 * Converts a markdown table to HTML
 * @param {string} md - Markdown table content
 * @returns {string} HTML table
 */
function mdTableToHtml(md) {
  const lines = md.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return '';
  
  // Header row
  const headers = lines[0]
    .trim()
    .split('|')
    .slice(1, -1)
    .map(h => h.trim());
  
  // Data rows start after the separator line
  const rows = lines
    .slice(2)
    .map(line =>
      line
        .trim()
        .split('|')
        .slice(1, -1)
        .map(cell => cell.trim())
    );

  let html = '<table style="border-collapse: collapse; border: 1px solid black; width: 100%; text-align: left; font-size: 14px;">';
  html += '<thead style="background-color: #f2f2f2;"><tr>';
  headers.forEach(h => {
    html += `<th style="border: 1px solid black; padding: 10px;">${h}</th>`;
  });
  html += '</tr></thead><tbody>';

  rows.forEach(cells => {
    html += '<tr>';
    cells.forEach(c => {
      html += `<td style="border: 1px solid black; padding: 10px;">${c}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  return html;
}
