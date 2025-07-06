// questions.js
// Dynamically load and parse all standard question files from public/vault

export async function loadQuestionGroups(signal, filename = 'Question-Sample.md') {
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
    groups.push(...parsed);
  } catch (error) {
    console.error(`Error loading ${filename}:`, error);
    throw error;
  }
  
  return groups;
}

// helper: parse content preserving order of all elements (text, images, code, LaTeX, tables)
function parseContentWithOrder(text, isCloze = false) {
  const elements = [];
  let remaining = text;
  let position = 0;

  // Create a list of all content patterns with their positions
  const patterns = [
    { type: 'image', regex: /!\[\[([^\]]+)\]\]/g },
    { type: 'codeBlock', regex: /```([\w-]*)\n([\s\S]*?)```/g },
    { type: 'table', regex: /(^\|.+\|\r?\n\|[- :|]+\|\r?\n(?:\|.*\|\r?\n?)+)/gm },
    { type: 'latexDisplay', regex: /\$\$([\s\S]+?)\$\$/g },
    { type: 'latexInline', regex: /\$([^$\n]+?)\$/g }
  ];

  // For CLOZE questions, we need to handle LaTeX differently to avoid interference with cloze markers
  if (isCloze) {
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
          // For CLOZE questions, preserve table content as-is (don't convert to HTML yet)
          // The cloze markers inside tables will be processed later
          elements.push({ type: 'table', content: match[0] });
          break;
        case 'latexDisplay':
          // For cloze, replace with placeholder in text
          const displayPlaceholder = `__LATEX_DISPLAY_${placeholderIndex}__`;
          elements.push({ type: 'latexPlaceholder', content: displayPlaceholder });
          latexPlaceholders.push({ placeholder: displayPlaceholder, original: content, latex: match[1], latexType: 'display' });
          placeholderIndex++;
          break;
        case 'latexInline':
          // For cloze, replace with placeholder in text
          const inlinePlaceholder = `__LATEX_INLINE_${placeholderIndex}__`;
          elements.push({ type: 'latexPlaceholder', content: inlinePlaceholder });
          latexPlaceholders.push({ placeholder: inlinePlaceholder, original: content, latex: match[1], latexType: 'inline' });
          placeholderIndex++;
          break;
      }

      currentPos = end;
    });

    // Add remaining text
    if (currentPos < remaining.length) {
      const remainingText = remaining.slice(currentPos).trim();
      if (remainingText) {
        elements.push({ type: 'text', content: remainingText });
      }
    }

    return { elements, latexPlaceholders };
  } else {
    // For non-cloze questions, simpler processing but still avoid overlaps
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

    // Process matches in order
    let currentPos = 0;

    nonOverlappingMatches.forEach(({ type, match, start, end, content }) => {
      // Add text before this match
      if (start > currentPos) {
        const textBefore = remaining.slice(currentPos, start).trim();
        if (textBefore) {
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
          elements.push({ type: 'table', content: match[0] });
          break;
        case 'latexDisplay':
          elements.push({ type: 'latex', content: { latex: match[1], latexType: 'display' } });
          break;
        case 'latexInline':
          elements.push({ type: 'latex', content: { latex: match[1], latexType: 'inline' } });
          break;
      }

      currentPos = end;
    });

    // Add remaining text
    if (currentPos < remaining.length) {
      const remainingText = remaining.slice(currentPos).trim();
      if (remainingText) {
        elements.push({ type: 'text', content: remainingText });
      }
    }

    return { elements, latexPlaceholders: [] };
  }
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
          cleanedText += tableContent.replace(/\{\{([^}]+)\}\}|\{([^}]+)\}/g, '_____') + ' ';
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
        const typeM = code.match(/^TYPE:\s*(CLOZE|T-F)$/im);
        const type  = typeM ? typeM[1].toUpperCase() : null;

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
        // Extract cloze markers from the original raw content (before any processing)
        // This ensures we capture cloze markers from text, tables, and any other content
        const blanks = Array.from(
          rawQ.matchAll(/\{\{([^}]+)\}\}|\{([^}]+)\}/g),
          m => m[1] || m[2]
        );

        // Replace cloze markers with blanks, then restore LaTeX placeholders if they exist
        let text = qT.replace(/\{\{([^}]+)\}\}|\{([^}]+)\}/g, '_____');
        
        // Also process the ordered elements to replace cloze markers in text elements
        const processedOrderedElements = questionOrderedElements.map(element => {
          if (element.type === 'text') {
            let processedContent = element.content.replace(/\{\{([^}]+)\}\}|\{([^}]+)\}/g, '_____');
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
        
        // Restore LaTeX placeholders back to original LaTeX (for CLOZE questions)
        if (type === 'CLOZE' && latexPlaceholders && latexPlaceholders.length > 0) {
          latexPlaceholders.forEach(({ placeholder, original }) => {
            text = text.replace(placeholder, original);
          });
        }

        return {
          id:          `g${num}_q${idx+1}`,
          type:        'CLOZE',
          text,
          blanks,
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


