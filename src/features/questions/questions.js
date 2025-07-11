// questions.js
// Optimized question loading and parsing with modular architecture

import { loadVaultFile, ensureQuestionIds } from './loaders/vaultLoader.js';
import { parseStandardMarkdown } from './parsers/groupParser.js';
import { appInitializer } from '../../shared/services/appInitializer.js';

const DEBUG = process.env.NODE_ENV === 'development';

/**
 * Loads and parses question groups from a vault file
 * @param {AbortSignal} signal - Optional abort signal
 * @param {string} filename - Filename to load from vault
 * @returns {Promise<Array>} Array of question groups
 */
export async function loadQuestionGroups(signal, filename = 'Question-Sample.md') {
  if (DEBUG) console.log('🔍 loadQuestionGroups - Starting with filename:', filename);
  
  // Ensure app is initialized (this includes auto-ID assignment)
  await appInitializer.initialize();
  
  try {
    // Load file content with environment detection and cache-busting
    let text = await loadVaultFile(filename, signal);
    
    // Ensure all questions have valid IDs
    text = await ensureQuestionIds(text, filename);
    
    // Parse the markdown into question groups
    const groups = parseStandardMarkdown(text);
    
    if (DEBUG) console.log('🔍 loadQuestionGroups - Final groups to return:', groups);
    return groups;
  } catch (error) {
    console.error(`Error loading ${filename}:`, error);
    throw error;
  }
}




