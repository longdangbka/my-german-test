const fs = require('fs');
const path = require('path');

// Test script to verify vault files access
const testVaultAccess = () => {
  const portablePath = path.join(__dirname, 'MyGermanTest-Portable', 'resources', 'vault');
  const distPath = path.join(__dirname, 'dist', 'win-unpacked', 'resources', 'vault');
  
  console.log('Testing vault access in both locations...\n');
  
  // Test portable path
  console.log('1. Testing portable path:', portablePath);
  if (fs.existsSync(portablePath)) {
    console.log('✓ Portable vault directory exists');
    const files = fs.readdirSync(portablePath);
    console.log('  Files found:', files);
    
    const mdFiles = files.filter(f => f.endsWith('.md'));
    console.log('  Markdown files:', mdFiles);
    
    if (mdFiles.length > 0) {
      const firstFile = path.join(portablePath, mdFiles[0]);
      const content = fs.readFileSync(firstFile, 'utf8');
      console.log(`  Sample content from ${mdFiles[0]}:`);
      console.log('  ' + content.substring(0, 100) + '...\n');
    }
  } else {
    console.log('✗ Portable vault directory not found\n');
  }
  
  // Test dist path
  console.log('2. Testing dist path:', distPath);
  if (fs.existsSync(distPath)) {
    console.log('✓ Dist vault directory exists');
    const files = fs.readdirSync(distPath);
    console.log('  Files found:', files);
    
    const mdFiles = files.filter(f => f.endsWith('.md'));
    console.log('  Markdown files:', mdFiles);
  } else {
    console.log('✗ Dist vault directory not found\n');
  }
  
  console.log('Test completed.');
};

testVaultAccess();
