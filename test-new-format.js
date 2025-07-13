#!/usr/bin/env node

// Simple test script to verify the new question format parsing

const fs = require('fs');
const path = require('path');

// Import the parsing functions (if we could - for now we'll just test with regex)

// Test the regex patterns
const QUESTION_BLOCK_REGEX = /(?:--- start-question[\r\n]+([\s\S]*?)[\r\n]+--- end-question|````ad-question[\r\n]+([\s\S]*?)[\r\n]+````)/g;

// Read a test file
const testFile = path.join(__dirname, 'my-test-vault', 'Question-Sample.md');

if (fs.existsSync(testFile)) {
  const content = fs.readFileSync(testFile, 'utf8');
  
  console.log('📁 Testing file:', testFile);
  console.log('📝 File length:', content.length);
  
  // Extract questions section
  const questionsMatch = content.match(/### Questions\s*[\r\n]+([\s\S]*)/i);
  if (questionsMatch) {
    const questionsSection = questionsMatch[1];
    console.log('✅ Found Questions section');
    console.log('📏 Questions section length:', questionsSection.length);
    
    // Test the regex
    const matches = Array.from(questionsSection.matchAll(QUESTION_BLOCK_REGEX));
    console.log(`🔍 Found ${matches.length} question blocks`);
    
    matches.forEach((match, index) => {
      const questionContent = (match[1] || match[2]).trim();
      console.log(`\n📋 Question ${index + 1}:`);
      console.log('📝 Content preview:', questionContent.substring(0, 100) + '...');
      
      // Check for TYPE
      const typeMatch = questionContent.match(/^TYPE:\s*(CLOZE|T-F|Short)$/im);
      console.log('🏷️ Type:', typeMatch ? typeMatch[1] : 'NOT FOUND');
      
      // Check for ID
      const idMatch = questionContent.match(/^ID:\s*(.+)$/m);
      console.log('🆔 ID:', idMatch ? idMatch[1] : 'NOT FOUND');
    });
  } else {
    console.log('❌ No Questions section found');
  }
} else {
  console.log('❌ Test file not found:', testFile);
}
