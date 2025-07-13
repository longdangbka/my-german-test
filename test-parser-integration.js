#!/usr/bin/env node

// Test script to verify the parser works with the new format

const { parseStandardMarkdown } = require('./src/features/questions/parsers/groupParser.js');
const fs = require('fs');
const path = require('path');

async function testParsing() {
  try {
    // Read the test file
    const testFile = path.join(__dirname, 'my-test-vault', 'Question-Sample.md');
    if (!fs.existsSync(testFile)) {
      console.log('❌ Test file not found:', testFile);
      return;
    }
    
    const content = fs.readFileSync(testFile, 'utf8');
    console.log('📁 Testing file:', testFile);
    console.log('📝 File length:', content.length);
    
    // Parse using the actual parser
    const groups = parseStandardMarkdown(content);
    console.log(`🎯 Parsed ${groups.length} groups`);
    
    groups.forEach((group, groupIndex) => {
      console.log(`\n📊 Group ${groupIndex + 1}: "${group.title}"`);
      console.log(`🔢 Questions: ${group.questions.length}`);
      
      group.questions.forEach((question, qIndex) => {
        console.log(`  📋 Q${qIndex + 1}: ${question.type} - ID: ${question.id}`);
        if (question.text) {
          console.log(`      Text: ${question.text.substring(0, 50)}...`);
        }
        if (question.type === 'CLOZE' && question.blanks) {
          console.log(`      Blanks: [${question.blanks.join(', ')}]`);
        }
      });
    });
    
  } catch (error) {
    console.error('❌ Error during parsing:', error);
    console.error(error.stack);
  }
}

testParsing();
