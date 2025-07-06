// Test complete flow: LaTeX placeholders → Cloze parsing → LaTeX restoration
const fs = require('fs');
const path = require('path');

// Read the updated module file and extract the function
const constantsPath = path.join(__dirname, 'src/shared/constants/index.js');
const constantsContent = fs.readFileSync(constantsPath, 'utf8');

// Extract the parseClozeMarkers function
const start = constantsContent.indexOf('export function parseClozeMarkers');
const end = constantsContent.indexOf('\n}', start) + 2;
const functionCode = constantsContent.slice(start, end).replace('export function', 'function');

eval(functionCode);

// Simulate the complete processing flow
function simulateProcessingFlow(text) {
  console.log(`\n=== Processing: "${text}" ===`);
  
  // Step 1: Replace LaTeX with placeholders (like the real app does)
  const latexPlaceholders = [];
  let placeholderIndex = 0;
  let textWithPlaceholders = text;
  
  // Replace $...$ with placeholders
  textWithPlaceholders = textWithPlaceholders.replace(/\$([^$\n]+?)\$/g, (match, content) => {
    const placeholder = `LATEX_PLACEHOLDER_${placeholderIndex++}`;
    latexPlaceholders.push({
      placeholder,
      original: match,
      latex: content,
      latexType: 'inline'
    });
    return placeholder;
  });
  
  console.log('Step 1 - LaTeX placeholders:', textWithPlaceholders);
  console.log('Placeholders created:', latexPlaceholders);
  
  // Step 2: Parse cloze markers
  const clozeMarkers = parseClozeMarkers(textWithPlaceholders);
  console.log('Step 2 - Cloze markers found:', clozeMarkers);
  
  // Step 3: Extract blanks and replace with _____
  const blanks = clozeMarkers.map(marker => marker.content);
  let processedText = textWithPlaceholders;
  
  // Replace from end to start to maintain positions
  for (let i = clozeMarkers.length - 1; i >= 0; i--) {
    const marker = clozeMarkers[i];
    processedText = processedText.slice(0, marker.start) + '_____' + processedText.slice(marker.end);
  }
  
  console.log('Step 3 - Text with blanks:', processedText);
  console.log('Step 3 - Raw blanks:', blanks);
  
  // Step 4: Restore LaTeX in main text
  let finalText = processedText;
  latexPlaceholders.forEach(({ placeholder, original }) => {
    finalText = finalText.replace(placeholder, original);
  });
  
  // Step 5: Restore LaTeX in blanks (this is what we want for answers)
  const processedBlanks = blanks.map(blank => {
    let processedBlank = blank;
    latexPlaceholders.forEach(({ placeholder, original }) => {
      processedBlank = processedBlank.replace(placeholder, original);
    });
    return processedBlank;
  });
  
  console.log('Step 4 - Final text:', finalText);
  console.log('Step 5 - Processed blanks:', processedBlanks);
  
  // Simulate rendering
  console.log('\n🎯 RENDERING SIMULATION:');
  if (processedBlanks.length > 0) {
    console.log('✅ CLOZE question with input fields');
    console.log(`   Text: "${finalText}"`);
    processedBlanks.forEach((blank, idx) => {
      console.log(`   Input ${idx + 1}: Expected = "${blank}"`);
      console.log(`   Input ${idx + 1}: Has LaTeX = ${blank.includes('$') ? 'YES (will render when showing answer)' : 'NO'}`);
    });
  } else {
    console.log('❌ Plain text (no cloze)');
  }
  
  return { finalText, processedBlanks };
}

// Test cases
const testCases = [
  '{{c::Machen $x=1$}} Sie bitte während der Führung.',
  '{{c::basic}} test with {{c::LaTeX $y=2$}} content.',
  'Text with $standalone \\LaTeX$ and {{c::cloze $\\alpha=\\beta$}} mixed.',
  'No cloze but $math=5$ here.',
  '{{c::Complex $a^2 + b^2 = c^2$}} formula test.'
];

testCases.forEach(testCase => {
  simulateProcessingFlow(testCase);
});
