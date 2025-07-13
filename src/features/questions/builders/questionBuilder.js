// questionBuilder.js
// Unified question building logic to eliminate redundancy

import { 
  findCloze, 
  replaceWithBlanks,
  extractAllClozeBlanks,
  ensureClozeQuestion,
  processClozeElements,
  hasCloze
} from '../../cloze/clozeModule';

const DEBUG = process.env.NODE_ENV === 'development';

/**
 * Builds a question object based on type and extracted content
 * @param {Object} params - Question parameters
 * @param {string} params.id - Question ID
 * @param {string} params.type - Question type (CLOZE, T-F, SHORT, AUDIO)
 * @param {string} params.rawQ - Raw question text
 * @param {string} params.rawE - Raw explanation text
 * @param {string} params.answer - Answer text
 * @param {Array} params.images - Question images
 * @param {Array} params.codeBlocks - Question code blocks
 * @param {Array} params.latexBlocks - Question LaTeX blocks
 * @param {Array} params.htmlTables - Question HTML tables
 * @param {Array} params.orderedElements - Ordered content elements
 * @param {Array} params.latexPlaceholders - LaTeX placeholders for cloze
 * @param {Array} params.explanationImages - Explanation images
 * @param {Array} params.explanationCodeBlocks - Explanation code blocks
 * @param {Array} params.explanationLatexBlocks - Explanation LaTeX blocks
 * @param {Array} params.explanationHtmlTables - Explanation HTML tables
 * @param {Array} params.explanationOrderedElements - Explanation ordered elements
 * @param {Object} params.extras - Any additional type-specific properties
 * @returns {Object} Built question object
 */
export function buildQuestion({
  id,
  type,
  rawQ,
  rawE,
  answer = '',
  images = [],
  codeBlocks = [],
  latexBlocks = [],
  htmlTables = [],
  orderedElements = [],
  latexPlaceholders = [],
  explanationImages = [],
  explanationCodeBlocks = [],
  explanationLatexBlocks = [],
  explanationHtmlTables = [],
  explanationOrderedElements = [],
  extras = {}
}) {
  // Base question structure
  const baseQuestion = {
    id,
    type,
    images,
    codeBlocks,
    latexBlocks,
    htmlTables,
    orderedElements,
    explanationImages,
    explanationCodeBlocks,
    explanationLatexBlocks,
    explanationHtmlTables,
    explanationOrderedElements,
    // Store raw content for bookmarking
    rawText: rawQ,
    rawExplanation: rawE,
    ...extras
  };

  // Type-specific processing
  switch (type) {
    case 'AUDIO':
      return buildAudioQuestion(baseQuestion, extras);
    
    case 'CLOZE':
      return buildClozeQuestion(baseQuestion, rawQ);
    
    case 'T-F':
    case 'SHORT':
      return buildStandardQuestion(baseQuestion, rawQ, rawE, answer);
    
    default:
      throw new Error(`Unknown question type: ${type}`);
  }
}

/**
 * Builds an AUDIO question
 * @param {Object} baseQuestion - Base question structure
 * @param {Object} extras - Additional properties like audioFile
 * @returns {Object} AUDIO question
 */
function buildAudioQuestion(baseQuestion, extras) {
  return {
    ...baseQuestion,
    text: 'AUDIO:',
    ...extras
  };
}

/**
 * Builds a CLOZE question with proper blank extraction and processing
 * @param {Object} baseQuestion - Base question structure
 * @param {string} rawQ - Raw question text
 * @returns {Object} CLOZE question
 */
function buildClozeQuestion(baseQuestion, rawQ) {
  if (DEBUG) console.log('🔍 QUESTION BUILDER - Processing CLOZE question. Raw Q:', rawQ);
  
  // Use centralized cloze utilities for consistent processing
  const clozeData = findCloze(rawQ);
  if (DEBUG) console.log('🔍 QUESTION BUILDER - Found cloze markers:', clozeData);
  
  // Extract blanks individually for proper form handling
  const { blanks, latexPlaceholders } = extractAllClozeBlanks(rawQ);
  if (DEBUG) console.log('🔍 QUESTION BUILDER - Extracted blanks:', blanks);

  // Prepare the blanks and LaTeX data
  let finalBlanks = blanks;
  let finalLatexPlaceholders = latexPlaceholders;

  // Critical fix: If no blanks found but cloze markers exist, ensure we create blanks
  if (blanks.length === 0 && hasCloze(rawQ)) {
    if (DEBUG) console.warn('🚨 QUESTION BUILDER - Found cloze markers but no blanks extracted!');
    finalBlanks = clozeData.map(cloze => cloze.content);
    if (DEBUG) console.log('🔍 QUESTION BUILDER - Fallback blanks:', finalBlanks);
  }

  // Use centralized replaceWithBlanks function for consistent display
  let text = replaceWithBlanks(rawQ);
  if (DEBUG) console.log('🔍 QUESTION BUILDER - Processed text with blanks:', text);

  // Process ordered elements using centralized function
  const processedOrderedElements = processClozeElements(baseQuestion.orderedElements, { 
    stripMarkers: false, 
    toSequential: true 
  });

  // Create the CLOZE question object
  let clozeQuestion = {
    ...baseQuestion,
    text,
    blanks: finalBlanks,
    orderedElements: processedOrderedElements,
    latexPlaceholders: finalLatexPlaceholders || [],
  };

  // Ensure the question has a valid blanks array using centralized function
  clozeQuestion = ensureClozeQuestion(clozeQuestion);
  
  if (DEBUG) {
    console.log('🔍 QUESTION BUILDER - Final ensured CLOZE question:', {
      id: clozeQuestion.id,
      blanksCount: clozeQuestion.blanks?.length || 0,
      blanks: clozeQuestion.blanks
    });
  }

  return clozeQuestion;
}

/**
 * Builds a standard question (T-F or SHORT)
 * @param {Object} baseQuestion - Base question structure
 * @param {string} rawQ - Raw question text
 * @param {string} rawE - Raw explanation text
 * @param {string} answer - Answer text
 * @returns {Object} Standard question
 */
function buildStandardQuestion(baseQuestion, rawQ, rawE, answer) {
  // For standard questions, the text is extracted during content parsing
  // and stored in the orderedElements, so we need to reconstruct it
  let text = '';
  baseQuestion.orderedElements.forEach(element => {
    if (element.type === 'text') {
      text += element.content + ' ';
    }
  });
  
  return {
    ...baseQuestion,
    text: text.trim() || rawQ, // Fallback to rawQ if no text extracted
    answer,
    explanation: rawE,
  };
}

/**
 * Restores LaTeX in cloze text and blanks
 * @param {string} text - Processed text with blanks
 * @param {Array} blanks - Array of blank answers
 * @param {Array} processedOrderedElements - Processed ordered elements
 * @param {Array} latexPlaceholders - LaTeX placeholders
 * @returns {Object} Text and blanks with restored LaTeX
 */
function restoreLatexInCloze(text, blanks, processedOrderedElements, latexPlaceholders) {
  let processedText = text;
  let processedBlanks = [...blanks];

  latexPlaceholders.forEach(({ placeholder, original }) => {
    processedText = processedText.replace(placeholder, original);
    
    // Restore LaTeX in processed elements
    processedOrderedElements.forEach(element => {
      if (element.type === 'text' && element.content) {
        element.content = element.content.replace(placeholder, original);
      }
    });
    
    // Restore LaTeX in blanks
    processedBlanks = processedBlanks.map(blank => 
      blank.replace(placeholder, original)
    );
  });

  return { text: processedText, blanks: processedBlanks };
}
