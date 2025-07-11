// vaultLoader.js
// Handles file loading logic for both Electron and Web environments

import { autoIdAssigner } from '../../../shared/services/autoIdAssigner.js';
import { appInitializer } from '../../../shared/services/appInitializer.js';

const DEBUG = process.env.NODE_ENV === 'development';

/**
 * Loads a file from vault with cache-busting and environment detection
 * @param {string} filename - The filename to load from vault
 * @param {AbortSignal} signal - Optional abort signal for fetch requests
 * @returns {Promise<string>} The file content
 */
export async function loadVaultFile(filename, signal) {
  if (DEBUG) console.log('🔍 loadVaultFile - Starting with filename:', filename);
  
  let text;
  
  // Check if we're in an Electron environment
  if (window.electron && window.electron.readVaultFile) {
    // Force fresh read by including timestamp
    const timestamp = Date.now();
    if (DEBUG) console.log(`[Electron] Reading ${filename} with timestamp ${timestamp}`);
    text = await window.electron.readVaultFile(filename, timestamp);
    if (!text) {
      throw new Error(`Failed to load ${filename} via IPC`);
    }
    if (DEBUG) console.log(`[Electron] Successfully loaded ${filename} (${text.length} characters)`);
  } else {
    // Web environment - use fetch
    text = await loadVaultFileWeb(filename, signal);
  }
  
  return text;
}

/**
 * Loads file from web environment with cache-busting
 * @param {string} filename - The filename to load
 * @param {AbortSignal} signal - Abort signal for fetch
 * @returns {Promise<string>} The file content
 */
async function loadVaultFileWeb(filename, signal) {
  let vaultPath = '/vault/';
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    vaultPath = window.location.origin + '/vault/';
  }
  
  // Add cache-busting parameter to ensure fresh content
  const cacheBuster = Date.now();
  if (DEBUG) console.log(`[Web] Reading ${filename} with cache buster ${cacheBuster}`);
  
  const res = await fetch(vaultPath + filename + '?v=' + cacheBuster, { 
    signal,
    cache: 'no-cache',
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
  
  if (!res.ok) {
    throw new Error(`Failed to fetch ${filename}: ${res.status}`);
  }
  
  const text = await res.text();
  if (DEBUG) console.log(`[Web] Successfully loaded ${filename} (${text.length} characters)`);
  
  return text;
}

/**
 * Ensures all questions in the content have valid IDs
 * @param {string} text - The markdown content
 * @param {string} filename - The filename being processed
 * @returns {Promise<string>} The content with ensured question IDs
 */
export async function ensureQuestionIds(text, filename) {
  if (DEBUG) console.log('🆔 AUTO-ID - Checking for missing question IDs...');
  
  try {
    // Check if we're in Electron environment for file writing capability
    if (window.electron && window.electron.readVaultFile) {
      const idResult = await appInitializer.processUpdatedContent(filename, text);
      if (idResult.updated) {
        if (DEBUG) console.log(`🆔 AUTO-ID - Successfully processed ${filename} with ${idResult.addedIds.length} new IDs:`, idResult.addedIds);
        return idResult.content;
      } else {
        if (DEBUG) console.log(`🆔 AUTO-ID - All questions in ${filename} already have IDs`);
        return text;
      }
    } else {
      // Web environment - process in memory only
      if (DEBUG) console.log('🆔 AUTO-ID - Checking for missing question IDs in web environment...');
      const idResult = await autoIdAssigner.processMarkdownFile(filename, text);
      if (idResult.updated) {
        if (DEBUG) console.log(`🆔 AUTO-ID - Processed ${filename} in memory with ${idResult.addedIds.length} new IDs:`, idResult.addedIds);
        if (DEBUG) console.warn('🆔 AUTO-ID - Web environment: Changes cannot be saved to disk. Please download updated content.');
        return idResult.content;
      }
      return text;
    }
  } catch (idError) {
    console.error(`🆔 AUTO-ID - Error during ID assignment for ${filename}:`, idError);
    return text; // Return original content if ID assignment fails
  }
}
