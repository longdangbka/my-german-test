// Check for patterns that survive minification
const fs = require('fs');
const path = require('path');

const buildPath = path.join(__dirname, 'build', 'static', 'js');
const files = fs.readdirSync(buildPath);
const mainJsFile = files.find(f => f.startsWith('main.') && f.endsWith('.js'));

if (mainJsFile) {
  const content = fs.readFileSync(path.join(buildPath, mainJsFile), 'utf8');
  
  console.log('=== CHECKING FOR MINIFICATION-SAFE PATTERNS ===');
  
  // Check for specific string patterns that should survive minification
  const patterns = [
    { name: 'New cloze pattern check', search: 'text[i + 2] === \'c\' && text[i + 3] === \':\' && text[i + 4] === \':\'', exists: content.includes('text[i + 2] === \'c\' && text[i + 3] === \':\' && text[i + 4] === \':\'') },
    { name: 'Alternative cloze pattern', search: '===\'c\'', exists: content.includes('===\'c\'') },
    { name: 'Cloze prefix match', search: 'c::', exists: content.includes('c::') },
    { name: 'Console log for cloze', search: 'MAIN PARSER - Found cloze markers', exists: content.includes('MAIN PARSER - Found cloze markers') },
    { name: 'Console log for blanks', search: 'MAIN PARSER - Extracted blanks', exists: content.includes('MAIN PARSER - Extracted blanks') },
    { name: 'LaTeX placeholder pattern', search: 'LATEX_PLACEHOLDER', exists: content.includes('LATEX_PLACEHOLDER') }
  ];
  
  patterns.forEach(({ name, search, exists }) => {
    console.log(`${exists ? '✅' : '❌'} ${name}: ${exists ? 'FOUND' : 'NOT FOUND'}`);
    if (exists && search.length < 20) {
      console.log(`    Pattern: "${search}"`);
    }
  });
  
  // Search for our specific parsing logic patterns
  console.log('\n=== SEARCHING FOR PARSING LOGIC ===');
  
  // Look for the new cloze parsing pattern
  if (content.match(/text\[.*?\].*?===.*?['"]c['"].*?text\[.*?\].*?===.*?['"]:['"].*?text\[.*?\].*?===.*?['"]:['"].*?/)) {
    console.log('✅ Found cloze parsing logic pattern');
  } else if (content.includes('===\'c\'') && content.includes('===\':\'')) {
    console.log('✅ Found simplified cloze parsing pattern');
  } else {
    console.log('❌ Could not find cloze parsing logic');
  }
  
  // Check for our console.log patterns to verify our latest code is included
  const consoleLogs = [
    'MAIN PARSER - Processing CLOZE question',
    'MAIN PARSER - Found cloze markers',
    'MAIN PARSER - Extracted blanks',
    'MAIN PARSER - Processed blanks with LaTeX'
  ];
  
  console.log('\n=== CHECKING FOR DEBUG LOGS ===');
  consoleLogs.forEach(log => {
    const found = content.includes(log);
    console.log(`${found ? '✅' : '❌'} "${log}": ${found ? 'FOUND' : 'NOT FOUND'}`);
  });
  
} else {
  console.log('❌ No main.js file found');
}
