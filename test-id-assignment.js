// Test script to verify auto-ID assignment functionality
// This file can be run to manually test ID assignment

const fs = require('fs');
const path = require('path');

// Test the question ID extraction logic
function testQuestionIdExtraction() {
  console.log('=== TESTING QUESTION ID EXTRACTION ===');
  
  const filePath = './public/vault/Question-Sample.md';
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Extract question blocks
  const questionBlocks = content.match(/--- start-question[\s\S]*?--- end-question/g) || [];
  console.log(`Found ${questionBlocks.length} question blocks`);
  
  questionBlocks.forEach((block, index) => {
    const hasId = block.includes('ID:');
    const typeMatch = block.match(/TYPE:\s*(\w+)/);
    const type = typeMatch ? typeMatch[1] : 'Unknown';
    
    console.log(`Question ${index + 1}:`);
    console.log(`  - Type: ${type}`);
    console.log(`  - Has ID: ${hasId}`);
    
    if (!hasId) {
      console.log(`  - MISSING ID - Should be assigned`);
    } else {
      const idMatch = block.match(/ID:\s*(.+)/);
      const id = idMatch ? idMatch[1].trim() : 'Not found';
      console.log(`  - Current ID: ${id}`);
    }
    console.log('');
  });
}

// Run the test
testQuestionIdExtraction();
