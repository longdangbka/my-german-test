/**
 * Question parsing service - handles loading and parsing of questions from markdown
 */

import { extractContentElements } from '../utils/contentExtractor.js';
import { PATTERNS, QUESTION_TYPES, PATHS, parseClozeMarkers } from '../../../shared/constants/index.js';
import { getVaultPath } from '../../../utils/testUtils';
import { extractMatches, normalizeText } from '../../../shared/utils/index.js';

/**
 * Load question groups from markdown files
 * @param {AbortSignal} signal - Abort signal for cancellation
 * @returns {Promise<Array>} Array of question groups
 */
export async function loadQuestionGroups(signal) {
  try {
    let text;
    
    // Check if we're in Electron environment and use IPC
    if (window.electron && window.electron.readVaultFile) {
      try {
        console.log('Loading Question-Sample.md via IPC');
        text = await window.electron.readVaultFile('Question-Sample.md');
        if (!text) {
          throw new Error('File not found or empty');
        }
      } catch (error) {
        console.error('Error loading via IPC:', error);
        // Fall through to HTTP fetch
      }
    }
    
    // Fallback to HTTP fetch if IPC failed or in web environment
    if (!text) {
      const response = await fetch(`${getVaultPath()}Question-Sample.md`, { signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      text = await response.text();
    }
    
    const groups = parseMarkdownToGroups(text);
    return groups;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }
    console.error('Failed to load questions:', error);
    throw new Error('Failed to load question data');
  }
}

/**
 * Parse markdown content into question groups
 * @param {string} markdown - Raw markdown content
 * @returns {Array} Parsed question groups
 */
function parseMarkdownToGroups(markdown) {
  const groups = [];
  const sections = markdown.split(/^###\s+/m).filter(Boolean);
  
  let groupNum = 1;
  
  for (const section of sections) {
    const lines = section.split('\n');
    const title = lines[0]?.trim() || `Group ${groupNum}`;
    
    // Extract transcript if present
    const transcriptMatch = section.match(/#### Transcript\s*\n([\s\S]*?)(?=####|$)/);
    const transcript = transcriptMatch ? transcriptMatch[1].trim() : '';
    
    // Extract questions
    const questionsMatch = section.match(/#### Questions\s*\n([\s\S]*?)$/);
    const questionsText = questionsMatch ? questionsMatch[1] : '';
    
    const questions = parseQuestions(questionsText, groupNum);
    
    if (questions.length > 0) {
      groups.push({
        title,
        transcript,
        questions
      });
    }
    
    groupNum++;
  }
  
  return groups;
}

/**
 * Parse questions from question text
 * @param {string} text - Question text content
 * @param {number} groupNum - Group number for ID generation
 * @returns {Array} Array of parsed questions
 */
function parseQuestions(text, groupNum) {
  const questions = [];
  const questionBlocks = text.split(/--- start-question/).filter(Boolean);
  
  questionBlocks.forEach((block, idx) => {
    const endIndex = block.indexOf('--- end-question');
    if (endIndex === -1) return;
    
    const questionText = block.substring(0, endIndex).trim();
    const question = parseIndividualQuestion(questionText, groupNum, idx);
    
    if (question) {
      questions.push(question);
    }
  });
  
  return questions;
}

/**
 * Parse an individual question from its text block
 * @param {string} text - Question text block
 * @param {number} groupNum - Group number
 * @param {number} questionIndex - Question index within group
 * @returns {Object|null} Parsed question or null if invalid
 */
function parseIndividualQuestion(text, groupNum, questionIndex) {
  const lines = text.split('\n');
  
  // Extract type
  const typeLine = lines.find(line => line.startsWith('TYPE:'));
  if (!typeLine) return null;
  
  const type = typeLine.replace('TYPE:', '').trim();
  
  // Extract sections
  const qMatch = text.match(/Q:\s*\n([\s\S]*?)(?=\nA:|$)/);
  const aMatch = text.match(/A:\s*(.+)/);
  const eMatch = text.match(/E:\s*\n([\s\S]*?)$/);
  
  const rawQ = qMatch ? qMatch[1].trim() : '';
  const answerText = aMatch ? aMatch[1].trim() : '';
  const explanationText = eMatch ? eMatch[1].trim() : '';
  
  if (!rawQ) return null;
  
  const questionId = `g${groupNum}_q${questionIndex + 1}`;
  
  // Parse based on question type
  switch (type) {
    case QUESTION_TYPES.TRUE_FALSE:
      return parseTrueFalseQuestion(questionId, rawQ, answerText, explanationText);
    
    case QUESTION_TYPES.CLOZE:
      return parseClozeQuestion(questionId, rawQ, explanationText);
    
    default:
      console.warn(`Unknown question type: ${type}`);
      return null;
  }
}

/**
 * Parse a True/False question
 * @param {string} id - Question ID
 * @param {string} questionText - Question text
 * @param {string} answerText - Answer text
 * @param {string} explanationText - Explanation text
 * @returns {Object} Parsed True/False question
 */
function parseTrueFalseQuestion(id, questionText, answerText, explanationText) {
  const { orderedElements, images, codeBlocks, latexBlocks, htmlTables } = extractContentElements(questionText);
  const explanationElements = explanationText ? extractContentElements(explanationText) : { orderedElements: [] };
  
  return {
    id,
    type: QUESTION_TYPES.TRUE_FALSE,
    text: questionText,
    answer: answerText,
    explanation: explanationText,
    orderedElements,
    explanationOrderedElements: explanationElements.orderedElements,
    images,
    codeBlocks,
    latexBlocks,
    htmlTables,
  };
}

/**
 * Parse a Cloze (fill-in-the-blank) question
 * @param {string} id - Question ID
 * @param {string} questionText - Question text
 * @param {string} explanationText - Explanation text
 * @returns {Object} Parsed Cloze question
 */
function parseClozeQuestion(id, questionText, explanationText) {
  console.log('🔍 parseClozeQuestion - Input:', { id, questionText, explanationText });
  
  // Extract cloze blanks from the original raw content using the new parser
  const clozeMarkers = parseClozeMarkers(questionText);
  console.log('🔍 parseClozeQuestion - Found cloze markers:', clozeMarkers);
  
  const blanks = clozeMarkers.map(marker => marker.content);
  console.log('🔍 parseClozeQuestion - Extracted blanks:', blanks);
  
  // Process content elements
  const { orderedElements, images, codeBlocks, latexBlocks, htmlTables } = extractContentElements(questionText);
  console.log('🔍 parseClozeQuestion - Extracted elements:', orderedElements);
  
  // Replace cloze markers with blanks in text elements
  const processedOrderedElements = orderedElements.map(element => {
    if (element.type === 'text') {
      let processedContent = element.content;
      const elementMarkers = parseClozeMarkers(processedContent);
      console.log(`🔍 parseClozeQuestion - Processing text element. Original: "${processedContent}", markers:`, elementMarkers);
      // Replace from end to start to maintain positions
      for (let i = elementMarkers.length - 1; i >= 0; i--) {
        const marker = elementMarkers[i];
        processedContent = processedContent.slice(0, marker.start) + '_____' + processedContent.slice(marker.end);
      }
      console.log(`🔍 parseClozeQuestion - Processed text element: "${processedContent}"`);
      return { ...element, content: processedContent };
    }
    return element;
  });
  
  console.log('🔍 parseClozeQuestion - Final processed elements:', processedOrderedElements);
  
  // Process main text for backward compatibility
  let processedText = questionText;
  const textMarkers = parseClozeMarkers(processedText);
  // Replace from end to start to maintain positions
  for (let i = textMarkers.length - 1; i >= 0; i--) {
    const marker = textMarkers[i];
    processedText = processedText.slice(0, marker.start) + '_____' + processedText.slice(marker.end);
  }
  
  const explanationElements = explanationText ? extractContentElements(explanationText) : { orderedElements: [] };
  
  return {
    id,
    type: QUESTION_TYPES.CLOZE,
    text: processedText,
    blanks,
    explanation: explanationText,
    orderedElements: processedOrderedElements,
    explanationOrderedElements: explanationElements.orderedElements,
    images,
    codeBlocks,
    latexBlocks,
    htmlTables,
  };
}

export default {
  loadQuestionGroups,
};
