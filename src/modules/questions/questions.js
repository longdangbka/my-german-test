// questions.js
// Dynamically load and parse all standard question files from public/vault

// Import ALL centralized cloze utilities for consistent processing across the entire parser
import { 
  findCloze, 
  replaceWithBlanks,
  extractClozeBlanksByGroup,
  extractAllClozeBlanks,
  ensureClozeQuestion,
  processClozeElements,
  hasCloze,
  validateClozeText,
  toIdAwareBlanks,
  toSequentialBlanks
} from '../../cloze.js';

export async function loadQuestionGroups(signal, filename = 'Question-Sample.md') {
  console.log('🔍 loadQuestionGroups - Starting with filename:', filename);
  const groups = [];

  try {
    let text;
    
    // Check if we're in an Electron environment
    if (window.electron && window.electron.readVaultFile) {
      // Force fresh read by including timestamp
      const timestamp = Date.now();
      console.log(`[Electron] Reading ${filename} with timestamp ${timestamp}`);
      text = await window.electron.readVaultFile(filename, timestamp);
      if (!text) {
        throw new Error(`Failed to load ${filename} via IPC`);
      }
      console.log(`[Electron] Successfully loaded ${filename} (${text.length} characters)`);
    } else {
      // Web environment - use fetch
      let vaultPath = '/vault/';
      if (typeof window !== 'undefined' && window.location && window.location.origin) {
        vaultPath = window.location.origin + '/vault/';
      }
      
      // Add cache-busting parameter to ensure fresh content
      const cacheBuster = Date.now();
      console.log(`[Web] Reading ${filename} with cache buster ${cacheBuster}`);
      const res = await fetch(vaultPath + filename + '?v=' + cacheBuster, { 
        signal,
        cache: 'no-cache', // Disable caching
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch ${filename}: ${res.status}`);
      }
      text = await res.text();
      console.log(`[Web] Successfully loaded ${filename} (${text.length} characters)`);
    }
    
    const parsed = parseStandardMarkdown(text);
    console.log('🔍 loadQuestionGroups - Parsed question groups:', parsed);
    groups.push(...parsed);
  } catch (error) {
    console.error(`Error loading ${filename}:`, error);
    throw error;
  }
  
  console.log('🔍 loadQuestionGroups - Final groups to return:', groups);
  return groups;
}

// helper: parse content preserving order of all elements (text, images, code, LaTeX, tables)
function parseContentWithOrder(text, isCloze = false) {
  const elements = [];
  let remaining = text;

  console.log('🔍 PARSE ORDER - Processing text:', text);
  console.log('🔍 PARSE ORDER - Is cloze question:', isCloze);
  
  // For CLOZE questions, validate the cloze content using centralized utilities
  if (isCloze) {
    const validation = validateClozeText(text);
    console.log('🔍 PARSE ORDER - Cloze validation:', validation);
    
    // CRITICAL FIX: For cloze questions, convert cloze markers to sequential blanks FIRST
    // before processing LaTeX, so that LaTeX inside cloze markers doesn't break the parsing
    // Use sequential blanks so each cloze marker gets its own unique input field
    remaining = toSequentialBlanks(remaining);
    console.log('🔍 PARSE ORDER - After cloze processing:', remaining);
  }

  // Create a list of all content patterns with their positions
  const patterns = [
    { type: 'image', regex: /!\[\[([^\]]+)\]\]/g },
    { type: 'codeBlock', regex: /```([\w-]*)\r?\n([\s\S]*?)```/g },
    { type: 'table', regex: /(^\|.+\|\r?\n\|[- :|]+\|\r?\n(?:\|.*\|\r?\n?)+)/gm },
    { type: 'latexDisplay', regex: /\$\$([\s\S]+?)\$\$/g },
    { type: 'latexInline', regex: /\$([^$\n]+?)\$/g }
  ];

  // Find all matches with their positions, but exclude overlapping ones
  const allMatches = [];
  
  patterns.forEach(pattern => {
    let match;
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    while ((match = regex.exec(remaining)) !== null) {
      allMatches.push({
        type: pattern.type,
        match: match,
        start: match.index,
        end: match.index + match[0].length,
        content: match[0]
      });
    }
  });

  // Sort by position and remove overlapping matches (prioritize longer/earlier matches)
  allMatches.sort((a, b) => a.start !== b.start ? a.start - b.start : b.end - a.end);
  
  const nonOverlappingMatches = [];
  for (const currentMatch of allMatches) {
    const hasOverlap = nonOverlappingMatches.some(existing => 
      (currentMatch.start < existing.end && currentMatch.end > existing.start)
    );
    if (!hasOverlap) {
      nonOverlappingMatches.push(currentMatch);
    }
  }

  // Sort again by position for processing
  nonOverlappingMatches.sort((a, b) => a.start - b.start);

  // Process matches in order, extracting text between them
  let currentPos = 0;
  const latexPlaceholders = [];
  let placeholderIndex = 0;

  nonOverlappingMatches.forEach(({ type, match, start, end, content }) => {
    // Add text before this match
    if (start > currentPos) {
      const textBefore = remaining.slice(currentPos, start).trim();
      if (textBefore) {
        // Text is already processed for cloze questions (above)
        elements.push({ type: 'text', content: textBefore });
      }
    }

    // Add the matched element
    switch (type) {
      case 'image':
        elements.push({ type: 'image', content: match[1] });
        break;
      case 'codeBlock':
        elements.push({ type: 'codeBlock', content: { lang: match[1], code: match[2] } });
        break;
      case 'table':
        // Table content is already processed for cloze questions (above)
        elements.push({ type: 'table', content: content });
        break;
      case 'latexDisplay':
        if (isCloze) {
          // For cloze, replace with placeholder in text
          const displayPlaceholder = `__LATEX_DISPLAY_${placeholderIndex}__`;
          elements.push({ type: 'latexPlaceholder', content: displayPlaceholder });
          latexPlaceholders.push({ placeholder: displayPlaceholder, original: content, latex: match[1], latexType: 'display' });
          placeholderIndex++;
        } else {
          elements.push({ type: 'latex', content: { latex: match[1], latexType: 'display' } });
        }
        break;
      case 'latexInline':
        if (isCloze) {
          // For cloze, replace with placeholder in text
          const inlinePlaceholder = `__LATEX_INLINE_${placeholderIndex}__`;
          elements.push({ type: 'latexPlaceholder', content: inlinePlaceholder });
          latexPlaceholders.push({ placeholder: inlinePlaceholder, original: content, latex: match[1], latexType: 'inline' });
          placeholderIndex++;
        } else {
          elements.push({ type: 'latex', content: { latex: match[1], latexType: 'inline' } });
        }
        break;
    }

    currentPos = end;
  });

  // Add remaining text
  if (currentPos < remaining.length) {
    const remainingText = remaining.slice(currentPos).trim();
    if (remainingText) {
      // Text is already processed for cloze questions (above)
      elements.push({ type: 'text', content: remainingText });
    }
  }

  return { elements, latexPlaceholders };
}

// Legacy function for backward compatibility - now uses the new ordered parsing
function extractContentElements(text, isCloze = false) {
  const { elements, latexPlaceholders } = parseContentWithOrder(text, isCloze);
  
  // Convert to old format for compatibility
  let cleanedText = '';
  const images = [];
  const codeBlocks = [];
  const latexBlocks = [];
  const htmlTables = [];

  elements.forEach(element => {
    switch (element.type) {
      case 'text':
      case 'latexPlaceholder':
        cleanedText += element.content + ' ';
        break;
      case 'image':
        images.push(element.content);
        break;
      case 'codeBlock':
        codeBlocks.push(element.content);
        break;
      case 'table':
        if (isCloze) {
          // For CLOZE questions, table content is already processed (clozes converted to blanks)
          // Just convert to HTML and store
          cleanedText += element.content + ' ';
          htmlTables.push(mdTableToHtml(element.content));
          // For ordered elements, store the HTML version
          element.content = mdTableToHtml(element.content);
        } else {
          htmlTables.push(mdTableToHtml(element.content));
          // For ordered elements, store the HTML version
          element.content = mdTableToHtml(element.content);
        }
        break;
      case 'latex':
        latexBlocks.push(element.content);
        break;
    }
  });

  return {
    text: cleanedText.trim(),
    images,
    codeBlocks,
    latexBlocks,
    htmlTables,
    latexPlaceholders,
    // New: preserve order information
    orderedElements: elements
  };
}

// helper: convert a markdown table block into an HTML <table>
function mdTableToHtml(md) {
  // split lines, remove any empty ones
  const lines = md.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return '';
  
  // header row
  const headers = lines[0]
    .trim()
    .split('|')
    .slice(1, -1)
    .map(h => h.trim());
  
  // data rows start after the separator line
  const rows = lines
    .slice(2)
    .map(line =>
      line
        .trim()
        .split('|')
        .slice(1, -1)
        .map(cell => cell.trim())
    );

  let html = '<table style="border-collapse: collapse; border: 1px solid black; width: 100%; text-align: left; font-size: 14px;">';
  html += '<thead style="background-color: #f2f2f2;"><tr>';
  headers.forEach(h => {
    html += `<th style="border: 1px solid black; padding: 10px;">${h}</th>`;
  });
  html += '</tr></thead><tbody>';

  rows.forEach(cells => {
    html += '<tr>';
    cells.forEach(c => {
      html += `<td style="border: 1px solid black; padding: 10px;">${c}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  return html;
}

function parseStandardMarkdown(md) {
  const groups = [];
  const headingRE = /^##\s+(.+)$/gm;
  const headings  = Array.from(md.matchAll(headingRE));

  for (let i = 0; i < headings.length; i++) {
    const num   = headings[i][1].trim();
    const headingText = headings[i][0].replace(/^#+\s*/, '').trim();
    const start = headings[i].index + headings[i][0].length;
    const end   = (i + 1 < headings.length)
                ? headings[i+1].index
                : md.length;
    const block = md.slice(start, end);

    console.log(`Processing section: ${num}`);

    // — Check for AUDIO: blocks in code sections (outside transcript/questions)
    let hasAudioBlock = false;
    let audioFilename = null;
    
    // Look for AUDIO: blocks in code sections
    const audioBlockMatch = block.match(/```[\s\S]*?AUDIO:\s*([\s\S]*?)```/im);
    if (audioBlockMatch) {
      hasAudioBlock = true;
      console.log(`Found AUDIO block in section: ${num}`);
      
      // Check if there's a ![[filename.mp3]] syntax in the AUDIO block
      const audioContent = audioBlockMatch[1];
      const audioFileMatch = audioContent.match(/!\[\[([^\]]+\.(mp3|wav|m4a|ogg|flac))\]\]/i);
      if (audioFileMatch) {
        audioFilename = audioFileMatch[1];
        console.log(`Found audio file reference: ${audioFilename}`);
      }
    }

    // — Extract the raw transcript up to "### Questions"
    const tMatch = block.match(
      /### Transcript\s*[\r\n]+([\s\S]*?)(?=### Questions|$)/i
    );
    let transcript = '';
    let transcriptElements = { images: [], codeBlocks: [], latexBlocks: [], htmlTables: [] };
    if (tMatch) {
      // remove ONLY the ``` fences—leave all internal newlines intact
      let rawTranscript = tMatch[1].replace(/```/g, '');
      // optionally drop a single leading newline if it exists
      if (rawTranscript.startsWith('\n')) {
        rawTranscript = rawTranscript.slice(1);
      }
      // Extract content elements from transcript
      const extracted = extractContentElements(rawTranscript);
      transcript = extracted.text;
      transcriptElements = {
        images: extracted.images,
        codeBlocks: extracted.codeBlocks,
        latexBlocks: extracted.latexBlocks,
        htmlTables: extracted.htmlTables
      };
    }

    // — Everything after "### Questions"
    const qMatch = block.match(
      /### Questions\s*[\r\n]+([\s\S]*)/i
    );
    const questionsSection = qMatch ? qMatch[1] : '';

    // — Pull out each question block using --- start-question ... --- end-question
    const codeBlocks = Array.from(
      questionsSection.matchAll(/--- start-question[\r\n]+([\s\S]*?)[\r\n]+--- end-question/g),
      m => m[1].trim()
    );

    // — Parse each question
    const questions = codeBlocks.map((code, idx) => {
      try {
        // AUDIO block detection
        if (/^AUDIO:\s*$/im.test(code)) {
          return {
            id:          `g${num}_q${idx+1}`,
            type:        'AUDIO',
            text:        'AUDIO:',
          };
        }
        
        // AUDIO block with file reference detection
        const audioWithFileMatch = code.match(/^AUDIO:\s*([\s\S]*?)$/im);
        if (audioWithFileMatch) {
          const audioContent = audioWithFileMatch[1].trim();
          const audioFileMatch = audioContent.match(/!\[\[([^\]]+\.(mp3|wav|m4a|ogg|flac))\]\]/i);
          if (audioFileMatch) {
            const audioFilename = audioFileMatch[1];
            console.log(`Found AUDIO question with file: ${audioFilename}`);
            return {
              id:          `g${num}_q${idx+1}`,
              type:        'AUDIO',
              text:        'AUDIO:',
              audioFile:   audioFilename,
            };
          }
        }
        const typeM = code.match(/^TYPE:\s*(CLOZE|T-F|Short)$/im);
        const type  = typeM ? typeM[1].toUpperCase() : null;
        
        console.log('🔍 QUESTION PARSE - Raw code:', code);
        console.log('🔍 QUESTION PARSE - Type match:', typeM);
        console.log('🔍 QUESTION PARSE - Detected type:', type);

        if (!type) {
          console.warn(`No type found for question ${idx + 1} in section ${num}`);
          return null;
        }
        
        // — Multiline Q: block extraction, preserving ALL internal new-lines
      let qT = '';
      let images = [];
      let codeBlocks = [];
      let latexBlocks = [];
      let htmlTables = [];
      let latexPlaceholders = [];
      let questionOrderedElements = []; // Initialize outside the if block
      let rawQ = ''; // Initialize rawQ outside the if block
      const qMatch = code.match(
        /^Q:\s*([\s\S]*?)(?=\r?\n(?:A:|E:|---\s*end-question))/m
      );
      if (qMatch) {
        // For all questions, extract content - use LaTeX protection for CLOZE
        rawQ = qMatch[1].replace(/^\r?\n/, '');  // drop just one leading newline
        const extracted = extractContentElements(rawQ, type === 'CLOZE');
        qT = extracted.text;
        images = extracted.images;
        codeBlocks = extracted.codeBlocks;
        latexBlocks = extracted.latexBlocks;
        htmlTables = extracted.htmlTables;
        questionOrderedElements = extracted.orderedElements;
        
        // Store LaTeX placeholders for CLOZE restoration
        if (type === 'CLOZE' && extracted.latexPlaceholders) {
          latexPlaceholders = extracted.latexPlaceholders;
        }
      }

      const aM = code.match(/^A:\s*([\s\S]*?)$/im);
      const aT = aM ? aM[1].trim() : '';

      // Multiline explanation: everything after E: up to --- end-question
      const eIdx = code.search(/^E:/m);
      let eT = '';
      let rawE = ''; // Initialize rawE outside the if block
      let explanationImages = [];
      let explanationCodeBlocks = [];
      let explanationLatexBlocks = [];
      let explanationHtmlTables = [];
      let explanationOrderedElements = [];
      if (eIdx !== -1) {
        // Find the start of the "E:" block
        const eStart = code.indexOf('E:', eIdx) + 2;
        // Try to locate the explicit end‐marker so we don't grab the next question
        const eEnd = code.indexOf('--- end-question', eStart);

        // Slice out exactly the block we want, preserving ALL \n and whitespace
        if (eEnd !== -1) {
          rawE = code.slice(eStart, eEnd);
        } else {
          // fallback: everything after E:
          rawE = code.slice(eStart);
        }

        // Drop exactly one leading newline (if there is one), but nothing else
        rawE = rawE.replace(/^\r?\n/, '');
        
        // Extract content elements from explanation text
        const extracted = extractContentElements(rawE);
        eT = extracted.text;
        explanationImages = extracted.images;
        explanationCodeBlocks = extracted.codeBlocks;
        explanationLatexBlocks = extracted.latexBlocks;
        explanationHtmlTables = extracted.htmlTables;
        explanationOrderedElements = extracted.orderedElements;
      }

      if (type === 'CLOZE') {
        console.log('🔍 MAIN PARSER - Processing CLOZE question. Raw Q:', rawQ);
        
        // Validate cloze content for debugging
        const validation = validateClozeText(rawQ);
        console.log('🔍 MAIN PARSER - Cloze validation:', validation);
        
        // Use centralized cloze utilities for consistent processing
        const clozeData = findCloze(rawQ);
        console.log('🔍 MAIN PARSER - Found cloze markers:', clozeData);
        
        // Extract blanks individually (not grouped by ID) for proper form handling
        let blanks = extractAllClozeBlanks(rawQ);
        console.log('🔍 MAIN PARSER - Extracted blanks:', blanks);

        // CRITICAL FIX: If no blanks found but cloze markers exist, ensure we create blanks
        if (blanks.length === 0 && hasCloze(rawQ)) {
          console.warn('� MAIN PARSER - Found cloze markers but no blanks extracted!');
          console.warn('🚨 MAIN PARSER - Raw text that failed:', rawQ);
          // Try to extract individual cloze content as fallback
          blanks = clozeData.map(cloze => cloze.content);
          console.log('🔍 MAIN PARSER - Fallback blanks:', blanks);
        }

        // Use centralized replaceWithBlanks function for consistent display
        let text = replaceWithBlanks(rawQ);
        console.log('🔍 MAIN PARSER - Processed text with blanks:', text);

        // CRITICAL FIX: Ensure blanks array is populated for cloze questions
        if (blanks.length === 0 && text.includes('_____')) {
          console.log('🔍 MAIN PARSER - Creating blanks from processed text as fallback');
          // Extract blanks from the original raw text, not the processed text
          blanks = extractAllClozeBlanks(rawQ);
          console.log('🔍 MAIN PARSER - Fallback blanks:', blanks);
        }
        
        // Process ordered elements using centralized function - convert clozes to sequential blanks for display
        const processedOrderedElements = processClozeElements(questionOrderedElements, { stripMarkers: false, toSequential: true });
        
        // Apply LaTeX restoration if needed
        if (latexPlaceholders && latexPlaceholders.length > 0) {
          latexPlaceholders.forEach(({ placeholder, original }) => {
            text = text.replace(placeholder, original);
          });
          
          // Restore LaTeX in processed elements
          processedOrderedElements.forEach(element => {
            if (element.type === 'text' && element.content) {
              latexPlaceholders.forEach(({ placeholder, original }) => {
                element.content = element.content.replace(placeholder, original);
              });
            }
          });
          
          // Restore LaTeX in blanks
          blanks = blanks.map(blank => {
            let processedBlank = blank;
            latexPlaceholders.forEach(({ placeholder, original }) => {
              processedBlank = processedBlank.replace(placeholder, original);
            });
            return processedBlank;
          });
        }

        console.log('🔍 MAIN PARSER - Final CLOZE question result:', {
          id: `g${num}_q${idx+1}`,
          type: 'CLOZE',
          text,
          blanks: blanks,
          orderedElements: processedOrderedElements
        });

        // Create the CLOZE question object
        let clozeQuestion = {
          id:          `g${num}_q${idx+1}`,
          type:        'CLOZE',
          text,
          blanks:      blanks,
          explanation: eT,
          images,
          codeBlocks,
          latexBlocks,
          htmlTables,
          orderedElements: processedOrderedElements,
          explanationImages,
          explanationCodeBlocks,
          explanationLatexBlocks,
          explanationHtmlTables,
          explanationOrderedElements,
          // Store raw content for bookmarking
          rawText: rawQ,
          rawExplanation: rawE,
        };

        // CRITICAL: Ensure the question has a valid blanks array using centralized function
        clozeQuestion = ensureClozeQuestion(clozeQuestion);
        
        console.log('🔍 MAIN PARSER - Final ensured CLOZE question:', {
          id: clozeQuestion.id,
          blanksCount: clozeQuestion.blanks?.length || 0,
          blanks: clozeQuestion.blanks
        });

        return clozeQuestion;
      }
      else if (type === 'T-F') {
        return {
          id:          `g${num}_q${idx+1}`,
          type:        'T-F',
          text:        qT,
          answer:      aT,
          explanation: eT,
          images,
          codeBlocks,
          latexBlocks,
          htmlTables,
          orderedElements: questionOrderedElements,
          explanationImages,
          explanationCodeBlocks,
          explanationLatexBlocks,
          explanationHtmlTables,
          explanationOrderedElements,
          // Store raw content for bookmarking
          rawText: rawQ,
          rawExplanation: rawE,
        };
      }
      else if (type === 'SHORT') {
        return {
          id:          `g${num}_q${idx+1}`,
          type:        'SHORT',
          text:        qT,
          answer:      aT,
          explanation: eT,
          images,
          codeBlocks,
          latexBlocks,
          htmlTables,
          orderedElements: questionOrderedElements,
          explanationImages,
          explanationCodeBlocks,
          explanationLatexBlocks,
          explanationHtmlTables,
          explanationOrderedElements,
          // Store raw content for bookmarking
          rawText: rawQ,
          rawExplanation: rawE,
        };
      }
      return null;
    } catch (error) {
      console.error(`Error parsing question ${idx + 1} in section ${num}:`, error);
      return null;
    }
    }).filter(Boolean);

    // If we found an AUDIO block but no AUDIO questions, add one
    if (hasAudioBlock && !questions.some(q => q.type === 'AUDIO')) {
      console.log(`Adding implicit AUDIO question for section: ${num}`);
      const audioQuestion = {
        id: `g${num}_q0`,
        type: 'AUDIO',
        text: 'AUDIO:',
      };
      
      // Add audio filename if found
      if (audioFilename) {
        audioQuestion.audioFile = audioFilename;
        console.log(`Audio question includes file: ${audioFilename}`);
      }
      
      questions.unshift(audioQuestion);
    }

    groups.push({
      id:         `g${num}`,
      title:      headingText, // Use the heading text without the ###
      transcript,
      transcriptImages: transcriptElements.images,
      transcriptCodeBlocks: transcriptElements.codeBlocks,
      transcriptLatexBlocks: transcriptElements.latexBlocks,
      transcriptHtmlTables: transcriptElements.htmlTables,
      audioFile: audioFilename, // Add audio file reference to group
      questions,
    });
  }

  return groups;
}


