/**
 * Anki media extraction and upload utilities
 * Handles media file detection, processing, and upload to AnkiConnect
 */

import { MEDIA_CONFIG, SUPPORTED_MEDIA_EXTS, REGEX_PATTERNS, DEBUG_CONFIG } from './config.js';
import { storeMediaFile } from './network.js';

/**
 * Convert ArrayBuffer to Base64 string
 * @param {ArrayBuffer} buffer - ArrayBuffer to convert
 * @returns {string} - Base64 encoded string
 */
export function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Escape regex special characters
 * @param {string} string - String to escape
 * @returns {string} - Escaped string
 */
export function escapeRegex(string) {
  return string.replace(REGEX_PATTERNS.ESCAPE_REGEX, '\\$&');
}

/**
 * Extract all media links from markdown content (images and audio)
 * @param {string} content - Markdown content
 * @returns {Array} - Array of media file information
 */
export function extractMedia(content) {
  if (!content) return [];
  
  const mediaLinks = [];
  
  // Extract Obsidian-style media links: ![[filename]]
  const obsidianRegex = new RegExp(REGEX_PATTERNS.OBSIDIAN_MEDIA.source, 'g');
  let match;
  
  while ((match = obsidianRegex.exec(content)) !== null) {
    const filename = match[1];
    const extension = filename.substring(filename.lastIndexOf('.')).toLowerCase();
    
    if (SUPPORTED_MEDIA_EXTS.includes(extension)) {
      mediaLinks.push({
        original: match[0],
        filename: filename,
        displayText: filename,
        extension: extension,
        isAudio: MEDIA_CONFIG.AUDIO_EXTS.includes(extension),
        isImage: MEDIA_CONFIG.IMAGE_EXTS.includes(extension)
      });
    }
  }
  
  // Extract markdown-style media links: ![alt](src)
  const markdownRegex = new RegExp(REGEX_PATTERNS.MARKDOWN_MEDIA.source, 'g');
  
  while ((match = markdownRegex.exec(content)) !== null) {
    const alt = match[1];
    const src = match[2];
    const filename = src.substring(src.lastIndexOf('/') + 1);
    const extension = filename.substring(filename.lastIndexOf('.')).toLowerCase();
    
    if (SUPPORTED_MEDIA_EXTS.includes(extension)) {
      mediaLinks.push({
        original: match[0],
        filename: filename,
        displayText: alt || filename,
        extension: extension,
        isAudio: MEDIA_CONFIG.AUDIO_EXTS.includes(extension),
        isImage: MEDIA_CONFIG.IMAGE_EXTS.includes(extension),
        src: src
      });
    }
  }
  
  // Extract AUDIO: prefixed references
  const audioRegex = new RegExp(REGEX_PATTERNS.AUDIO_REFS.source, 'g');
  
  while ((match = audioRegex.exec(content)) !== null) {
    const filename = match[1];
    const extension = filename.substring(filename.lastIndexOf('.')).toLowerCase();
    
    if (MEDIA_CONFIG.AUDIO_EXTS.includes(extension)) {
      mediaLinks.push({
        original: match[0],
        filename: filename,
        displayText: filename,
        extension: extension,
        isAudio: true,
        isImage: false
      });
    }
  }
  
  return mediaLinks;
}

/**
 * Load a media file from URL and convert to base64
 * @param {object} media - Media object with filename and optional src
 * @returns {Promise<string>} - Base64 encoded data
 */
async function loadMediaFile(media) {
  // Determine the correct file URL - handle both browser and Electron environments
  let fileUrl;
  
  const isElectron = window.electron || window.location.protocol === 'file:';
  const baseUrl = isElectron ? 'http://localhost:3000' : window.location.origin;
  
  if (media.src) {
    // Handle markdown-style links with explicit src
    if (media.src.startsWith('http')) {
      fileUrl = media.src;
    } else if (media.src.startsWith('/')) {
      fileUrl = baseUrl + media.src;
    } else {
      // Relative path - assume it's relative to the vault
      fileUrl = `${baseUrl}/vault/${media.src}`;
    }
  } else {
    // Handle Obsidian-style links: ![[filename]]
    fileUrl = `${baseUrl}/vault/${media.filename}`;
  }
  
  if (DEBUG_CONFIG.ENABLED) {
    console.log(`${DEBUG_CONFIG.PREFIX} - Loading media from: ${fileUrl}`);
  }
  
  // Try Electron API first if available
  if (window.electron && window.electron.readVaultImage) {
    try {
      const dataUrl = await window.electron.readVaultImage(media.filename);
      
      if (dataUrl) {
        const base64Index = dataUrl.indexOf('base64,');
        if (base64Index === -1) {
          throw new Error('Invalid data URL format - no base64 data found');
        }
        
        return dataUrl.substring(base64Index + 7); // Skip "base64,"
      }
    } catch (electronError) {
      if (DEBUG_CONFIG.ENABLED) {
        console.warn(`${DEBUG_CONFIG.PREFIX} - Electron reading failed, falling back to fetch:`, electronError);
      }
    }
  }
  
  // Fallback to fetch method
  const response = await fetch(fileUrl);
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText} for ${fileUrl}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  return arrayBufferToBase64(arrayBuffer);
}

/**
 * Process media files and upload them to Anki (parallelized)
 * @param {Array} mediaLinks - Array of media link objects
 * @returns {Promise<Object>} - Map of original filenames to Anki filenames
 */
export async function processMediaFiles(mediaLinks) {
  if (!mediaLinks || mediaLinks.length === 0) {
    return {};
  }
  
  if (DEBUG_CONFIG.ENABLED) {
    console.log(`${DEBUG_CONFIG.PREFIX} - Processing ${mediaLinks.length} media files in parallel`);
  }
  
  // Process all media files in parallel
  const results = await Promise.allSettled(
    mediaLinks.map(async (media) => {
      try {
        const base64Data = await loadMediaFile(media);
        const ankiFilename = await storeMediaFile(media.filename, base64Data);
        
        return {
          originalFilename: media.filename,
          ankiFilename: ankiFilename || media.filename,
          success: true
        };
      } catch (error) {
        console.error(`Failed to process media file ${media.filename}:`, error);
        return {
          originalFilename: media.filename,
          ankiFilename: media.filename, // Fallback to original
          success: false,
          error: error.message
        };
      }
    })
  );
  
  // Build the media map
  const mediaMap = {};
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      const { originalFilename, ankiFilename } = result.value;
      mediaMap[originalFilename] = ankiFilename;
    } else {
      // Even if processing failed, provide fallback mapping
      const media = mediaLinks[index];
      mediaMap[media.filename] = media.filename;
      console.error(`Media processing failed for ${media.filename}:`, result.reason);
    }
  });
  
  if (DEBUG_CONFIG.ENABLED) {
    console.log(`${DEBUG_CONFIG.PREFIX} - Media processing completed:`, mediaMap);
  }
  
  return mediaMap;
}

/**
 * Replace media references in content with processed filenames
 * @param {string} content - Original content
 * @param {Array} mediaLinks - Array of media objects
 * @param {Object} mediaMap - Map of original to processed filenames
 * @returns {string} - Content with replaced media references
 */
export function replaceMediaReferences(content, mediaLinks, mediaMap) {
  let processedContent = content;
  
  for (const media of mediaLinks) {
    const processedFilename = mediaMap[media.filename] || media.filename;
    
    if (media.isAudio) {
      // Audio file: replace with Anki audio syntax
      const audioTag = `[sound:${processedFilename}]`;
      processedContent = processedContent.replace(
        new RegExp(escapeRegex(media.original), 'g'),
        audioTag
      );
    } else if (media.isImage) {
      // Image file: replace with HTML img tag
      const imgTag = `<img src="${processedFilename}" alt="${media.displayText}" style="max-width: 500px; height: auto;">`;
      processedContent = processedContent.replace(
        new RegExp(escapeRegex(media.original), 'g'),
        imgTag
      );
    }
  }
  
  return processedContent;
}
