// Test our parseClozeMarkers function directly by importing from the actual module
const fs = require('fs');
const path = require('path');

// Read the module file and extract the function
const moduleContent = fs.readFileSync(path.join(__dirname, 'src/shared/constants/index.js'), 'utf8');

// Extract the parseClozeMarkers function - more robust extraction
const start = moduleContent.indexOf('export function parseClozeMarkers');
const end = moduleContent.indexOf('\n}', start) + 2;
const functionCode = moduleContent.slice(start, end).replace('export function', 'function');

console.log('Extracted function code:');
console.log(functionCode.substring(0, 200) + '...');

// Evaluate the function
eval(functionCode);

// Test cases
const testCases = [
  '{{Machen $x=1$}} Sie bitte während der Führung Handys und Smartphones.',
  '{{Test}} normal text',
  '{Single} brace test',
  '{{Multiple}} {{markers}} in text',
  '{{LaTeX $\\alpha + \\beta = \\gamma$}} equation test',
  'No markers here',
  '{{Unclosed marker',
  '{{Nested {inside} markers}} test',
];

console.log('\n=== TESTING PARSER ===');
testCases.forEach((testCase, index) => {
  console.log(`\n--- Test ${index + 1} ---`);
  console.log(`Testing: ${testCase}`);
  const result = parseClozeMarkers(testCase);
  console.log('Result:', result);
  
  // Process the result like the main app would
  let processedText = testCase;
  const blanks = [];
  
  // Sort markers by start position in descending order to replace from right to left
  const sortedMarkers = result.sort((a, b) => b.start - a.start);
  
  sortedMarkers.forEach(marker => {
    blanks.unshift(marker.content); // Add to beginning to maintain order
    processedText = processedText.slice(0, marker.start) + '_____' + processedText.slice(marker.end);
  });
  
  console.log('Processed text:', processedText);
  console.log('Blanks:', blanks);
});
