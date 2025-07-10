// Anki Connect API integration
// Based on the Obsidian2Anki plugin logic

const ANKI_PORT = 8765;

// Supported file extensions (from Obsidian2Anki)
const IMAGE_EXTS = [".png", ".jpg", ".jpeg", ".gif", ".bmp", ".svg", ".tiff"];
const AUDIO_EXTS = [".wav", ".m4a", ".flac", ".mp3", ".wma", ".aac", ".webm"];
const SUPPORTED_MEDIA_EXTS = [...IMAGE_EXTS, ...AUDIO_EXTS];

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
 * Invoke AnkiConnect API
 * @param {string} action - The action to perform
 * @param {object} params - Parameters for the action
 * @returns {Promise<any>} - The response from AnkiConnect
 */
async function invoke(action, params = {}) {
  const requestBody = JSON.stringify({
    action,
    version: 6,
    params
  });

  try {
    const response = await fetch(`http://localhost:${ANKI_PORT}`, {
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
    console.error('AnkiConnect error:', error);
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
  try {
    return await invoke('deckNames');
  } catch (error) {
    console.error('Failed to get deck names:', error);
    return ['Default'];
  }
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
  try {
    return await invoke('modelNames');
  } catch (error) {
    console.error('Failed to get note types:', error);
    return [];
  }
}

/**
 * Map question type to Anki note type
 * @param {string} questionType - The question type from the quiz
 * @param {object} question - The question object (optional, for cloze detection)
 * @returns {string} - The corresponding Anki note type
 */
export function mapQuestionTypeToNoteType(questionType, question = null) {
  // If we have a question object, check if it contains cloze deletions
  if (question && questionHasClozes(question)) {
    return 'Cloze';
  }
  
  switch (questionType?.toUpperCase()) {
    case 'CLOZE':
      return 'Cloze';
    case 'T-F':
    case 'T-P':
      return 'T-F';
    case 'SHORT':
      return 'Short';
    default:
      return 'Basic';
  }
}

/**
 * Extract media links from markdown content
 * @param {string} content - Markdown content
 * @returns {Array} - Array of media file information
 */
export function extractMediaLinks(content) {
  if (!content) return [];
  
  const mediaLinks = [];
  
  // Extract Obsidian-style media links: ![[filename]]
  const obsidianMediaRegex = /!\[\[([^\]]+)\]\]/g;
  let match;
  
  while ((match = obsidianMediaRegex.exec(content)) !== null) {
    const filename = match[1];
    const extension = filename.substring(filename.lastIndexOf('.')).toLowerCase();
    
    if (SUPPORTED_MEDIA_EXTS.includes(extension)) {
      mediaLinks.push({
        original: match[0],
        filename: filename,
        displayText: filename,
        extension: extension,
        isAudio: AUDIO_EXTS.includes(extension),
        isImage: IMAGE_EXTS.includes(extension)
      });
    }
  }
  
  // Extract markdown-style media links: ![alt](src)
  const markdownMediaRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  
  while ((match = markdownMediaRegex.exec(content)) !== null) {
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
        isAudio: AUDIO_EXTS.includes(extension),
        isImage: IMAGE_EXTS.includes(extension),
        src: src
      });
    }
  }
  
  return mediaLinks;
}

/**
 * Extract audio references with AUDIO: prefix from markdown content
 * @param {string} content - Markdown content
 * @returns {Array} - Array of audio file information with AUDIO: prefix
 */
export function extractAudioReferences(content) {
  if (!content) return [];
  
  const audioRefs = [];
  
  // Extract AUDIO: ![[filename]] pattern
  const audioRefRegex = /AUDIO:\s*!\[\[([^\]]+)\]\]/g;
  let match;
  
  while ((match = audioRefRegex.exec(content)) !== null) {
    const filename = match[1];
    const extension = filename.substring(filename.lastIndexOf('.')).toLowerCase();
    
    if (AUDIO_EXTS.includes(extension)) {
      audioRefs.push({
        original: match[0],
        filename: filename,
        displayText: filename,
        extension: extension,
        isAudio: true,
        isImage: false
      });
    }
  }
  
  return audioRefs;
}

/**
 * Process media files and upload them to Anki
 * @param {Array} mediaLinks - Array of media link objects
 * @returns {Promise<Object>} - Map of original filenames to Anki filenames
 */
export async function processMediaFiles(mediaLinks) {
  const mediaMap = {};
  
  for (const media of mediaLinks) {
    try {
      console.log(`Processing media file: ${media.filename}`);
      
      // Determine the correct file URL - handle both browser and Electron environments
      let fileUrl;
      
      // Check if running in Electron environment
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
        // Files are in the public/vault directory
        fileUrl = `${baseUrl}/vault/${media.filename}`;
      }
      
      console.log(`Attempting to load media from: ${fileUrl}`);
      
      try {
        // Check if we can use Electron's file reading capabilities
        if (window.electron && window.electron.readVaultImage) {
          try {
            console.log(`Attempting to read file via Electron API: ${media.filename}`);
            const dataUrl = await window.electron.readVaultImage(media.filename);
            
            if (dataUrl) {
              console.log(`File loaded via Electron as data URL: ${dataUrl.length} chars`);
              
              // Extract base64 data from data URL (remove "data:image/jpeg;base64," prefix)
              const base64Index = dataUrl.indexOf('base64,');
              if (base64Index === -1) {
                throw new Error('Invalid data URL format - no base64 data found');
              }
              
              const base64Data = dataUrl.substring(base64Index + 7); // Skip "base64,"
              console.log(`Successfully extracted base64 data: ${base64Data.length} chars`);
              
              // Upload to Anki using the base64 data
              const ankiFilename = await storeMediaFile(media.filename, base64Data);
              
              if (ankiFilename) {
                mediaMap[media.filename] = ankiFilename;
                console.log(`Successfully uploaded to Anki: ${media.filename} -> ${ankiFilename}`);
              } else {
                console.warn(`Anki returned no filename for: ${media.filename}, using original`);
                mediaMap[media.filename] = media.filename;
              }
              continue; // Skip to next media file
            }
          } catch (electronError) {
            console.warn(`Electron file reading failed for ${media.filename}, falling back to fetch:`, electronError);
          }
        }
        
        // Fallback to fetch method (for browser or when Electron method fails)
        console.log(`Attempting to fetch file: ${fileUrl}`);
        const response = await fetch(fileUrl);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText} for ${fileUrl}`);
        }
        
        // Get the file as ArrayBuffer for more efficient binary handling
        const arrayBuffer = await response.arrayBuffer();
        console.log(`File loaded successfully: ${arrayBuffer.byteLength} bytes`);
        
        // Convert ArrayBuffer to Base64
        const base64Data = arrayBufferToBase64(arrayBuffer);
        console.log(`Successfully converted ${media.filename} to base64 (${base64Data.length} chars)`);
        
        // Upload to Anki using the base64 data
        const ankiFilename = await storeMediaFile(media.filename, base64Data);
        
        if (ankiFilename) {
          mediaMap[media.filename] = ankiFilename;
          console.log(`Successfully uploaded to Anki: ${media.filename} -> ${ankiFilename}`);
        } else {
          console.warn(`Anki returned no filename for: ${media.filename}, using original`);
          mediaMap[media.filename] = media.filename;
        }
        
      } catch (fileError) {
        console.error(`Failed to process file ${fileUrl}:`, fileError);
        // Use original filename as fallback
        mediaMap[media.filename] = media.filename;
      }
      
    } catch (error) {
      console.error(`Failed to upload media file ${media.filename}:`, error);
      // Use original filename as fallback
      mediaMap[media.filename] = media.filename;
    }
  }
  
  return mediaMap;
}

/**
 * Fix cloze numbering in text and handle LaTeX within cloze fields
 * Convert {{c1:[content]}} to {{c1::content}}, {{c2::content}}, etc.
 * @param {string} text - Text containing cloze deletions
 * @returns {string} - Text with sequential cloze numbering and processed LaTeX
 */
export function fixClozeNumbering(text) {
  if (!text) return '';
  
  let counter = 1;
  
  // Handle new syntax {{c1:[content]}} and convert to proper Anki format
  let result = text.replace(/\{\{c(\d*)?:\[([^\]]+)\]\}\}/g, (match, number, content) => {
    // Process LaTeX within the cloze content
    const processedContent = processLatexInContent(content);
    // Use provided number or assign sequential number
    const clozeNumber = number || counter++;
    return `{{c${clozeNumber}::${processedContent}}}`;
  });
  
  // Renumber any existing numbered clozes to ensure sequential numbering
  const allClozes = result.match(/\{\{c\d+::[^}]+\}\}/g) || [];
  if (allClozes.length > 0) {
    // Reset counter and renumber all clozes sequentially
    counter = 1;
    result = result.replace(/\{\{c\d+::([^}]+)\}\}/g, (match, content) => {
      // Process LaTeX within the cloze content
      const processedContent = processLatexInContent(content);
      return `{{c${counter++}::${processedContent}}}`;
    });
  }
  
  return result;
}

/**
 * Process LaTeX within cloze content
 * @param {string} content - Content that may contain LaTeX
 * @returns {string} - Content with LaTeX converted for Anki
 */
function processLatexInContent(content) {
  if (!content) return content;
  
  // Convert LaTeX within the content
  return content
    // Display math: $$...$$
    .replace(/\$\$([\s\S]*?)\$\$/g, (match, latex) => convertLatexForAnki(latex.trim(), true))
    // Inline math: $...$
    .replace(/\$([^$\n]+)\$/g, (match, latex) => convertLatexForAnki(latex.trim(), false));
}

/**
 * Process LaTeX in text while avoiding LaTeX inside cloze deletions
 * @param {string} text - Text to process
 * @param {RegExp} latexRegex - Regex to match LaTeX
 * @param {boolean} isDisplay - Whether it's display math
 * @returns {string} - Text with LaTeX processed, but cloze contents preserved
 */
function processLatexAvoidingClozes(text, latexRegex, isDisplay) {
  if (!text) return text;
  
  // First, extract all cloze deletions and their positions
  // Matches: {{c1:[content]}} and {{c1::content}}
  const clozeRegex = /\{\{c(\d+)?(::|:\[)[^\}]+\}\}/g;
  const clozes = [];
  let match;
  
  while ((match = clozeRegex.exec(text)) !== null) {
    clozes.push({
      start: match.index,
      end: match.index + match[0].length,
      content: match[0]
    });
  }
  
  // Process LaTeX, but skip any matches that are inside cloze deletions
  return text.replace(latexRegex, (latexMatch, latex, offset) => {
    // Check if this LaTeX match is inside any cloze deletion
    const matchStart = offset;
    const matchEnd = offset + latexMatch.length;
    
    for (const cloze of clozes) {
      if (matchStart >= cloze.start && matchEnd <= cloze.end) {
        // This LaTeX is inside a cloze deletion, don't process it here
        return latexMatch;
      }
    }
    
    // This LaTeX is not inside a cloze deletion, process it normally
    return convertLatexForAnki(latex.trim(), isDisplay);
  });
}

/**
 * Store media file in Anki by path
 * @param {string} filename - Name of the file
 * @param {string} path - Path to the file
 * @returns {Promise<string>} - Filename in Anki
 */
export async function storeMediaFileByPath(filename, path) {
  try {
    return await invoke('storeMediaFile', {
      filename,
      path
    });
  } catch (error) {
    console.error('Failed to store media file by path:', error);
    throw error;
  }
}

/**
 * Store media file in Anki by base64 data
 * @param {string} filename - Name of the file
 * @param {string} data - Base64 encoded file data
 * @returns {Promise<string>} - Filename in Anki
 */
export async function storeMediaFile(filename, data) {
  try {
    console.log(`Storing media file in Anki: ${filename} (${data.length} chars of base64 data)`);
    
    const result = await invoke('storeMediaFile', {
      filename,
      data
    });
    
    console.log(`AnkiConnect storeMediaFile result:`, result);
    
    // AnkiConnect returns the filename if successful, null if failed
    if (result !== null && result !== undefined) {
      return result;
    } else {
      console.warn(`AnkiConnect returned null/undefined for ${filename}`);
      return filename; // Use original filename as fallback
    }
  } catch (error) {
    console.error(`Failed to store media file ${filename}:`, error);
    throw error;
  }
}

/**
 * Convert a file to base64 data (legacy method using FileReader)
 * @param {string} fileUrl - URL to the file
 * @returns {Promise<string>} - Base64 encoded data
 * @deprecated Use processMediaFiles with ArrayBuffer approach instead
 */
export async function fileToBase64(fileUrl) {
  try {
    console.log(`Fetching file (legacy method): ${fileUrl}`);
    
    // Fetch the file
    const response = await fetch(fileUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText} for ${fileUrl}`);
    }
    
    const blob = await response.blob();
    console.log(`File loaded successfully: ${blob.size} bytes, type: ${blob.type}`);
    
    // Convert blob to base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const dataUrl = reader.result;
          if (!dataUrl || typeof dataUrl !== 'string') {
            reject(new Error('FileReader result is not a valid string'));
            return;
          }
          
          // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
          const base64Index = dataUrl.indexOf('base64,');
          if (base64Index === -1) {
            reject(new Error('Invalid data URL format - no base64 data found'));
            return;
          }
          
          const base64 = dataUrl.substring(base64Index + 7); // Skip "base64,"
          console.log(`File converted to base64: ${base64.length} characters`);
          resolve(base64);
        } catch (error) {
          reject(new Error(`Error processing FileReader result: ${error.message}`));
        }
      };
      reader.onerror = () => {
        reject(new Error(`FileReader error: ${reader.error?.message || 'Unknown error'}`));
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error(`Failed to convert file to base64 (${fileUrl}):`, error);
    throw error;
  }
}

/**
 * Convert LaTeX to Anki-compatible format
 * @param {string} latex - LaTeX expression
 * @param {boolean} isDisplay - Whether it's display math or inline
 * @returns {string} - Anki-compatible LaTeX
 */
export function convertLatexForAnki(latex, isDisplay = false) {
  if (!latex) return '';
  
  // Keep LaTeX in original format for Anki
  if (isDisplay) {
    // Display math: $$ ... $$
    return `$$${latex}$$`;
  } else {
    // Inline math: $ ... $
    return `$${latex}$`;
  }
}

/**
 * Convert markdown table to HTML table for Anki with LaTeX support
 * @param {string} tableMarkdown - Markdown table
 * @returns {string} - HTML table
 */
export function convertTableToHtml(tableMarkdown) {
  if (!tableMarkdown) return '';
  
  const lines = tableMarkdown.trim().split('\n').filter(line => line.trim());
  if (lines.length < 2) return tableMarkdown;
  
  // Find the separator line (usually the second line with |---|---|)
  let separatorIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('---') || lines[i].includes(':--') || lines[i].includes('--:')) {
      separatorIndex = i;
      break;
    }
  }
  
  if (separatorIndex === -1) {
    // No proper separator found, treat as regular content
    return tableMarkdown;
  }
  
  let html = '<table border="1" style="border-collapse: collapse;">';
  
  // Function to process cell content (preserve LaTeX and cloze deletions, process other markdown)
  const processCellContent = (cell) => {
    let processedCell = cell;
    
    // Keep LaTeX and cloze deletions as-is for Anki to handle
    // Only process basic markdown that doesn't interfere with Anki processing
    processedCell = processedCell
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // Bold
      .replace(/\*(.*?)\*/g, '<em>$1</em>')              // Italic
      .replace(/`([^`]+)`/g, '<code>$1</code>');         // Inline code
    
    return processedCell;
  };
  
  // Process header (lines before separator)
  if (separatorIndex > 0) {
    html += '<thead>';
    for (let i = 0; i < separatorIndex; i++) {
      const headerCells = lines[i].split('|').map(cell => cell.trim()).filter(cell => cell);
      if (headerCells.length > 0) {
        html += '<tr>';
        headerCells.forEach(cell => {
          html += `<th style="padding: 8px; background-color: #f0f0f0;">${processCellContent(cell)}</th>`;
        });
        html += '</tr>';
      }
    }
    html += '</thead>';
  }
  
  // Process body (lines after separator)
  if (lines.length > separatorIndex + 1) {
    html += '<tbody>';
    for (let i = separatorIndex + 1; i < lines.length; i++) {
      const rowCells = lines[i].split('|').map(cell => cell.trim()).filter(cell => cell);
      if (rowCells.length > 0) {
        html += '<tr>';
        rowCells.forEach(cell => {
          html += `<td style="padding: 8px;">${processCellContent(cell)}</td>`;
        });
        html += '</tr>';
      }
    }
    html += '</tbody>';
  }
  
  html += '</table>';
  return html;
}

/**
 * Convert code block to HTML for Anki
 * @param {string} code - Code content
 * @param {string} language - Programming language
 * @returns {string} - HTML code block
 */
export function convertCodeBlockToHtml(code, language = '') {
  if (!code) return '';
  
  // Don't escape HTML characters here - Anki will handle this properly
  // Just preserve the code as-is with proper formatting
  const lines = code.split('\n');
  const formattedCode = lines.map(line => line).join('\n');
  
  // Use a more minimal approach that preserves formatting
  return `<div style="background-color: #f8f8f8; border: 1px solid #ddd; border-radius: 4px; padding: 12px; margin: 8px 0; font-family: 'Courier New', Courier, monospace; white-space: pre-wrap; overflow-x: auto;"><code class="language-${language}">${formattedCode}</code></div>`;
}
/**
 * Convert markdown content to HTML for Anki with proper media handling
 * @param {string} content - Markdown content
 * @param {object} question - Question object with orderedElements
 * @param {boolean} preserveTables - Whether to preserve tables as markdown (default: true for Anki)
 * @returns {Promise<string>} - HTML content with proper media handling
 */
export async function convertMarkdownToHtmlAdvanced(content, question = null, preserveTables = true) {
  if (!content) return '';
  
  let html = content;
  
  // Extract and process media files first
  const mediaLinks = extractMediaLinks(content);
  console.log('Found media links:', mediaLinks.length, mediaLinks);
  
  let mediaMap = {};
  if (mediaLinks.length > 0) {
    try {
      mediaMap = await processMediaFiles(mediaLinks);
      console.log('Media processing result:', mediaMap);
    } catch (error) {
      console.warn('Error processing media files:', error);
    }
  }
  
  // If we have orderedElements from the question parser, use those for better processing
  if (question && question.orderedElements) {
    html = '';
    
    for (const element of question.orderedElements) {
      switch (element.type) {
        case 'text':
          // Process basic markdown in text
          let textHtml = element.content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`([^`]+)`/g, '<code>$1</code>');
          html += textHtml;
          break;
          
        case 'latex':
          if (element.content?.latex) {
            const isDisplay = element.content.latexType === 'display';
            html += convertLatexForAnki(element.content.latex, isDisplay);
          }
          break;
          
        case 'image':
          // Handle images with proper media processing
          const imageName = element.content;
          const processedImageName = mediaMap[imageName] || imageName;
          
          if (AUDIO_EXTS.includes(imageName.substring(imageName.lastIndexOf('.')).toLowerCase())) {
            // Audio file
            html += `[sound:${processedImageName}]`;
          } else {
            // Image file
            html += `<img src="${processedImageName}" alt="Question Image" style="max-width: 500px; height: auto;">`;
          }
          break;
          
        case 'codeBlock':
          if (element.content?.code) {
            html += convertCodeBlockToHtml(element.content.code, element.content.lang);
          }
          break;
          
        case 'table':
          if (preserveTables) {
            // Keep table as markdown for Anki export
            html += element.content;
          } else {
            // Convert to HTML for display
            html += convertTableToHtml(element.content);
          }
          break;
          
        case 'latexPlaceholder':
          // This is already processed text with LaTeX, just add it
          html += element.content;
          break;
          
        default:
          html += element.content || '';
          break;
      }
    }
  } else {
    // Fallback: process content with regex (less accurate but works)
    
    // Process media first (based on Obsidian2Anki logic)
    for (const media of mediaLinks) {
      const processedFilename = mediaMap[media.filename] || media.filename;
      
      if (media.isAudio) {
        // Audio file: replace with Anki audio syntax
        html = html.replace(new RegExp(escapeRegexStr(media.original), 'g'), `[sound:${processedFilename}]`);
      } else if (media.isImage) {
        // Image file: replace with HTML img tag
        html = html.replace(new RegExp(escapeRegexStr(media.original), 'g'), 
          `<img src="${processedFilename}" alt="${media.displayText}" style="max-width: 500px; height: auto;">`);
      }
    }
    
    // Process LaTeX (but avoid LaTeX inside cloze deletions)
    // Display math: $$...$$
    html = processLatexAvoidingClozes(html, /\$\$([\s\S]*?)\$\$/g, true);
    
    // Inline math: $...$
    html = processLatexAvoidingClozes(html, /\$([^$\n]+)\$/g, false);
    
    // Process code blocks
    html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (match, lang, code) => {
      return convertCodeBlockToHtml(code.trim(), lang);
    });
    
    // Process inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Process tables - preserve as markdown for Anki, convert to HTML for display
    if (preserveTables) {
      // Keep tables as markdown for Anki export (preserves cloze deletions)
      // Tables are already in markdown format, no conversion needed
    } else {
      // Convert tables to HTML for display
      html = html.replace(/(\|.*\|[\s]*\n)+/g, (match) => {
        return convertTableToHtml(match.trim());
      });
    }
    
    // Process basic markdown
    html = html
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\s*\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
  }
  
  // Clean up extra spaces and line breaks
  html = html
    .replace(/\s+/g, ' ')
    .replace(/(<br>\s*){3,}/g, '<br><br>')
    .trim();
    
  return html;
}

/**
 * Convert markdown content to HTML for Anki (legacy function for backwards compatibility)
 * @param {string} content - Markdown content
 * @returns {string} - HTML content
 */
export function convertMarkdownToHtml(content) {
  // Simple synchronous version for backwards compatibility
  if (!content) return '';
  
  let html = content
    // Process LaTeX (but avoid LaTeX inside cloze deletions)
    .replace(/\$\$([\s\S]*?)\$\$/g, (match, latex, offset) => {
      // Check if this LaTeX is inside a cloze deletion
      const beforeMatch = content.substring(0, offset);
      const afterMatch = content.substring(offset + match.length);
      const clozeStart = beforeMatch.lastIndexOf('{{c');
      const clozeEnd = afterMatch.indexOf('}}');
      
      if (clozeStart !== -1 && clozeEnd !== -1) {
        const potentialCloze = content.substring(clozeStart, offset + match.length + clozeEnd + 2);
        if (/\{\{c(\d+)?(::|:\[)[^}]+\}\}/.test(potentialCloze)) {
          return match; // Don't process LaTeX inside cloze
        }
      }
      
      return convertLatexForAnki(latex.trim(), true);
    })
    .replace(/\$([^$\n]+)\$/g, (match, latex, offset) => {
      // Check if this LaTeX is inside a cloze deletion
      const beforeMatch = content.substring(0, offset);
      const afterMatch = content.substring(offset + match.length);
      const clozeStart = beforeMatch.lastIndexOf('{{c');
      const clozeEnd = afterMatch.indexOf('}}');
      
      if (clozeStart !== -1 && clozeEnd !== -1) {
        const potentialCloze = content.substring(clozeStart, offset + match.length + clozeEnd + 2);
        if (/\{\{c(\d+)?(::|:\[)[^}]+\}\}/.test(potentialCloze)) {
          return match; // Don't process LaTeX inside cloze
        }
      }
      
      return convertLatexForAnki(latex.trim(), false);
    })
    // Process code blocks
    .replace(/```(\w*)\n?([\s\S]*?)```/g, (match, lang, code) => {
      return convertCodeBlockToHtml(code.trim(), lang);
    })
    // Process inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Process images
    .replace(/!\[\[([^\]]+)\]\]/g, '<br><img src="$1" alt="Question Image" style="max-width: 500px;"><br>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<br><img src="$2" alt="$1" style="max-width: 500px;"><br>')
    // Process tables
    .replace(/(\|.*\|[\s]*\n)+/g, (match) => convertTableToHtml(match.trim()))
    // Basic markdown
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n\s*\n/g, '<br><br>')
    .replace(/\n/g, '<br>')
    .replace(/\s+/g, ' ')
    .replace(/(<br>\s*){3,}/g, '<br><br>')
    .trim();
    
  return html;
}

/**
 * Process markdown content for Anki with selective conversion
 * - Images: Convert to HTML and upload to Anki
 * - Tables: Convert to HTML for proper display
 * - Everything else: Keep as raw markdown
 * @param {string} content - Markdown content
 * @param {object} question - Question object with orderedElements (optional)
 * @returns {Promise<string>} - Processed content
 */
export async function processContentForAnki(content, question = null) {
  if (!content) return '';
  
  let processedContent = content;
  
  // Step 1: Extract and process media files
  const mediaLinks = extractMediaLinks(content);
  console.log(`Found ${mediaLinks.length} media links:`, mediaLinks.map(m => m.filename));
  
  let mediaMap = {};
  if (mediaLinks.length > 0) {
    console.log('Processing media files...');
    try {
      mediaMap = await processMediaFiles(mediaLinks);
      console.log('Media processing completed:', mediaMap);
    } catch (error) {
      console.error('Error processing media files:', error);
      // Create fallback mapping using original filenames
      mediaLinks.forEach(media => {
        mediaMap[media.filename] = media.filename;
      });
    }
  }
  
  // Step 2: Replace image references with HTML img tags
  for (const media of mediaLinks) {
    if (media.isImage) {
      const processedImageName = mediaMap[media.filename] || media.filename;
      const imgTag = `<img src="${processedImageName}" alt="${media.displayText}" style="max-width: 500px; height: auto;">`;
      processedContent = processedContent.replace(
        new RegExp(escapeRegex(media.original), 'g'),
        imgTag
      );
      console.log(`Replaced image: ${media.original} -> ${imgTag}`);
    } else if (media.isAudio) {
      const processedAudioName = mediaMap[media.filename] || media.filename;
      const audioTag = `[sound:${processedAudioName}]`;
      processedContent = processedContent.replace(
        new RegExp(escapeRegex(media.original), 'g'),
        audioTag
      );
      console.log(`Replaced audio: ${media.original} -> ${audioTag}`);
    }
  }
  
  // Step 3: Keep tables as markdown for Anki (do not convert to HTML)
  // This preserves cloze deletions and other markdown syntax within table cells
  const tableRegex = /(\|[^\n]*\|[\s]*\n[\s]*\|[^\n]*\|[\s]*\n(?:\|[^\n]*\|[\s]*\n)*)/g;
  const tables = processedContent.match(tableRegex);
  if (tables) {
    console.log(`Found ${tables.length} markdown tables - preserving as markdown for Anki export`);
    // Tables are already in markdown format, no conversion needed for Anki
  }
  
  return processedContent;
}

/**
 * Escape regex special characters
 * @param {string} string - String to escape
 * @returns {string} - Escaped string
 */
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Prepare question content for Anki (async version)
 * @param {object} question - Question object
 * @param {string} noteType - Override note type (optional)
 * @returns {Promise<object>} - Prepared fields for Anki
 */
export async function prepareQuestionForAnkiAsync(question, noteType = null) {
  console.log('🔧 PREPARE DEBUG - Starting preparation for question:', question.id);
  console.log('🔧 PREPARE DEBUG - Question rawText:', question.rawText);
  console.log('🔧 PREPARE DEBUG - Question text:', question.text);
  
  const finalNoteType = noteType || mapQuestionTypeToNoteType(question.type, question);
  console.log('🔧 PREPARE DEBUG - Final note type:', finalNoteType);
  
  // Get available fields for this note type
  const availableFields = await getNoteTypeFields(finalNoteType);
  console.log('🔧 PREPARE DEBUG - Available fields:', availableFields);
  
  const fields = {};
  
  // Get question text (use raw markdown, prefer rawText over processed text)
  let questionText = '';
  let explanationText = '';
  
  // Use raw markdown content as base, then process selectively
  if (question.rawText) {
    questionText = question.rawText;
    console.log('🔧 PREPARE DEBUG - Using rawText for questionText:', questionText);
  } else if (question.text) {
    questionText = question.text;
    console.log('🔧 PREPARE DEBUG - Using text for questionText (rawText not available):', questionText);
  }
  
  // Handle explanation text - use raw markdown
  if (question.rawExplanation) {
    explanationText = question.rawExplanation;
    console.log('🔧 PREPARE DEBUG - Using rawExplanation:', explanationText);
  } else if (question.explanation) {
    explanationText = question.explanation;
    console.log('🔧 PREPARE DEBUG - Using explanation (rawExplanation not available):', explanationText);
  }
  
  console.log('🔧 PREPARE DEBUG - Before processing:');
  console.log('  - questionText:', questionText);
  console.log('  - explanationText:', explanationText);
  
  // Extract audio references from question content to handle separately
  let audioRefs = extractAudioReferences(questionText);
  console.log('🔧 PREPARE DEBUG - Found audio references from text:', audioRefs);
  
  // Also check if question has audioFile property (from bookmark parsing)
  if (question.audioFile) {
    console.log('🔧 PREPARE DEBUG - Found audioFile property:', question.audioFile);
    // Add the audioFile to audioRefs if not already there
    const filename = question.audioFile;
    const extension = filename.substring(filename.lastIndexOf('.')).toLowerCase();
    
    if (AUDIO_EXTS.includes(extension)) {
      // Check if this audio file is not already in audioRefs
      const exists = audioRefs.some(ref => ref.filename === filename);
      if (!exists) {
        audioRefs.push({
          original: `AUDIO: ![[${filename}]]`, // Reconstruct for consistency
          filename: filename,
          displayText: filename,
          extension: extension,
          isAudio: true,
          isImage: false
        });
      }
    }
  }
  
  console.log('🔧 PREPARE DEBUG - Final audio references:', audioRefs);
  
  // Remove AUDIO: references from question text (they'll be added to the back side)
  let cleanQuestionText = questionText;
  audioRefs.forEach(audioRef => {
    cleanQuestionText = cleanQuestionText.replace(audioRef.original, '').trim();
  });
  
  // Process content for Anki (images to HTML, tables to HTML, keep rest as markdown)
  if (cleanQuestionText.trim()) {
    // For cloze cards, fix cloze numbering BEFORE processing content
    if (finalNoteType === 'Cloze') {
      const beforeFix = cleanQuestionText;
      cleanQuestionText = fixClozeNumbering(cleanQuestionText);
      console.log('🔧 PREPARE DEBUG - Cloze numbering fix:');
      console.log('  - Before:', beforeFix);
      console.log('  - After:', cleanQuestionText);
    }
    cleanQuestionText = await processContentForAnki(cleanQuestionText, question);
    console.log('🔧 PREPARE DEBUG - After processContentForAnki:', cleanQuestionText);
  }
  
  // Process audio references and create audio content for back side
  let audioContent = '';
  if (audioRefs.length > 0) {
    console.log('🔧 PREPARE DEBUG - Processing audio references...');
    try {
      const audioMediaMap = await processMediaFiles(audioRefs);
      console.log('🔧 PREPARE DEBUG - Audio processing result:', audioMediaMap);
      
      // Create audio tags for Anki
      audioRefs.forEach(audioRef => {
        const processedFilename = audioMediaMap[audioRef.filename] || audioRef.filename;
        audioContent += `[sound:${processedFilename}] `;
      });
      audioContent = audioContent.trim();
      console.log('🔧 PREPARE DEBUG - Generated audio content:', audioContent);
    } catch (error) {
      console.warn('🔧 PREPARE DEBUG - Error processing audio files:', error);
    }
  }
  
  if (explanationText.trim()) {
    // For cloze cards, fix cloze numbering BEFORE processing content
    if (finalNoteType === 'Cloze' && hasClozes(explanationText)) {
      const beforeFix = explanationText;
      explanationText = fixClozeNumbering(explanationText);
      console.log('🔧 PREPARE DEBUG - Explanation cloze numbering fix:');
      console.log('  - Before:', beforeFix);
      console.log('  - After:', explanationText);
    }
    explanationText = await processContentForAnki(explanationText, question);
    console.log('🔧 PREPARE DEBUG - Explanation after processContentForAnki:', explanationText);
  }
  
  // Ensure we have at least some content
  if (!cleanQuestionText.trim()) {
    cleanQuestionText = 'No question text available';
  }
  
  console.log('🔧 PREPARE DEBUG - Final processed content:');
  console.log('  - cleanQuestionText:', cleanQuestionText);
  console.log('  - explanationText:', explanationText);
  console.log('  - audioContent:', audioContent);
  
  // Map fields based on what's available in the note type
  if (finalNoteType === 'Cloze') {
    // For cloze cards, content has already been processed above
    // Check for common Cloze field names
    const clozeTextFields = ['Text', 'Q', 'Front', 'Question'];
    const clozeExtraFields = ['Extra', 'E', 'A', 'Back', 'Notes'];
    
    const textField = clozeTextFields.find(field => availableFields.includes(field));
    if (textField) {
      fields[textField] = cleanQuestionText;
      console.log('🔧 PREPARE DEBUG - Set', textField, 'field for Cloze card:', fields[textField]);
    }
    
    // Set explanation in extra field if available
    if (explanationText.trim()) {
      const extraField = clozeExtraFields.find(field => availableFields.includes(field));
      if (extraField) {
        fields[extraField] = explanationText;
        console.log('🔧 PREPARE DEBUG - Set', extraField, 'field for Cloze card:', fields[extraField]);
      }
    }
    
    // Set audio content in dedicated AUDIO field if available
    if (audioContent && availableFields.includes('AUDIO')) {
      fields['AUDIO'] = audioContent;
      console.log('🔧 PREPARE DEBUG - Set AUDIO field for Cloze card:', fields['AUDIO']);
    }
  } else {
    // For other note types, use processed content
    const questionFieldNames = ['Front', 'Question', 'Prompt', 'Q'];
    const answerFieldNames = ['Back', 'Answer', 'Response', 'A'];
    const explanationFieldNames = ['Extra', 'Explanation', 'Notes', 'E'];
    
    console.log('🔧 PREPARE DEBUG - Looking for question field in:', questionFieldNames);
    console.log('🔧 PREPARE DEBUG - Available fields:', availableFields);
    
    // Set question field with processed content (without audio references)
    const questionField = questionFieldNames.find(field => availableFields.includes(field));
    console.log('🔧 PREPARE DEBUG - Found question field:', questionField);
    if (questionField) {
      fields[questionField] = cleanQuestionText;
      console.log('🔧 PREPARE DEBUG - Set', questionField, 'field for non-Cloze card:', fields[questionField]);
    } else {
      console.log('🔧 PREPARE DEBUG - NO QUESTION FIELD FOUND!');
    }
    
    // Set answer field with raw content (without adding audio here)
    const answerField = answerFieldNames.find(field => availableFields.includes(field));
    console.log('🔧 PREPARE DEBUG - Found answer field:', answerField);
    if (answerField) {
      fields[answerField] = question.answer || 'No answer provided';
      console.log('🔧 PREPARE DEBUG - Set', answerField, 'field for non-Cloze card:', fields[answerField]);
    } else {
      console.log('🔧 PREPARE DEBUG - NO ANSWER FIELD FOUND!');
    }
    
    // Set explanation field with processed content
    if (explanationText.trim()) {
      const explanationField = explanationFieldNames.find(field => availableFields.includes(field));
      console.log('🔧 PREPARE DEBUG - Found explanation field:', explanationField);
      if (explanationField) {
        fields[explanationField] = explanationText;
        console.log('🔧 PREPARE DEBUG - Set', explanationField, 'field for non-Cloze card:', fields[explanationField]);
      } else {
        console.log('🔧 PREPARE DEBUG - NO EXPLANATION FIELD FOUND!');
      }
    } else {
      console.log('🔧 PREPARE DEBUG - NO EXPLANATION TEXT TO SET');
    }
    
    // Set audio content in dedicated AUDIO field if available
    if (audioContent && availableFields.includes('AUDIO')) {
      fields['AUDIO'] = audioContent;
      console.log('🔧 PREPARE DEBUG - Set AUDIO field for non-Cloze card:', fields['AUDIO']);
    }
  }
  
  console.log('🔧 PREPARE DEBUG - Final fields object:', fields);
  
  return {
    noteType: finalNoteType,
    fields,
    tags: ['german-quiz', 'bookmark']
  };
}

/**
 * Add a note to Anki
 * @param {object} question - Question object
 * @param {string} deckName - Name of the deck to add to
 * @returns {Promise<number|null>} - Note ID if successful, null if failed
 */
export async function addNoteToAnki(question, deckName = 'Default') {
  try {
    console.log('🔧 ANKI EXPORT DEBUG - Starting export for question:', question.id);
    console.log('🔧 ANKI EXPORT DEBUG - Question type:', question.type);
    console.log('🔧 ANKI EXPORT DEBUG - Raw text:', question.rawText);
    console.log('🔧 ANKI EXPORT DEBUG - Processed text:', question.text);
    console.log('🔧 ANKI EXPORT DEBUG - Has clozes:', questionHasClozes(question));
    
    // First, check available note types
    const availableNoteTypes = await getNoteTypes();
    
    const preferredNoteType = mapQuestionTypeToNoteType(question.type, question);
    let finalNoteType = preferredNoteType;
    
    console.log('🔧 ANKI EXPORT DEBUG - Preferred note type:', preferredNoteType);
    
    if (!availableNoteTypes.includes(preferredNoteType)) {
      console.log(`Note type '${preferredNoteType}' not found, falling back to 'Basic'`);
      finalNoteType = 'Basic';
      if (!availableNoteTypes.includes('Basic')) {
        throw new Error(`Note type '${preferredNoteType}' not found and 'Basic' fallback also not available. Available types: ${availableNoteTypes.join(', ')}`);
      }
    }
    
    console.log('🔧 ANKI EXPORT DEBUG - Final note type:', finalNoteType);
    
    const { noteType, fields, tags } = await prepareQuestionForAnkiAsync(question, finalNoteType);
    
    console.log('🔧 ANKI EXPORT DEBUG - Prepared note:');
    console.log('  - Note type:', noteType);
    console.log('  - Fields:', fields);
    console.log('  - Tags:', tags);
    
    const note = {
      deckName,
      modelName: noteType,
      fields,
      tags
    };
    
    console.log('🔧 ANKI EXPORT DEBUG - Final note object being sent to Anki:', JSON.stringify(note, null, 2));
    
    const noteId = await invoke('addNote', { note });
    console.log('Note added successfully with ID:', noteId);
    return noteId;
  } catch (error) {
    console.error('Failed to add note to Anki:', error);
    throw error;
  }
}

/**
 * Check if required note types exist in Anki
 * @returns {Promise<object>} - Object with note type availability
 */
export async function checkNoteTypes() {
  try {
    const noteTypes = await getNoteTypes();
    return {
      'Cloze': noteTypes.includes('Cloze'),
      'T-F': noteTypes.includes('T-F'),
      'Short': noteTypes.includes('Short'),
      'Basic': noteTypes.includes('Basic')
    };
  } catch (error) {
    console.error('Failed to check note types:', error);
    return {
      'Cloze': false,
      'T-F': false,
      'Short': false,
      'Basic': false
    };
  }
}

/**
 * Get fields for a specific note type
 * @param {string} noteType - Name of the note type
 * @returns {Promise<string[]>} - Array of field names
 */
export async function getNoteTypeFields(noteType) {
  try {
    const result = await invoke('modelFieldNames', { modelName: noteType });
    return result || [];
  } catch (error) {
    console.error(`Failed to get fields for note type '${noteType}':`, error);
    return [];
  }
}

/**
 * Helper function to escape strings for regex
 * @param {string} str - String to escape
 * @returns {string} - Escaped string
 */
function escapeRegexStr(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Check if text contains cloze deletions
 * @param {string} text - Text to check
 * @returns {boolean} - Whether text contains cloze deletions
 */
export function hasClozes(text) {
  if (!text) return false;
  // Match cloze formats: {{c1:[content]}} and {{c1::content}}
  return /\{\{c(\d+)?(::|:\[)/.test(text);
}

/**
 * Check if a question object contains cloze deletions
 * @param {object} question - Question object
 * @returns {boolean} - Whether question contains cloze deletions
 */
export function questionHasClozes(question) {
  const textToCheck = question.rawText || question.text || '';
  const explanationToCheck = question.rawExplanation || question.explanation || '';
  
  return hasClozes(textToCheck) || hasClozes(explanationToCheck);
}
