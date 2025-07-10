// Test script to verify bookmark cloze processing
const { extractAllClozeBlanks, toSequentialBlanks } = require('./src/cloze.js');

const testText = `Q: {{c1::Machen $x=1$}} Sie bitte während der Führung Handys und Smartphones.

| {{c1::a}}   | b   |
| --- | --- |
| 1   | 2   |`;

console.log('=== Testing Bookmark Cloze Processing ===');
console.log('Original text:');
console.log(testText);

console.log('\n=== Extract All Cloze Blanks ===');
const blanks = extractAllClozeBlanks(testText);
console.log('Extracted blanks:', blanks);

console.log('\n=== Convert to Sequential Blanks ===');
const sequential = toSequentialBlanks(testText);
console.log('Sequential text:');
console.log(sequential);

console.log('\n=== Success! ===');
