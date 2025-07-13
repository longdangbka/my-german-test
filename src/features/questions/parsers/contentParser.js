// contentParser.js
// Centralized content parsing with normalized AST output

import { validateClozeText, toSequentialBlanks } from '../../cloze/clozeModule';

const DEBUG = process.env.NODE_ENV === 'development';

// Centralized regex patterns compiled once
const PATTERNS = {
  image: /!\[\[([^\]]+)\]\]/g,
  codeBlock: /```([\w-]*)\r?\n([\s\S]*?)```/g,
  table: /(^\|.+\|\r?\n\|[- :|]+\|\r?\n(?:\|.*\|\r?\n?)+)/gm,
  latexDisplay: /\$\$([\s\S]+?)\$\$/g,
  latexInline: /\$([^$\n]+?)\$/g,
  cloze: /\{\{c(\d+)::([^}]+)\}\}/g
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
  
  // For CLOZE questions, validate but don't convert to blanks yet
  // We need to preserve LaTeX content within cloze markers for proper rendering
  if (isCloze) {
    const validation = validateClozeText(text);
    if (DEBUG) console.log('🔍 PARSE ORDER - Cloze validation:', validation);
    if (DEBUG) console.log('🔍 PARSE ORDER - Preserving cloze markers with LaTeX for now');
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

  // For cloze questions, find cloze markers first to prioritize them
  const clozeMatches = [];
  if (isCloze) {
    let match;
    const clozeRegex = new RegExp(PATTERNS.cloze.source, PATTERNS.cloze.flags);
    while ((match = clozeRegex.exec(text)) !== null) {
      clozeMatches.push({
        type: 'cloze',
        match,
        start: match.index,
        end: match.index + match[0].length,
        content: match[0]
      });
    }
  }

  // Find all other matches with their positions
  Object.entries(PATTERNS).forEach(([type, regex]) => {
    // Skip cloze pattern if already processed
    if (isCloze && type === 'cloze') return;
    
    let match;
    const regexClone = new RegExp(regex.source, regex.flags);
    while ((match = regexClone.exec(text)) !== null) {
      const matchData = {
        type,
        match,
        start: match.index,
        end: match.index + match[0].length,
        content: match[0]
      };
      
      // For cloze questions, check if this match is inside any cloze marker
      if (isCloze) {
        const isInsideCloze = clozeMatches.some(clozeMatch => 
          matchData.start >= clozeMatch.start && matchData.end <= clozeMatch.end
        );
        if (!isInsideCloze) {
          allMatches.push(matchData);
        }
      } else {
        allMatches.push(matchData);
      }
    }
  });

  // Add cloze matches for cloze questions
  if (isCloze) {
    allMatches.push(...clozeMatches);
  }

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
    
    case 'cloze':
      return handleClozeMatch(content, match, latexPlaceholders);
    
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
 * Handles cloze matches, processing LaTeX content within them
 * @param {string} content - Full matched cloze content
 * @param {Array} match - Regex match array [fullMatch, id, innerContent]
 * @param {Object} latexPlaceholders - LaTeX placeholder tracker
 * @returns {Object} Element object
 */
function handleClozeMatch(content, match, latexPlaceholders) {
  const clozeId = match[1];
  const innerContent = match[2];
  
  // Process LaTeX within the cloze content
  const processedContent = processLatexInCloze(innerContent, latexPlaceholders);
  
  return { 
    type: 'cloze', 
    content: { 
      id: clozeId, 
      content: processedContent,
      original: content
    } 
  };
}

/**
 * Processes LaTeX content within cloze markers
 * @param {string} content - Content inside cloze marker
 * @param {Object} latexPlaceholders - LaTeX placeholder tracker
 * @returns {string} Content with LaTeX converted to placeholders
 */
function processLatexInCloze(content, latexPlaceholders) {
  // Process display LaTeX first (higher priority)
  let processed = content.replace(PATTERNS.latexDisplay, (fullMatch, latex) => {
    const placeholder = `__LATEX_DISPLAY_${latexPlaceholders.index}__`;
    latexPlaceholders.placeholders.push({ 
      placeholder, 
      original: fullMatch, 
      latex, 
      latexType: 'display' 
    });
    latexPlaceholders.index++;
    return placeholder;
  });
  
  // Process inline LaTeX
  processed = processed.replace(PATTERNS.latexInline, (fullMatch, latex) => {
    const placeholder = `__LATEX_INLINE_${latexPlaceholders.index}__`;
    latexPlaceholders.placeholders.push({ 
      placeholder, 
      original: fullMatch, 
      latex, 
      latexType: 'inline' 
    });
    latexPlaceholders.index++;
    return placeholder;
  });
  
  return processed;
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
    case 'cloze':
      // For cloze elements, reconstruct them with the processed LaTeX content
      const clozeContent = element.content;
      const reconstructedCloze = `{{c${clozeContent.id}::${clozeContent.content}}}`;
      cleanedText += reconstructedCloze + ' ';
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
