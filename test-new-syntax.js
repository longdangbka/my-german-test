// Test new cloze syntax {{c::[content]}}
const fs = require('fs');
const path = require('path');

// Read the updated module file and extract the function
const moduleContent = fs.readFileSync(path.join(__dirname, 'src/shared/constants/index.js'), 'utf8');

// Extract the parseClozeMarkers function
const start = moduleContent.indexOf('export function parseClozeMarkers');
const end = moduleContent.indexOf('\n}', start) + 2;
const functionCode = moduleContent.slice(start, end).replace('export function', 'function');

console.log('Extracted function code (first 200 chars):');
console.log(functionCode.substring(0, 200) + '...');

// Evaluate the function
eval(functionCode);

// Test cases with new syntax
const testCases = [
  '{{c::Machen $x=1$}} Sie bitte während der Führung Handys und Smartphones.',
  '{{c::basic}} test and {{c::LaTeX $y=2$}} combined',
  'Normal text without markers',
  '{{c::Multiple}} {{c::markers}} {{c::with $math=\\alpha$}} content',
  '{{c::Test}} normal text',
  // Test old syntax should NOT match
  '{{old syntax}} should not match',
  '{single brace} should not match',
  // Test mixed content
  'Text with $normal \\LaTeX$ and {{c::cloze $content$}} mixed.',
];

console.log('\n=== TESTING NEW CLOZE SYNTAX ===');
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
  
  // Show expected result
  if (result.length > 0) {
    console.log('✅ WOULD RENDER AS CLOZE with input fields');
  } else {
    console.log('❌ Would render as plain text (no cloze markers found)');
  }
});
