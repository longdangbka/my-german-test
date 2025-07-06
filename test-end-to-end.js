// Test the complete flow: parse -> render
const fs = require('fs');
const path = require('path');

// Import the parsing function
const constantsPath = path.join(__dirname, 'src/shared/constants/index.js');
const constantsContent = fs.readFileSync(constantsPath, 'utf8');

// Extract the parseClozeMarkers function
const start = constantsContent.indexOf('export function parseClozeMarkers');
const end = constantsContent.indexOf('\n}', start) + 2;
const functionCode = constantsContent.slice(start, end).replace('export function', 'function');

eval(functionCode);

// Mock question parser similar to the actual app
function parseQuestion(text) {
  const markers = parseClozeMarkers(text);
  console.log('🔍 Found markers:', markers);
  
  if (markers.length === 0) {
    return { text, blanks: [] };
  }
  
  // Process markers from right to left to maintain positions
  let processedText = text;
  const blanks = [];
  
  const sortedMarkers = markers.sort((a, b) => b.start - a.start);
  
  sortedMarkers.forEach(marker => {
    blanks.unshift(marker.content); // Add to beginning to maintain order
    processedText = processedText.slice(0, marker.start) + '_____' + processedText.slice(marker.end);
  });
  
  return {
    text: processedText,
    blanks: blanks
  };
}

// Test cases
const testCases = [
  '{{Machen $x=1$}} Sie bitte während der Führung Handys und Smartphones.',
  '{{basic}} test and {{LaTeX $y=2$}} combined',
  'Normal text without markers',
  '{{Multiple}} {{markers}} {{with $math=\\alpha$}} content'
];

console.log('=== END-TO-END PARSING TEST ===');
testCases.forEach((testCase, index) => {
  console.log(`\n--- Test ${index + 1} ---`);
  console.log(`Input: ${testCase}`);
  
  const result = parseQuestion(testCase);
  
  console.log(`Processed text: ${result.text}`);
  console.log(`Blanks:`, result.blanks);
  
  // Simulate how the UI would handle this
  console.log('\n🎯 UI Simulation:');
  if (result.blanks.length > 0) {
    console.log('✅ This would render as CLOZE with input fields');
    result.blanks.forEach((blank, idx) => {
      console.log(`  Input ${idx + 1}: Expected answer = "${blank}"`);
      console.log(`  Input ${idx + 1}: LaTeX in answer = ${blank.includes('$') ? 'YES (will render LaTeX when showing answer)' : 'NO'}`);
    });
  } else {
    console.log('❌ This would render as plain text (no inputs)');
  }
});
