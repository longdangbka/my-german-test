// autoIdAssigner.js
// Service for automatically assigning IDs to questions in markdown files

import { generateQuestionId, extractQuestionId, addQuestionIdToBlock } from '../utils/questionIdManager.js';

/**
 * Service for automatically managing question IDs in markdown files
 */
export class AutoIdAssigner {
  constructor() {
    this.isElectron = window.electron !== undefined;
  }

  /**
   * Scan and assign IDs to all questions in a markdown file
   * @param {string} filePath - Path to the markdown file
   * @param {string} content - Current file content
   * @returns {Promise<{updated: boolean, content: string, addedIds: string[]}>}
   */
  async processMarkdownFile(filePath, content) {
    console.log(`🆔 AUTO-ID - Processing file: ${filePath}`);
    
    let updatedContent = content;
    let changesMade = false;
    const addedIds = [];

    try {
      // Parse sections (groups) using the same logic as main question parser
      const headingRE = /^##\s+(.+)$/gm;
      const headings = Array.from(content.matchAll(headingRE));
      
      if (headings.length === 0) {
        console.log(`🆔 AUTO-ID - No section headings found in ${filePath}`);
        return { updated: false, content, addedIds: [] };
      }

      for (let i = 0; i < headings.length; i++) {
        const groupNumber = headings[i][1].trim();
        const start = headings[i].index + headings[i][0].length;
        const end = (i + 1 < headings.length) ? headings[i+1].index : content.length;
        const sectionBlock = content.slice(start, end);
        
        // Extract questions section
        const qMatch = sectionBlock.match(/### Questions\s*[\r\n]+([\s\S]*)/i);
        if (!qMatch) {
          console.log(`🆔 AUTO-ID - No questions section found in group: ${groupNumber}`);
          continue;
        }
        
        const questionsSection = qMatch[1];
        
        // Find question blocks - supports both old and new formats
        const questionBlocks = Array.from(
          questionsSection.matchAll(/(?:--- start-question\s*[\r\n]+([\s\S]*?)[\r\n]+--- end-question|````ad-question\s*[\r\n]+([\s\S]*?)[\r\n]+````)/g)
        );
        
        console.log(`🆔 AUTO-ID - Found ${questionBlocks.length} questions in group: ${groupNumber}`);

        for (let [idx, match] of questionBlocks.entries()) {
          const fullMatch = match[0]; // Complete match including delimiters
          const questionCode = (match[1] || match[2]).trim(); // m[1] for old format, m[2] for new format
          
          // Check if ID already exists
          const existingId = extractQuestionId(questionCode);
          if (existingId) {
            console.log(`🆔 AUTO-ID - Question ${idx + 1} in group ${groupNumber} already has ID: ${existingId}`);
            continue;
          }
          
          // Extract type and question text for ID generation
          const typeMatch = questionCode.match(/^TYPE:\s*(CLOZE|T-F|Short|TrueFalse|SHORT)$/im);
          let type = typeMatch ? typeMatch[1].toUpperCase() : 'UNKNOWN';
          
          // Normalize type names
          if (type === 'TRUEFALSE') type = 'T-F';
          if (type === 'SHORT') type = 'Short';
          
          const qMatch = questionCode.match(/^Q:\s*([\s\S]*?)(?=\r?\n(?:A:|ANSWER:|E:|---\s*end-question|````$))/m);
          let questionText = qMatch ? qMatch[1].replace(/^\r?\n/, '').trim() : '';
          
          // Handle audio-only questions that don't have TYPE or Q fields
          const audioMatch = questionCode.match(/^AUDIO:\s*!?\[\[([^\]]+)\]\]/im);
          if (type === 'UNKNOWN' && !questionText && audioMatch) {
            type = 'AUDIO';
            questionText = `Audio: ${audioMatch[1]}`;
            console.log(`🆔 AUTO-ID - Detected audio-only question ${idx + 1} in group ${groupNumber}`);
          }
          
          if (type === 'UNKNOWN' || !questionText) {
            console.log(`🆔 AUTO-ID - Skipping question ${idx + 1} in group ${groupNumber} - missing type or text`);
            continue;
          }
          
          // Generate new ID with improved hashing
          const newId = generateQuestionId(questionText, type, idx, groupNumber);
          console.log(`🆔 AUTO-ID - Generated ID ${newId} for question ${idx + 1} in group ${groupNumber}`);
          
          // Update the question block with the new ID
          const updatedQuestionCode = addQuestionIdToBlock(questionCode, newId);
          
          // Create the complete updated block
          const updatedFullMatch = fullMatch.replace(questionCode, updatedQuestionCode);
          
          // Replace in the full content using the complete match for precision
          updatedContent = updatedContent.replace(fullMatch, updatedFullMatch);
          changesMade = true;
          addedIds.push(newId);
        }
      }

      if (changesMade) {
        console.log(`🆔 AUTO-ID - Successfully assigned ${addedIds.length} new IDs in ${filePath}`);
      } else {
        console.log(`🆔 AUTO-ID - No ID assignments needed in ${filePath}`);
      }

      return {
        updated: changesMade,
        content: updatedContent,
        addedIds
      };

    } catch (error) {
      console.error(`🆔 AUTO-ID - Error processing ${filePath}:`, error);
      return { updated: false, content, addedIds: [] };
    }
  }

  /**
   * Save updated content back to the file
   * @param {string} filePath - Path to save to
   * @param {string} content - Updated content
   * @returns {Promise<boolean>} - Success status
   */
  async saveUpdatedContent(filePath, content) {
    try {
      if (this.isElectron) {
        // Use Electron file system
        const success = await window.electron.writeVaultFile(filePath, content);
        if (success) {
          console.log(`🆔 AUTO-ID - Successfully saved ${filePath}`);
          return true;
        } else {
          console.error(`🆔 AUTO-ID - Failed to save ${filePath}`);
          return false;
        }
      } else {
        // Browser environment - can't save directly to files
        console.warn(`🆔 AUTO-ID - Cannot save ${filePath} in browser environment`);
        return false;
      }
    } catch (error) {
      console.error(`🆔 AUTO-ID - Error saving ${filePath}:`, error);
      return false;
    }
  }

  /**
   * Process all markdown files in the vault directory
   * @returns {Promise<{processedFiles: number, totalIdsAdded: number, updatedFiles: string[]}>}
   */
  async processAllMarkdownFiles() {
    console.log(`🆔 AUTO-ID - Starting batch processing of all markdown files`);
    
    if (!this.isElectron) {
      console.warn(`🆔 AUTO-ID - Batch processing only available in Electron environment`);
      return { processedFiles: 0, totalIdsAdded: 0, updatedFiles: [] };
    }

    try {
      // Get list of all markdown files
      const vaultFiles = await window.electron.listVaultFiles();
      
      // Handle both string filenames and file objects with metadata
      const markdownFiles = vaultFiles
        .map(file => typeof file === 'string' ? file : file.filename) // Extract filename if it's an object
        .filter(filename => filename && filename.endsWith('.md'))
        .filter(filename => !filename.includes('bookmark')); // Skip bookmarks file

      console.log(`🆔 AUTO-ID - Found ${markdownFiles.length} markdown files to process`);

      let processedFiles = 0;
      let totalIdsAdded = 0;
      const updatedFiles = [];

      for (const fileName of markdownFiles) {
        try {
          // Read file content
          const content = await window.electron.readVaultFile(fileName);
          if (!content) {
            console.warn(`🆔 AUTO-ID - Could not read ${fileName}, skipping`);
            continue;
          }

          // Process the file
          const result = await this.processMarkdownFile(fileName, content);
          processedFiles++;

          // Save if updated
          if (result.updated) {
            const saveSuccess = await this.saveUpdatedContent(fileName, result.content);
            if (saveSuccess) {
              updatedFiles.push(fileName);
              totalIdsAdded += result.addedIds.length;
            }
          }

        } catch (error) {
          console.error(`🆔 AUTO-ID - Error processing ${fileName}:`, error);
        }
      }

      console.log(`🆔 AUTO-ID - Batch processing complete:`);
      console.log(`  - Processed files: ${processedFiles}`);
      console.log(`  - Updated files: ${updatedFiles.length}`);
      console.log(`  - Total IDs added: ${totalIdsAdded}`);

      return {
        processedFiles,
        totalIdsAdded,
        updatedFiles
      };

    } catch (error) {
      console.error(`🆔 AUTO-ID - Error in batch processing:`, error);
      return { processedFiles: 0, totalIdsAdded: 0, updatedFiles: [] };
    }
  }

  /**
   * Process a single file by name
   * @param {string} fileName - Name of the file in vault directory
   * @returns {Promise<{success: boolean, idsAdded: number}>}
   */
  async processSingleFile(fileName) {
    console.log(`🆔 AUTO-ID - Processing single file: ${fileName}`);

    try {
      // Read file content
      const content = await (this.isElectron 
        ? window.electron.readVaultFile(fileName)
        : fetch(`/vault/${fileName}`).then(r => r.text())
      );

      if (!content) {
        console.warn(`🆔 AUTO-ID - Could not read ${fileName}`);
        return { success: false, idsAdded: 0 };
      }

      // Process the file
      const result = await this.processMarkdownFile(fileName, content);

      // Save if updated
      if (result.updated) {
        const saveSuccess = await this.saveUpdatedContent(fileName, result.content);
        if (saveSuccess) {
          console.log(`🆔 AUTO-ID - Successfully updated ${fileName} with ${result.addedIds.length} new IDs`);
          return { success: true, idsAdded: result.addedIds.length };
        } else {
          console.error(`🆔 AUTO-ID - Failed to save ${fileName}`);
          return { success: false, idsAdded: 0 };
        }
      } else {
        console.log(`🆔 AUTO-ID - No updates needed for ${fileName}`);
        return { success: true, idsAdded: 0 };
      }

    } catch (error) {
      console.error(`🆔 AUTO-ID - Error processing ${fileName}:`, error);
      return { success: false, idsAdded: 0 };
    }
  }
}

// Create a singleton instance
export const autoIdAssigner = new AutoIdAssigner();

// Export utility functions for manual use
export {
  generateQuestionId,
  extractQuestionId,
  addQuestionIdToBlock
} from '../utils/questionIdManager.js';
