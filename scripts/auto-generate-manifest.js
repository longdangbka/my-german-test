// Auto-generate manifest.json for vault directory
// Run this script to automatically create manifest.json with all .md files

const fs = require('fs');
const path = require('path');

const vaultDir = path.join(__dirname, '../public/vault');
const manifestPath = path.join(vaultDir, 'manifest.json');

try {
  // Read all files in vault directory
  const files = fs.readdirSync(vaultDir);
  
  // Filter for .md files only
  const mdFiles = files.filter(file => file.endsWith('.md'));
  
  // Create manifest object
  const manifest = {
    files: mdFiles,
    description: "Available quiz files",
    lastUpdated: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
    generatedBy: "auto-generate-manifest.js"
  };
  
  // Write manifest.json
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  
  console.log('✅ manifest.json generated successfully!');
  console.log(`Found ${mdFiles.length} markdown files:`);
  mdFiles.forEach(file => console.log(`  - ${file}`));
  
} catch (error) {
  console.error('❌ Error generating manifest:', error.message);
}
