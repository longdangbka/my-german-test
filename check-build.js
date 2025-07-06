// Quick test to verify the built JavaScript has our fixes
const fs = require('fs');
const path = require('path');

// Check if the built main.js file contains our new cloze syntax parsing
const buildPath = path.join(__dirname, 'build', 'static', 'js');

try {
  const files = fs.readdirSync(buildPath);
  const mainJsFile = files.find(f => f.startsWith('main.') && f.endsWith('.js'));
  
  if (mainJsFile) {
    const mainJsPath = path.join(buildPath, mainJsFile);
    const content = fs.readFileSync(mainJsPath, 'utf8');
    
    console.log(`Checking built file: ${mainJsFile}`);
    console.log(`File size: ${(content.length / 1024 / 1024).toFixed(2)} MB`);
    
    // Check for key indicators of our fixes
    const checks = [
      { name: 'New cloze syntax parser', pattern: /\{\{c::/g },
      { name: 'processedBlanks logic', pattern: /processedBlanks/g },
      { name: 'parseClozeMarkers function', pattern: /parseClozeMarkers/g },
      { name: 'LaTeX placeholder restoration', pattern: /LATEX_PLACEHOLDER/g }
    ];
    
    console.log('\n=== CHECKING FOR KEY FIXES ===');
    checks.forEach(({ name, pattern }) => {
      const matches = content.match(pattern);
      if (matches) {
        console.log(`✅ ${name}: Found ${matches.length} references`);
      } else {
        console.log(`❌ ${name}: NOT FOUND`);
      }
    });
    
    // Look for the specific string that indicates our cloze parser
    if (content.includes('{{c::')) {
      console.log('\n✅ Built JavaScript contains new cloze syntax');
    } else {
      console.log('\n❌ Built JavaScript does NOT contain new cloze syntax');
    }
    
    // Check for our specific processing logic
    if (content.includes('processedBlanks')) {
      console.log('✅ Built JavaScript contains LaTeX restoration fix');
    } else {
      console.log('❌ Built JavaScript does NOT contain LaTeX restoration fix');
    }
    
  } else {
    console.log('❌ Could not find main.js file in build directory');
    console.log('Available files:', files);
  }
  
} catch (error) {
  console.error('Error checking built files:', error.message);
}
