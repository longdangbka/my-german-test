/**
 * Note preparation and export functionality for Anki
 * Handles question preparation, field mapping, and note creation
 */

import { NOTE_TYPE_MAPPING, FIELD_MAPPING, ANKI_CONFIG, DEBUG_CONFIG } from './config.js';
import { getNoteTypes, getNoteTypeFields, addNote } from './network.js';
import { extractMedia, processMediaFiles, replaceMediaReferences } from './media.js';
import { processStructuredContent, processRegexContent } from './convert.js';
import { fixClozeNumbering, hasClozes, questionHasClozes } from './ankiClozeHandler.js';

/**
 * Map question type to Anki note type
 * @param {string} questionType - The question type from the quiz
 * @param {object} question - The question object (optional, for cloze detection)
 * @returns {string} - The corresponding Anki note type
 */
export function mapQuestionTypeToNoteType(questionType, question = null) {
  // If we have a question object, check if it contains cloze deletions
  if (question && questionHasClozes(question)) {
    return NOTE_TYPE_MAPPING.CLOZE;
  }
  
  const upperType = questionType?.toUpperCase();
  return NOTE_TYPE_MAPPING[upperType] || NOTE_TYPE_MAPPING.BASIC;
}

/**
 * Extract and process audio references separately
 * @param {string} questionText - Question text
 * @param {object} question - Full question object
 * @returns {object} - Object with cleanText and audioContent
 */
async function processAudioReferences(questionText, question) {
  const audioRefs = extractMedia(questionText).filter(media => media.isAudio);
  
  // Also check if question has audioFile property (from bookmark parsing)
  if (question.audioFile) {
    const filename = question.audioFile;
    const extension = filename.substring(filename.lastIndexOf('.')).toLowerCase();
    
    if (['.wav', '.m4a', '.flac', '.mp3', '.wma', '.aac', '.webm'].includes(extension)) {
      const exists = audioRefs.some(ref => ref.filename === filename);
      if (!exists) {
        audioRefs.push({
          original: `AUDIO: ![[${filename}]]`,
          filename: filename,
          displayText: filename,
          extension: extension,
          isAudio: true,
          isImage: false
        });
      }
    }
  }
  
  // Remove AUDIO: references from question text
  let cleanText = questionText;
  audioRefs.forEach(audioRef => {
    cleanText = cleanText.replace(audioRef.original, '').trim();
  });
  
  // Process audio files and create audio content
  let audioContent = '';
  if (audioRefs.length > 0) {
    try {
      const audioMediaMap = await processMediaFiles(audioRefs);
      
      audioRefs.forEach(audioRef => {
        const processedFilename = audioMediaMap[audioRef.filename] || audioRef.filename;
        audioContent += `[sound:${processedFilename}] `;
      });
      audioContent = audioContent.trim();
    } catch (error) {
      console.warn('Error processing audio files:', error);
    }
  }
  
  return { cleanText, audioContent };
}

/**
 * Process content for Anki with selective conversion
 * @param {string} content - Content to process
 * @param {object} question - Question object (optional)
 * @returns {Promise<string>} - Processed content
 */
async function processContentForAnki(content, question = null) {
  if (!content) return '';
  
  // Extract and process media files
  const mediaLinks = extractMedia(content);
  let mediaMap = {};
  
  if (mediaLinks.length > 0) {
    try {
      mediaMap = await processMediaFiles(mediaLinks);
    } catch (error) {
      console.error('Error processing media files:', error);
      // Create fallback mapping
      mediaLinks.forEach(media => {
        mediaMap[media.filename] = media.filename;
      });
    }
  }
  
  // Replace media references
  let processedContent = replaceMediaReferences(content, mediaLinks, mediaMap);
  
  // Process content based on available structure
  if (question && question.orderedElements) {
    // Use structured processing if available
    processedContent = processStructuredContent(question.orderedElements, mediaMap, true);
  } else {
    // Use regex-based processing as fallback
    processedContent = processRegexContent(processedContent, mediaMap, true);
  }
  
  return processedContent;
}

/**
 * Map fields for cloze note type
 * @param {string} cleanQuestionText - Processed question text
 * @param {string} explanationText - Processed explanation text
 * @param {string} audioContent - Audio content for AUDIO field
 * @param {string[]} availableFields - Available fields in the note type
 * @returns {object} - Mapped fields
 */
function mapClozeFields(cleanQuestionText, explanationText, audioContent, availableFields) {
  const fields = {};
  const { TEXT_FIELDS, EXTRA_FIELDS, AUDIO_FIELD } = FIELD_MAPPING.CLOZE;
  
  // Set main text field
  const textField = TEXT_FIELDS.find(field => availableFields.includes(field));
  if (textField) {
    fields[textField] = cleanQuestionText;
  }
  
  // Set explanation in extra field if available
  if (explanationText.trim()) {
    const extraField = EXTRA_FIELDS.find(field => availableFields.includes(field));
    if (extraField) {
      fields[extraField] = explanationText;
    }
  }
  
  // Set audio content in dedicated AUDIO field if available
  if (audioContent && availableFields.includes(AUDIO_FIELD)) {
    fields[AUDIO_FIELD] = audioContent;
  }
  
  return fields;
}

/**
 * Map fields for basic note type
 * @param {string} cleanQuestionText - Processed question text
 * @param {string} explanationText - Processed explanation text
 * @param {string} audioContent - Audio content for AUDIO field
 * @param {object} question - Original question object
 * @param {string[]} availableFields - Available fields in the note type
 * @returns {object} - Mapped fields
 */
function mapBasicFields(cleanQuestionText, explanationText, audioContent, question, availableFields) {
  const fields = {};
  const { QUESTION_FIELDS, ANSWER_FIELDS, EXPLANATION_FIELDS, AUDIO_FIELD } = FIELD_MAPPING.BASIC;
  
  // Set question field
  const questionField = QUESTION_FIELDS.find(field => availableFields.includes(field));
  if (questionField) {
    fields[questionField] = cleanQuestionText;
  }
  
  // Set answer field
  const answerField = ANSWER_FIELDS.find(field => availableFields.includes(field));
  if (answerField) {
    fields[answerField] = question.answer || 'No answer provided';
  }
  
  // Set explanation field
  if (explanationText.trim()) {
    const explanationField = EXPLANATION_FIELDS.find(field => availableFields.includes(field));
    if (explanationField) {
      fields[explanationField] = explanationText;
    }
  }
  
  // Set audio content in dedicated AUDIO field if available
  if (audioContent && availableFields.includes(AUDIO_FIELD)) {
    fields[AUDIO_FIELD] = audioContent;
  }
  
  return fields;
}

/**
 * Prepare question content for Anki export
 * @param {object} question - Question object
 * @param {string} noteType - Override note type (optional)
 * @returns {Promise<object>} - Prepared fields for Anki
 */
export async function prepareQuestionForAnki(question, noteType = null) {
  if (DEBUG_CONFIG.ENABLED) {
    console.log(`${DEBUG_CONFIG.PREFIX} - Preparing question:`, question.id);
  }
  
  const finalNoteType = noteType || mapQuestionTypeToNoteType(question.type, question);
  const availableFields = await getNoteTypeFields(finalNoteType);
  
  // Get question text (prefer rawText over processed text)
  const questionText = question.rawText || question.text || '';
  const explanationText = question.rawExplanation || question.explanation || '';
  
  // Process audio references separately
  const { cleanText, audioContent } = await processAudioReferences(questionText, question);
  
  // Process main content
  let processedQuestionText = cleanText;
  let processedExplanationText = explanationText;
  
  if (processedQuestionText.trim()) {
    // For cloze cards, fix cloze numbering BEFORE processing content
    if (finalNoteType === 'Cloze') {
      processedQuestionText = fixClozeNumbering(processedQuestionText);
    }
    processedQuestionText = await processContentForAnki(processedQuestionText, question);
  }
  
  if (processedExplanationText.trim()) {
    // For cloze cards, fix cloze numbering BEFORE processing content
    if (finalNoteType === 'Cloze' && hasClozes(processedExplanationText)) {
      processedExplanationText = fixClozeNumbering(processedExplanationText);
    }
    processedExplanationText = await processContentForAnki(processedExplanationText, question);
  }
  
  // Ensure we have at least some content
  if (!processedQuestionText.trim()) {
    processedQuestionText = 'No question text available';
  }
  
  // Map fields based on note type
  let fields;
  if (finalNoteType === 'Cloze') {
    fields = mapClozeFields(processedQuestionText, processedExplanationText, audioContent, availableFields);
  } else {
    fields = mapBasicFields(processedQuestionText, processedExplanationText, audioContent, question, availableFields);
  }
  
  if (DEBUG_CONFIG.ENABLED) {
    console.log(`${DEBUG_CONFIG.PREFIX} - Prepared fields:`, fields);
  }
  
  return {
    noteType: finalNoteType,
    fields,
    tags: [...ANKI_CONFIG.TAGS]
  };
}

/**
 * Add a note to Anki
 * @param {object} question - Question object
 * @param {string} deckName - Name of the deck to add to
 * @returns {Promise<number|null>} - Note ID if successful, null if failed
 */
export async function addNoteToAnki(question, deckName = ANKI_CONFIG.DEFAULT_DECK) {
  if (DEBUG_CONFIG.ENABLED) {
    console.log(`${DEBUG_CONFIG.PREFIX} - Starting export for question:`, question.id);
  }
  
  // Check available note types
  const availableNoteTypes = await getNoteTypes();
  const preferredNoteType = mapQuestionTypeToNoteType(question.type, question);
  let finalNoteType = preferredNoteType;
  
  if (!availableNoteTypes.includes(preferredNoteType)) {
    console.log(`Note type '${preferredNoteType}' not found, falling back to 'Basic'`);
    finalNoteType = 'Basic';
    if (!availableNoteTypes.includes('Basic')) {
      throw new Error(`Note type '${preferredNoteType}' not found and 'Basic' fallback also not available. Available types: ${availableNoteTypes.join(', ')}`);
    }
  }
  
  const { noteType, fields, tags } = await prepareQuestionForAnki(question, finalNoteType);
  
  const note = {
    deckName,
    modelName: noteType,
    fields,
    tags
  };
  
  return await addNote(note);
}

/**
 * Check if required note types exist in Anki
 * @returns {Promise<object>} - Object with note type availability
 */
export async function checkNoteTypes() {
  const noteTypes = await getNoteTypes();
  return {
    'Cloze': noteTypes.includes('Cloze'),
    'T-F': noteTypes.includes('T-F'),
    'Short': noteTypes.includes('Short'),
    'Basic': noteTypes.includes('Basic')
  };
}
