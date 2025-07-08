// Temporary test file to debug cloze parsing
import { parseClozeMarkers } from './src/shared/constants/index.js';

// Test cases
const testCases = [
  'Simple test: {{c::basic}} word.',
  'Legacy test: {{legacy}} word.',
  'LaTeX test: {{c::Machen $x=1$}} Sie bitte.',
  'Multiple: {{c::first}} and {{c::second $y=2$}} items.',
  'Mixed: {{legacy}} and {{c::new}} syntax.'
];

console.log('Testing cloze marker parsing:');
testCases.forEach((test, index) => {
  const markers = parseClozeMarkers(test);
  console.log(`Test ${index + 1}: "${test}"`);
  console.log('Markers found:', markers);
  console.log('---');
});
