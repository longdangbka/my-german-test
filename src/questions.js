// questions.js
// Dynamically load and parse all standard question files from public/vault

import { parseClozeMarkers } from './shared/constants/index.js';

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

  // For CLOZE questions, we need to protect LaTeX inside cloze markers from being processed
  let protectedText = remaining;
  const clozeProtections = [];
  
  if (isCloze) {
    // First, find all cloze markers and replace LaTeX inside them with temporary protection markers
    const clozeRegex = /\{\{c::([^}]+)\}\}/g;
    let protectionIndex = 0;
    
    protectedText = remaining.replace(clozeRegex, (match, content) => {
      // Replace LaTeX inside this cloze marker with protection markers
      let protectedContent = content;
      
      // Protect inline LaTeX $...$
      protectedContent = protectedContent.replace(/\$([^$\n]+?)\$/g, (latexMatch, latexContent) => {
        const protectionMarker = `__CLOZE_LATEX_PROTECTION_${protectionIndex}__`;
        clozeProtections.push({ marker: protectionMarker, original: latexMatch });
        protectionIndex++;
        return protectionMarker;
      });
      
      // Protect display LaTeX $$...$$
      protectedContent = protectedContent.replace(/\$\$([\s\S]+?)\$\$/g, (latexMatch, latexContent) => {
        const protectionMarker = `__CLOZE_LATEX_PROTECTION_${protectionIndex}__`;
        clozeProtections.push({ marker: protectionMarker, original: latexMatch });
        protectionIndex++;
        return protectionMarker;
      });
      
      return `{{c::${protectedContent}}}`;
    });
    
    console.log('🔍 PARSE ORDER - Original text:', remaining);
    console.log('🔍 PARSE ORDER - Protected text:', protectedText);
    console.log('🔍 PARSE ORDER - Cloze protections:', clozeProtections);
  }

  // Create a list of all content patterns with their positions
  const patterns = [
    { type: 'image', regex: /!\[\[([^\]]+)\]\]/g },
    { type: 'codeBlock', regex: /```([\w-]*)\n([\s\S]*?)```/g },
    { type: 'table', regex: /(^\|.+\|\r?\n\|[- :|]+\|\r?\n(?:\|.*\|\r?\n?)+)/gm },
    { type: 'latexDisplay', regex: /\$\$([\s\S]+?)\$\$/g },
    { type: 'latexInline', regex: /\$([^$\n]+?)\$/g }
  ];

  // Find all matches with their positions, but exclude overlapping ones
  const allMatches = [];
  
  patterns.forEach(pattern => {
    let match;
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    const textToSearch = isCloze ? protectedText : remaining;
    while ((match = regex.exec(textToSearch)) !== null) {
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
  const textToProcess = isCloze ? protectedText : remaining;

  nonOverlappingMatches.forEach(({ type, match, start, end, content }) => {
    // Add text before this match
    if (start > currentPos) {
      const textBefore = textToProcess.slice(currentPos, start).trim();
      if (textBefore) {
        // Restore cloze protections in text elements if this is a cloze question
        let finalTextBefore = textBefore;
        if (isCloze && clozeProtections.length > 0) {
          clozeProtections.forEach(({ marker, original }) => {
            finalTextBefore = finalTextBefore.replace(marker, original);
          });
        }
        elements.push({ type: 'text', content: finalTextBefore });
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
        // For CLOZE questions, preserve table content as-is (don't convert to HTML yet)
        // The cloze markers inside tables will be processed later
        elements.push({ type: 'table', content: match[0] });
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
  if (currentPos < textToProcess.length) {
    const remainingText = textToProcess.slice(currentPos).trim();
    if (remainingText) {
      // Restore cloze protections in remaining text if this is a cloze question
      let finalRemainingText = remainingText;
      if (isCloze && clozeProtections.length > 0) {
        clozeProtections.forEach(({ marker, original }) => {
          finalRemainingText = finalRemainingText.replace(marker, original);
        });
      }
      elements.push({ type: 'text', content: finalRemainingText });
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
          // For CLOZE questions, preserve table content as markdown and extract cloze markers
          const tableContent = element.content;
          // Extract cloze markers from table before conversion for text processing
          const tableMarkers = parseClozeMarkers(tableContent);
          let processedTableContent = tableContent;
          // Replace cloze markers with blanks, from end to start to maintain positions
          for (let i = tableMarkers.length - 1; i >= 0; i--) {
            const marker = tableMarkers[i];
            processedTableContent = processedTableContent.slice(0, marker.start) + '_____' + processedTableContent.slice(marker.end);
          }
          cleanedText += processedTableContent + ' ';
          htmlTables.push(mdTableToHtml(tableContent));
          // For ordered elements in CLOZE questions, keep original cloze markers in the HTML
          // so TableWithLatex can render them as input fields
          element.content = mdTableToHtml(tableContent);
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
        let rawE = '';
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
        
        // Extract cloze markers from the original raw content using the new parser
        const clozeMarkers = parseClozeMarkers(rawQ);
        console.log('🔍 MAIN PARSER - Found cloze markers:', clozeMarkers);
        
        const blanks = clozeMarkers.map(marker => marker.content);
        console.log('🔍 MAIN PARSER - Extracted blanks:', blanks);

        // Replace cloze markers with blanks, using proper replacement
        let text = rawQ;
        // Replace from end to start to maintain positions
        for (let i = clozeMarkers.length - 1; i >= 0; i--) {
          const marker = clozeMarkers[i];
          text = text.slice(0, marker.start) + '_____' + text.slice(marker.end);
        }
        console.log('🔍 MAIN PARSER - Processed text with blanks:', text);
        
        // Also process the ordered elements to replace cloze markers in text elements
        const processedOrderedElements = questionOrderedElements.map(element => {
          if (element.type === 'text') {
            let processedContent = element.content;
            const elementMarkers = parseClozeMarkers(processedContent);
            console.log(`🔍 MAIN PARSER - Processing text element. Original: "${processedContent}", markers:`, elementMarkers);
            // Replace from end to start to maintain positions
            for (let i = elementMarkers.length - 1; i >= 0; i--) {
              const marker = elementMarkers[i];
              processedContent = processedContent.slice(0, marker.start) + '_____' + processedContent.slice(marker.end);
            }
            console.log(`🔍 MAIN PARSER - Processed text element: "${processedContent}"`);
            // Restore LaTeX placeholders in the ordered elements too
            if (latexPlaceholders && latexPlaceholders.length > 0) {
              latexPlaceholders.forEach(({ placeholder, original }) => {
                processedContent = processedContent.replace(placeholder, original);
              });
            }
            return { ...element, content: processedContent };
          } else if (element.type === 'table') {
            // For tables, the cloze markers should already be converted to blanks in the HTML
            // This was handled in extractContentElements function
            return element;
          } else if (element.type === 'latexPlaceholder') {
            // Convert LaTeX placeholders back to latex elements
            const latexInfo = latexPlaceholders.find(lp => lp.placeholder === element.content);
            if (latexInfo) {
              return {
                type: 'latex',
                content: {
                  latex: latexInfo.latex,
                  latexType: latexInfo.latexType
                }
              };
            }
          }
          return element;
        });
        
        console.log('🔍 MAIN PARSER - Final processed ordered elements:', processedOrderedElements);
        
        // Restore LaTeX placeholders back to original LaTeX (for CLOZE questions)
        if (type === 'CLOZE' && latexPlaceholders && latexPlaceholders.length > 0) {
          latexPlaceholders.forEach(({ placeholder, original }) => {
            text = text.replace(placeholder, original);
          });
        }

        // For the blanks array, restore LaTeX placeholders so they contain the original LaTeX
        const processedBlanks = blanks.map(blank => {
          let processedBlank = blank;
          if (latexPlaceholders && latexPlaceholders.length > 0) {
            latexPlaceholders.forEach(({ placeholder, original }) => {
              processedBlank = processedBlank.replace(placeholder, original);
            });
          }
          return processedBlank;
        });

        console.log('🔍 MAIN PARSER - Original blanks:', blanks);
        console.log('🔍 MAIN PARSER - Processed blanks with LaTeX:', processedBlanks);

        console.log('🔍 MAIN PARSER - Final CLOZE question result:', {
          id: `g${num}_q${idx+1}`,
          type: 'CLOZE',
          text,
          blanks: processedBlanks,
          orderedElements: processedOrderedElements
        });

        return {
          id:          `g${num}_q${idx+1}`,
          type:        'CLOZE',
          text,
          blanks:      processedBlanks, // Use processed blanks with LaTeX restored
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
        };
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
        };
      }
      return null;
    } catch (error) {
      console.error(`Error parsing question ${idx + 1} in section ${num}:`, error);
      return null;
    }
    }).filter(Boolean);

    groups.push({
      id:         `g${num}`,
      title:      headingText, // Use the heading text without the ###
      transcript,
      transcriptImages: transcriptElements.images,
      transcriptCodeBlocks: transcriptElements.codeBlocks,
      transcriptLatexBlocks: transcriptElements.latexBlocks,
      transcriptHtmlTables: transcriptElements.htmlTables,
      questions,
    });
  }

  return groups;
}


