#!/usr/bin/env node

/**
 * Converter script to migrate question blocks from old format to new format
 * Old: --- start-question ... --- end-question
 * New: ````ad-question ... ````
 */

const fs = require('fs');
const path = require('path');

function convertFileFormat(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    return false;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  // Replace old format with new format
  const oldFormatRegex = /--- start-question([\s\S]*?)--- end-question/g;
  
  content = content.replace(oldFormatRegex, (match, questionContent) => {
    changed = true;
    return '````ad-question' + questionContent + '````';
  });
  
  if (changed) {
    // Create backup
    const backupPath = filePath + '.backup';
    fs.writeFileSync(backupPath, fs.readFileSync(filePath, 'utf8'));
    
    // Write converted content
    fs.writeFileSync(filePath, content);
    console.log(`✅ Converted: ${filePath}`);
    console.log(`📁 Backup created: ${backupPath}`);
    return true;
  } else {
    console.log(`ℹ️ No old format found in: ${filePath}`);
    return false;
  }
}

function convertDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    console.log(`❌ Directory not found: ${dirPath}`);
    return;
  }
  
  const files = fs.readdirSync(dirPath, { withFileTypes: true });
  let totalConverted = 0;
  
  files.forEach(file => {
    if (file.isDirectory()) {
      // Recursively process subdirectories
      const subDirPath = path.join(dirPath, file.name);
      totalConverted += convertDirectory(subDirPath);
    } else if (file.name.endsWith('.md')) {
      const filePath = path.join(dirPath, file.name);
      if (convertFileFormat(filePath)) {
        totalConverted++;
      }
    }
  });
  
  return totalConverted;
}

// Main execution
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node convert-format.js <directory-path>');
  console.log('Example: node convert-format.js ./public/vault');
  process.exit(1);
}

const targetPath = args[0];
console.log(`🔄 Converting question format in: ${targetPath}`);

if (fs.statSync(targetPath).isDirectory()) {
  const converted = convertDirectory(targetPath);
  console.log(`\n🎉 Conversion complete! ${converted} files converted.`);
} else {
  convertFileFormat(targetPath);
  console.log('\n🎉 Conversion complete!');
}
