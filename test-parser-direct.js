// Test our parseClozeMarkers function directly
function parseClozeMarkers(text) {
  console.log('🔍 parseClozeMarkers called with text:', text);
  console.log('🔍 parseClozeMarkers - text type:', typeof text);
  console.log('🔍 parseClozeMarkers - text length:', text?.length);
  console.log('🔍 parseClozeMarkers - text char codes of first 50 chars:', 
    text?.substring(0, 50).split('').map(c => `${c}(${c.charCodeAt(0)})`).join(' '));
  
  if (!text || typeof text !== 'string') {
    console.warn('🔍 parseClozeMarkers - Invalid input text:', text);
    return [];
  }
  
  const markers = [];
  let i = 0;
  
  while (i < text.length) {
    if (text[i] === '{' && text[i + 1] === '{') {
      // Double brace marker {{...}}
      const start = i;
      i += 2; // Skip opening {{
      let content = '';
      let braceCount = 2;
      let inLaTeX = false;
      
      while (i < text.length && braceCount > 0) {
        const char = text[i];
        
        if (char === '$' && !inLaTeX) {
          inLaTeX = true;
          content += char;
        } else if (char === '$' && inLaTeX) {
          inLaTeX = false;
          content += char;
        } else if (!inLaTeX && char === '{') {
          braceCount++;
          content += char;
        } else if (!inLaTeX && char === '}') {
          braceCount--;
          if (braceCount > 0) content += char;
        } else {
          content += char;
        }
        
        i++;
      }
      
      if (braceCount === 0) {
        markers.push({
          match: `{{${content}}}`,
          content: content,
          start: start,
          end: i
        });
        console.log('Added marker:', `{{${content}}}`);
      } else {
        // Unmatched braces, treat as regular text
        i = start + 1;
        console.log('Unmatched braces, skipping');
      }
    } else if (text[i] === '{' && text[i + 1] !== '{') {
      // Single brace marker {...}
      const start = i;
      i += 1; // Skip opening {
      let content = '';
      let braceCount = 1;
      let inLaTeX = false;
      
      while (i < text.length && braceCount > 0) {
        const char = text[i];
        
        if (char === '$' && !inLaTeX) {
          inLaTeX = true;
          content += char;
        } else if (char === '$' && inLaTeX) {
          inLaTeX = false;
          content += char;
        } else if (!inLaTeX && char === '{') {
          braceCount++;
          content += char;
        } else if (!inLaTeX && char === '}') {
          braceCount--;
          if (braceCount > 0) content += char;
        } else {
          content += char;
        }
        
        i++;
      }
      
      if (braceCount === 0) {
        markers.push({
          match: `{${content}}`,
          content: content,
          start: start,
          end: i
        });
        console.log('Added marker:', `{${content}}`);
      } else {
        // Unmatched braces, treat as regular text
        i = start + 1;
        console.log('Unmatched braces, skipping');
      }
    } else {
      i++;
    }
  }
  
  console.log('🔍 parseClozeMarkers returning markers:', markers);
  return markers;
}

// Test the specific problematic text
const testText = "{{Machen $x=1$}} Sie bitte während der Führung Handys und Smartphones.";
console.log("Testing:", testText);

const result = parseClozeMarkers(testText);
console.log("Result:", result);

// Test replacement
if (result.length > 0) {
  let processedText = testText;
  for (let i = result.length - 1; i >= 0; i--) {
    const marker = result[i];
    processedText = processedText.substring(0, marker.start) + '_____' + processedText.substring(marker.end);
  }
  console.log("Processed text:", processedText);
  console.log("Blanks:", result.map(m => m.content));
}
