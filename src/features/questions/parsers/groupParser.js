// groupParser.js
// Handles parsing of markdown into question groups

import { extractContentElements } from '../parsers/contentParser.js';
import { buildQuestion } from '../builders/questionBuilder.js';
import { 
  generateQuestionId, 
  extractQuestionId, 
  isValidQuestionId 
} from '../../../shared/utils/questionIdManager.js';

const DEBUG = process.env.NODE_ENV === 'development';

// Compiled regex patterns
const HEADING_REGEX = /^##\s+(.+)$/gm;
const TRANSCRIPT_REGEX = /### Transcript\s*[\r\n]+([\s\S]*?)(?=### Questions|$)/i;
const QUESTIONS_REGEX = /### Questions\s*[\r\n]+([\s\S]*)/i;
// Updated to support both old and new question block formats
const QUESTION_BLOCK_REGEX = /(?:--- start-question[\r\n]+([\s\S]*?)[\r\n]+--- end-question|````ad-question[\r\n]+([\s\S]*?)[\r\n]+````)/g;
const AUDIO_BLOCK_REGEX = /```[\s\S]*?AUDIO:\s*([\s\S]*?)```/im;
const AUDIO_FILE_REGEX = /!\[\[([^\]]+\.(mp3|wav|m4a|ogg|flac))\]\]/i;
const TYPE_REGEX = /^TYPE:\s*(CLOZE|T-F|Short)$/im;
// Updated to support both old and new question end patterns
const QUESTION_TEXT_REGEX = /^Q:\s*([\s\S]*?)(?=\r?\n(?:A:|E:|---\s*end-question|````$))/m;
const ANSWER_REGEX = /^A:\s*([\s\S]*?)$/im;
const EXPLANATION_START_REGEX = /^E:/m;
const AUDIO_SIMPLE_REGEX = /^AUDIO:\s*$/im;
const AUDIO_WITH_FILE_REGEX = /^AUDIO:\s*([\s\S]*?)$/im;

/**
 * Parses standard markdown into question groups
 * @param {string} md - Markdown content
 * @returns {Array} Array of question groups
 */
export function parseStandardMarkdown(md) {
  const groups = [];
  const headings = Array.from(md.matchAll(HEADING_REGEX));

  for (let i = 0; i < headings.length; i++) {
    const group = parseQuestionGroup(md, headings, i);
    if (group) {
      groups.push(group);
    }
  }

  return groups;
}

/**
 * Parses a single question group
 * @param {string} md - Full markdown content
 * @param {Array} headings - Array of heading matches
 * @param {number} index - Current heading index
 * @returns {Object|null} Parsed question group or null
 */
function parseQuestionGroup(md, headings, index) {
  const heading = headings[index];
  const num = heading[1].trim();
  const headingText = heading[0].replace(/^#+\s*/, '').trim();
  const start = heading.index + heading[0].length;
  const end = (index + 1 < headings.length) ? headings[index + 1].index : md.length;
  const block = md.slice(start, end);

  if (DEBUG) console.log(`Processing section: ${num}`);

  // Extract audio information
  const audioInfo = extractAudioInfo(block, num);
  
  // Extract transcript
  const transcript = extractTranscript(block);
  
  // Extract and parse questions
  const questions = extractAndParseQuestions(block, num, audioInfo);

  return {
    id: `g${num}`,
    title: headingText,
    transcript: transcript.text,
    transcriptImages: transcript.images,
    transcriptCodeBlocks: transcript.codeBlocks,
    transcriptLatexBlocks: transcript.latexBlocks,
    transcriptHtmlTables: transcript.htmlTables,
    audioFile: audioInfo.filename,
    questions,
  };
}

/**
 * Extracts audio information from a section block
 * @param {string} block - Section content block
 * @param {string} num - Section number
 * @returns {Object} Audio information
 */
function extractAudioInfo(block, num) {
  let hasAudioBlock = false;
  let audioFilename = null;
  
  const audioBlockMatch = block.match(AUDIO_BLOCK_REGEX);
  if (audioBlockMatch) {
    hasAudioBlock = true;
    if (DEBUG) console.log(`Found AUDIO block in section: ${num}`);
    
    const audioContent = audioBlockMatch[1];
    const audioFileMatch = audioContent.match(AUDIO_FILE_REGEX);
    if (audioFileMatch) {
      audioFilename = audioFileMatch[1];
      if (DEBUG) console.log(`Found audio file reference: ${audioFilename}`);
    }
  }

  return { hasAudioBlock, filename: audioFilename };
}

/**
 * Extracts transcript from a section block
 * @param {string} block - Section content block
 * @returns {Object} Transcript content and elements
 */
function extractTranscript(block) {
  const tMatch = block.match(TRANSCRIPT_REGEX);
  let transcript = '';
  let transcriptElements = { images: [], codeBlocks: [], latexBlocks: [], htmlTables: [] };
  
  if (tMatch) {
    let rawTranscript = tMatch[1].replace(/```/g, '');
    if (rawTranscript.startsWith('\n')) {
      rawTranscript = rawTranscript.slice(1);
    }
    
    const extracted = extractContentElements(rawTranscript);
    transcript = extracted.text;
    transcriptElements = {
      images: extracted.images,
      codeBlocks: extracted.codeBlocks,
      latexBlocks: extracted.latexBlocks,
      htmlTables: extracted.htmlTables
    };
  }

  return { text: transcript, ...transcriptElements };
}

/**
 * Extracts and parses questions from a section block
 * @param {string} block - Section content block
 * @param {string} num - Section number
 * @param {Object} audioInfo - Audio information for the section
 * @returns {Array} Array of parsed questions
 */
function extractAndParseQuestions(block, num, audioInfo) {
  const qMatch = block.match(QUESTIONS_REGEX);
  const questionsSection = qMatch ? qMatch[1] : '';

  const codeBlocks = Array.from(
    questionsSection.matchAll(QUESTION_BLOCK_REGEX),
    m => (m[1] || m[2]).trim() // m[1] for old format, m[2] for new format
  );

  const questions = codeBlocks.map((code, idx) => 
    parseQuestionBlock(code, idx, num)
  ).filter(Boolean);

  // Add implicit AUDIO question if needed
  if (audioInfo.hasAudioBlock && !questions.some(q => q.type === 'AUDIO')) {
    if (DEBUG) console.log(`Adding implicit AUDIO question for section: ${num}`);
    const audioQuestion = buildQuestion({
      id: `g${num}_q0`,
      type: 'AUDIO',
      rawQ: 'AUDIO:',
      rawE: '',
      extras: audioInfo.filename ? { audioFile: audioInfo.filename } : {}
    });
    questions.unshift(audioQuestion);
  }

  return questions;
}

/**
 * Parses a single question block
 * @param {string} code - Question block content
 * @param {number} idx - Question index
 * @param {string} num - Section number
 * @returns {Object|null} Parsed question or null
 */
function parseQuestionBlock(code, idx, num) {
  try {
    // Extract question type
    const typeM = code.match(TYPE_REGEX);
    const type = typeM ? typeM[1].toUpperCase() : 'UNKNOWN';
    
    // Generate or extract question ID
    let questionId = extractQuestionId(code);
    if (!questionId || !isValidQuestionId(questionId)) {
      const qMatch = code.match(QUESTION_TEXT_REGEX);
      const questionText = qMatch ? qMatch[1].replace(/^\r?\n/, '').trim() : '';
      questionId = generateQuestionId(questionText, type, idx, num);
      if (DEBUG) console.log(`🔧 Generated new question ID: ${questionId} for question in section ${num}`);
    } else {
      if (DEBUG) console.log(`🔍 Found existing question ID: ${questionId} for question in section ${num}`);
    }
    
    // Handle AUDIO questions
    if (AUDIO_SIMPLE_REGEX.test(code)) {
      return buildQuestion({
        id: questionId,
        type: 'AUDIO',
        rawQ: 'AUDIO:',
        rawE: ''
      });
    }
    
    const audioWithFileMatch = code.match(AUDIO_WITH_FILE_REGEX);
    if (audioWithFileMatch) {
      const audioContent = audioWithFileMatch[1].trim();
      const audioFileMatch = audioContent.match(AUDIO_FILE_REGEX);
      if (audioFileMatch) {
        const audioFilename = audioFileMatch[1];
        if (DEBUG) console.log(`Found AUDIO question with file: ${audioFilename}`);
        return buildQuestion({
          id: questionId,
          type: 'AUDIO',
          rawQ: 'AUDIO:',
          rawE: '',
          extras: { audioFile: audioFilename }
        });
      }
    }

    if (!type || type === 'UNKNOWN') {
      console.warn(`No type found for question ${idx + 1} in section ${num}`);
      return null;
    }

    // Extract question content
    const questionContent = extractQuestionContent(code, type);
    const explanationContent = extractExplanationContent(code);
    const answerContent = extractAnswerContent(code);

    // Build the question using the unified builder
    return buildQuestion({
      id: questionId,
      type,
      rawQ: questionContent.rawQ,
      rawE: explanationContent.rawE,
      answer: answerContent,
      images: questionContent.images,
      codeBlocks: questionContent.codeBlocks,
      latexBlocks: questionContent.latexBlocks,
      htmlTables: questionContent.htmlTables,
      orderedElements: questionContent.orderedElements,
      latexPlaceholders: questionContent.latexPlaceholders,
      explanationImages: explanationContent.images,
      explanationCodeBlocks: explanationContent.codeBlocks,
      explanationLatexBlocks: explanationContent.latexBlocks,
      explanationHtmlTables: explanationContent.htmlTables,
      explanationOrderedElements: explanationContent.orderedElements
    });

  } catch (error) {
    console.error(`Error parsing question ${idx + 1} in section ${num}:`, error);
    return null;
  }
}

/**
 * Extracts question content and elements
 * @param {string} code - Question block code
 * @param {string} type - Question type
 * @returns {Object} Question content and elements
 */
function extractQuestionContent(code, type) {
  const qMatch = code.match(QUESTION_TEXT_REGEX);
  if (!qMatch) {
    return {
      rawQ: '',
      images: [],
      codeBlocks: [],
      latexBlocks: [],
      htmlTables: [],
      orderedElements: [],
      latexPlaceholders: []
    };
  }

  const rawQ = qMatch[1].replace(/^\r?\n/, '');
  const extracted = extractContentElements(rawQ, type === 'CLOZE');
  
  return {
    rawQ,
    images: extracted.images,
    codeBlocks: extracted.codeBlocks,
    latexBlocks: extracted.latexBlocks,
    htmlTables: extracted.htmlTables,
    orderedElements: extracted.orderedElements,
    latexPlaceholders: extracted.latexPlaceholders || []
  };
}

/**
 * Extracts explanation content and elements
 * @param {string} code - Question block code
 * @returns {Object} Explanation content and elements
 */
function extractExplanationContent(code) {
  const eIdx = code.search(EXPLANATION_START_REGEX);
  if (eIdx === -1) {
    return {
      rawE: '',
      images: [],
      codeBlocks: [],
      latexBlocks: [],
      htmlTables: [],
      orderedElements: []
    };
  }

  const eStart = code.indexOf('E:', eIdx) + 2;
  // Check for both old and new end patterns
  const oldEnd = code.indexOf('--- end-question', eStart);
  const newEnd = code.indexOf('````', eStart);
  let eEnd = -1;
  
  // Use whichever end pattern is found (and comes first if both exist)
  if (oldEnd !== -1 && newEnd !== -1) {
    eEnd = Math.min(oldEnd, newEnd);
  } else if (oldEnd !== -1) {
    eEnd = oldEnd;
  } else if (newEnd !== -1) {
    eEnd = newEnd;
  }
  
  let rawE;
  if (eEnd !== -1) {
    rawE = code.slice(eStart, eEnd);
  } else {
    rawE = code.slice(eStart);
  }
  
  rawE = rawE.replace(/^\r?\n/, '');
  const extracted = extractContentElements(rawE);
  
  return {
    rawE,
    images: extracted.images,
    codeBlocks: extracted.codeBlocks,
    latexBlocks: extracted.latexBlocks,
    htmlTables: extracted.htmlTables,
    orderedElements: extracted.orderedElements
  };
}

/**
 * Extracts answer content
 * @param {string} code - Question block code
 * @returns {string} Answer content
 */
function extractAnswerContent(code) {
  const aM = code.match(ANSWER_REGEX);
  return aM ? aM[1].trim() : '';
}
