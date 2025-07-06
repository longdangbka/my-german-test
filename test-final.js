// Test the complete flow with new syntax to verify it works
const fs = require('fs');
const path = require('path');

// Load the parseClozeMarkers function
const constantsPath = path.join(__dirname, 'src/shared/constants/index.js');
const constantsContent = fs.readFileSync(constantsPath, 'utf8');

const start = constantsContent.indexOf('export function parseClozeMarkers');
const end = constantsContent.indexOf('\n}', start) + 2;
const functionCode = constantsContent.slice(start, end).replace('export function', 'function');

eval(functionCode);

// Test the exact content from our question file
const testContent = `{{c::Machen $x=1$}} Sie bitte während der Führung Handys und Smartphones.`;

console.log('=== TESTING ACTUAL QUESTION CONTENT ===');
console.log(`Input: ${testContent}`);

const markers = parseClozeMarkers(testContent);
console.log('Parsed markers:', markers);

// Simulate the processing that happens in the app
let processedText = testContent;
const blanks = [];

// Replace markers from end to start to maintain positions
for (let i = markers.length - 1; i >= 0; i--) {
  const marker = markers[i];
  blanks.unshift(marker.content); // Add to beginning to maintain order
  processedText = processedText.slice(0, marker.start) + '_____' + processedText.slice(marker.end);
}

console.log(`Processed text: ${processedText}`);
console.log('Blanks:', blanks);

if (markers.length > 0) {
  console.log('✅ SUCCESS: Would render as CLOZE with input fields');
  console.log(`✅ Expected answer for blank 1: "${blanks[0]}"`);
  console.log(`✅ LaTeX in answer: ${blanks[0].includes('$') ? 'YES (will render when showing feedback)' : 'NO'}`);
} else {
  console.log('❌ FAILURE: Would render as plain text (no cloze markers found)');
}

// Test mixed content
console.log('\n=== TESTING MIXED CONTENT ===');
const mixedContent = `Normal $LaTeX$ here and {{c::cloze $content$}} and more $$display = math$$`;
console.log(`Mixed input: ${mixedContent}`);

const mixedMarkers = parseClozeMarkers(mixedContent);
console.log('Mixed markers:', mixedMarkers);

if (mixedMarkers.length > 0) {
  console.log('✅ SUCCESS: Cloze found despite LaTeX presence');
} else {
  console.log('❌ FAILURE: Cloze not found in mixed content');
}
