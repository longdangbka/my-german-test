/**
 * Anki Connect API integration (Refactored)
 * 
 * This file has been refactored into a modular structure:
 * - config.js: Configuration and constants
 * - network.js: Network layer and AnkiConnect communication
 * - media.js: Media extraction, processing, and upload
 * - convert.js: Content conversion utilities (LaTeX, HTML, tables)
 * - cloze.js: Cloze deletion processing
 * - export.js: Note preparation and export functionality
 * 
 * This file now re-exports all functions for backward compatibility.
 */

// Re-export everything from the modular structure
export * from './config.js';
export * from './network.js';
export * from './media.js';
export * from './convert.js';
export * from './cloze.js';
export * from './export.js';
export * from './utils.js';

// Legacy re-exports for backward compatibility
export { 
  prepareQuestionForAnki as prepareQuestionForAnkiAsync,
  extractMedia as extractMediaLinks,
  extractMedia as extractAudioReferences,
  processMediaFiles as processContentForAnki
} from './export.js';
