// questionIdManager.js
// Utility functions for managing unique question IDs

/**
 * Generate a stable unique ID for a question based on its content
 * @param {string} questionText - The question text
 * @param {string} questionType - The question type (CLOZE, T-F, Short)
 * @param {number} index - The question index in the group
 * @param {string} groupNumber - The group number
 * @returns {string} - A unique ID
 */
export function generateQuestionId(questionText, questionType, index, groupNumber) {
  // Clean the question text for consistent hashing
  const cleanText = questionText
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[^\w\s$=+-]/g, '') // Keep only word chars, spaces, and basic math symbols
    .trim()
    .substring(0, 100); // Limit length for consistency
  
  // Create a hash from the question content for stability
  const contentHash = simpleHash(cleanText);
  
  // Clean group number for ID
  const cleanGroup = groupNumber.replace(/[^\w]/g, '').substring(0, 20);
  
  return `q${cleanGroup}_${index + 1}_${questionType.toLowerCase()}_${contentHash}`;
}

/**
 * Simple hash function to create a short hash from text
 * @param {string} str - The string to hash
 * @returns {string} - A short hash string
 */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Use a more sophisticated base conversion for better distribution
  const absHash = Math.abs(hash);
  return absHash.toString(36).substring(0, 6).padStart(6, '0');
}

/**
 * Extract question ID from markdown question block
 * @param {string} questionBlock - The markdown question block
 * @returns {string|null} - The extracted ID or null if not found
 */
export function extractQuestionId(questionBlock) {
  const idMatch = questionBlock.match(/^ID:\s*(.+)$/m);
  return idMatch ? idMatch[1].trim() : null;
}

/**
 * Add or update question ID in markdown question block
 * @param {string} questionBlock - The markdown question block
 * @param {string} questionId - The ID to add/update
 * @returns {string} - The updated question block
 */
export function addQuestionIdToBlock(questionBlock, questionId) {
  // Check if ID already exists
  const existingId = extractQuestionId(questionBlock);
  
  if (existingId) {
    // Update existing ID
    return questionBlock.replace(/^ID:\s*.+$/m, `ID: ${questionId}`);
  } else {
    // Add ID after TYPE line
    const typeMatch = questionBlock.match(/^(TYPE:\s*.+)$/m);
    if (typeMatch) {
      return questionBlock.replace(
        typeMatch[0],
        `${typeMatch[0]}\nID: ${questionId}`
      );
    } else {
      // Fallback: add at the beginning
      return `ID: ${questionId}\n${questionBlock}`;
    }
  }
}

/**
 * Generate a display-friendly short ID for UI
 * @param {string} fullId - The full unique ID
 * @returns {string} - A shorter display ID
 */
export function getDisplayId(fullId) {
  if (!fullId) return '';
  
  // Extract meaningful parts: group and question number
  const match = fullId.match(/q(\d+)_(\d+)/);
  if (match) {
    return `${match[1]}.${match[2]}`;
  }
  
  // Fallback: show last part of the ID
  const parts = fullId.split('_');
  return parts[parts.length - 1];
}

/**
 * Validate if a question ID follows the expected format
 * @param {string} questionId - The ID to validate
 * @returns {boolean} - True if valid format
 */
export function isValidQuestionId(questionId) {
  if (!questionId || typeof questionId !== 'string') return false;
  
  // Expected format: q{group}_{index}_{type}_{hash}
  return /^q\d+_\d+_[a-z]+_[a-z0-9]+$/i.test(questionId);
}
