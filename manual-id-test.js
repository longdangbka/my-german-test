// Manual test of the auto-ID assignment functionality
// This simulates what happens when the IdAssignmentPanel button is clicked

const fs = require('fs');
const path = require('path');

// Test file path
const testFilePath = './public/vault/Question-Sample.md';

// Read the current content
const originalContent = fs.readFileSync(testFilePath, 'utf8');
console.log('=== ORIGINAL CONTENT ANALYSIS ===');

// Find question blocks
const questionBlocks = originalContent.match(/--- start-question[\s\S]*?--- end-question/g) || [];
console.log(`Found ${questionBlocks.length} question blocks`);

let missingIdCount = 0;
questionBlocks.forEach((block, index) => {
  const hasId = block.includes('ID:');
  if (!hasId) {
    missingIdCount++;
    console.log(`Question ${index + 1}: MISSING ID`);
  } else {
    console.log(`Question ${index + 1}: HAS ID`);
  }
});

console.log(`\nTotal questions missing IDs: ${missingIdCount}`);
console.log('\n=== END ANALYSIS ===');

if (missingIdCount > 0) {
  console.log('\n✅ Auto-ID assignment should process this file');
  console.log('📝 Expected: IDs will be generated and inserted');
  console.log('💾 Expected: File will be updated with new IDs');
} else {
  console.log('\n✅ All questions already have IDs');
  console.log('📝 Expected: No changes needed');
}

// Show the first few lines for verification
console.log('\n=== FIRST 20 LINES OF FILE ===');
const lines = originalContent.split('\n');
lines.slice(0, 20).forEach((line, index) => {
  console.log(`${index + 1}: ${line}`);
});
console.log('...');
