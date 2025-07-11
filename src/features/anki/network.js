/**
 * Anki Connect network layer
 * Handles all communication with AnkiConnect API
 */

import { ANKI_CONFIG, DEBUG_CONFIG } from './config.js';

/**
 * Generic error handler for AnkiConnect operations
 * @param {string} action - The action that failed
 * @param {object} params - Parameters that were used
 * @param {any} fallback - Fallback value to return on error
 * @returns {function} - Error handler function
 */
function createErrorHandler(action, params, fallback) {
  return (error) => {
    console.error(`AnkiConnect ${action} failed:`, error);
    if (DEBUG_CONFIG.ENABLED) {
      console.log(`${DEBUG_CONFIG.PREFIX} - Failed params:`, params);
    }
    return fallback;
  };
}

/**
 * Safe invoke wrapper with consistent error handling
 * @param {string} action - The action to perform
 * @param {object} params - Parameters for the action
 * @param {any} fallback - Fallback value on error
 * @returns {Promise<any>} - The response from AnkiConnect or fallback
 */
export async function safeInvoke(action, params = {}, fallback = null) {
  try {
    return await invoke(action, params);
  } catch (error) {
    return createErrorHandler(action, params, fallback)(error);
  }
}

/**
 * Core AnkiConnect API invocation
 * @param {string} action - The action to perform
 * @param {object} params - Parameters for the action
 * @returns {Promise<any>} - The response from AnkiConnect
 */
export async function invoke(action, params = {}) {
  const requestBody = JSON.stringify({
    action,
    version: ANKI_CONFIG.VERSION,
    params
  });

  if (DEBUG_CONFIG.ENABLED) {
    console.log(`${DEBUG_CONFIG.PREFIX} - Invoking: ${action}`, params);
  }

  try {
    const response = await fetch(`http://localhost:${ANKI_CONFIG.PORT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: requestBody
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.error) {
      throw new Error(result.error);
    }

    return result.result;
  } catch (error) {
    console.error(`AnkiConnect ${action} error:`, error);
    throw error;
  }
}

/**
 * Test connection to AnkiConnect
 * @returns {Promise<boolean>} - Whether the connection is successful
 */
export async function testAnkiConnection() {
  try {
    await invoke('version');
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get all deck names from Anki
 * @returns {Promise<string[]>} - Array of deck names
 */
export async function getDeckNames() {
  return await safeInvoke('deckNames', {}, [ANKI_CONFIG.DEFAULT_DECK]);
}

/**
 * Create a deck if it doesn't exist
 * @param {string} deckName - Name of the deck to create
 * @returns {Promise<boolean>} - Whether the deck was created successfully
 */
export async function createDeck(deckName) {
  try {
    await invoke('createDeck', { deck: deckName });
    return true;
  } catch (error) {
    console.error('Failed to create deck:', error);
    return false;
  }
}

/**
 * Get all note type names from Anki
 * @returns {Promise<string[]>} - Array of note type names
 */
export async function getNoteTypes() {
  return await safeInvoke('modelNames', {}, []);
}

/**
 * Get fields for a specific note type
 * @param {string} noteType - Name of the note type
 * @returns {Promise<string[]>} - Array of field names
 */
export async function getNoteTypeFields(noteType) {
  return await safeInvoke('modelFieldNames', { modelName: noteType }, []);
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

/**
 * Store media file in Anki by base64 data
 * @param {string} filename - Name of the file
 * @param {string} data - Base64 encoded file data
 * @returns {Promise<string>} - Filename in Anki
 */
export async function storeMediaFile(filename, data) {
  if (DEBUG_CONFIG.ENABLED) {
    console.log(`${DEBUG_CONFIG.PREFIX} - Storing media file: ${filename} (${data.length} chars)`);
  }
  
  const result = await invoke('storeMediaFile', { filename, data });
  
  // AnkiConnect returns the filename if successful, null if failed
  return result !== null && result !== undefined ? result : filename;
}

/**
 * Add a note to Anki
 * @param {object} note - Note object with deckName, modelName, fields, and tags
 * @returns {Promise<number|null>} - Note ID if successful, null if failed
 */
export async function addNote(note) {
  if (DEBUG_CONFIG.ENABLED) {
    console.log(`${DEBUG_CONFIG.PREFIX} - Adding note:`, JSON.stringify(note, null, 2));
  }
  
  try {
    const noteId = await invoke('addNote', { note });
    console.log('Note added successfully with ID:', noteId);
    return noteId;
  } catch (error) {
    console.error('Failed to add note to Anki:', error);
    throw error;
  }
}
