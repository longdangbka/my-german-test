// appInitializer.js
// Service for initializing the app and ensuring all questions have IDs

import { autoIdAssigner } from './autoIdAssigner.js';

/**
 * App initialization service that handles startup tasks
 */
export class AppInitializer {
  constructor() {
    this.isElectron = window.electron !== undefined;
    this.initialized = false;
    this.initPromise = null;
  }

  /**
   * Initialize the app and ensure all questions have IDs
   * @returns {Promise<boolean>} - Success status
   */
  async initialize() {
    if (this.initialized) {
      console.log('🚀 APP-INIT - Already initialized');
      return true;
    }

    if (this.initPromise) {
      console.log('🚀 APP-INIT - Initialization in progress, waiting...');
      return await this.initPromise;
    }

    this.initPromise = this._performInitialization();
    const result = await this.initPromise;
    this.initPromise = null;
    
    return result;
  }

  /**
   * Internal initialization logic
   * @returns {Promise<boolean>}
   */
  async _performInitialization() {
    console.log('🚀 APP-INIT - Starting app initialization');

    try {
      // Step 1: Ensure all questions have IDs
      await this._ensureQuestionIds();
      
      // Step 2: Any other initialization tasks can go here
      // (e.g., cache warming, user preferences, etc.)
      
      this.initialized = true;
      console.log('🚀 APP-INIT - App initialization completed successfully');
      return true;
      
    } catch (error) {
      console.error('🚀 APP-INIT - App initialization failed:', error);
      return false;
    }
  }

  /**
   * Ensure all questions in all markdown files have unique IDs
   * @returns {Promise<void>}
   */
  async _ensureQuestionIds() {
    console.log('🆔 APP-INIT - Ensuring all questions have IDs');

    try {
      if (this.isElectron) {
        // In Electron, we can process all files automatically
        const results = await autoIdAssigner.processAllMarkdownFiles();
        
        if (results.totalIdsAdded > 0) {
          console.log(`🆔 APP-INIT - Added ${results.totalIdsAdded} new question IDs across ${results.updatedFiles.length} files`);
        } else {
          console.log('🆔 APP-INIT - All questions already have IDs');
        }
      } else {
        // In browser environment, we'll process files as they're loaded
        console.log('🆔 APP-INIT - Browser environment: IDs will be assigned during question loading');
      }
    } catch (error) {
      console.error('🆔 APP-INIT - Error ensuring question IDs:', error);
      // Don't fail the entire initialization if ID assignment fails
    }
  }

  /**
   * Reset initialization state (useful for testing or manual reinitialization)
   */
  reset() {
    console.log('🚀 APP-INIT - Resetting initialization state');
    this.initialized = false;
    this.initPromise = null;
  }

  /**
   * Check if the app has been initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this.initialized;
  }

  /**
   * Process a newly added markdown file to ensure its questions have IDs
   * @param {string} fileName - Name of the file to process
   * @returns {Promise<{success: boolean, idsAdded: number}>}
   */
  async processNewFile(fileName) {
    console.log(`🆔 APP-INIT - Processing new file: ${fileName}`);
    
    try {
      const result = await autoIdAssigner.processSingleFile(fileName);
      
      if (result.success && result.idsAdded > 0) {
        console.log(`🆔 APP-INIT - Added ${result.idsAdded} new IDs to ${fileName}`);
      }
      
      return result;
    } catch (error) {
      console.error(`🆔 APP-INIT - Error processing new file ${fileName}:`, error);
      return { success: false, idsAdded: 0 };
    }
  }

  /**
   * Process updated content to ensure new questions have IDs
   * @param {string} fileName - Name of the file
   * @param {string} content - Updated content
   * @returns {Promise<{updated: boolean, content: string, addedIds: string[]}>}
   */
  async processUpdatedContent(fileName, content) {
    console.log(`🆔 APP-INIT - Processing updated content for: ${fileName}`);
    
    try {
      const result = await autoIdAssigner.processMarkdownFile(fileName, content);
      
      if (result.updated) {
        console.log(`🆔 APP-INIT - Added ${result.addedIds.length} new IDs to updated content in ${fileName}`);
        
        // Save the updated content if we're in Electron
        if (this.isElectron && result.updated) {
          await autoIdAssigner.saveUpdatedContent(fileName, result.content);
        }
      }
      
      return result;
    } catch (error) {
      console.error(`🆔 APP-INIT - Error processing updated content for ${fileName}:`, error);
      return { updated: false, content, addedIds: [] };
    }
  }
}

// Create and export singleton instance
export const appInitializer = new AppInitializer();

// Auto-initialize when the module is imported (with error handling)
if (typeof window !== 'undefined') {
  // Use setTimeout to ensure DOM is ready
  setTimeout(() => {
    appInitializer.initialize().catch(error => {
      console.error('🚀 APP-INIT - Auto-initialization failed:', error);
    });
  }, 100);
}
