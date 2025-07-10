// Script to add unique IDs to existing questions in markdown files
// Run this to update existing questions with stable IDs

const fs = require('fs');
const path = require('path');

// Simple hash function to create a short hash from text
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36).substring(0, 6);
}

// Generate a stable unique ID for a question based on its content
function generateQuestionId(questionText, questionType, index, groupNumber) {
  const contentHash = simpleHash(questionText.trim());
  return `q${groupNumber}_${index + 1}_${questionType.toLowerCase()}_${contentHash}`;
}

// Extract question ID from markdown question block
function extractQuestionId(questionBlock) {
  const idMatch = questionBlock.match(/^ID:\s*(.+)$/m);
  return idMatch ? idMatch[1].trim() : null;
}

// Add or update question ID in markdown question block
function addQuestionIdToBlock(questionBlock, questionId) {
  // Check if ID already exists
  const existingId = extractQuestionId(questionBlock);
  
  if (existingId) {
    // Update existing ID
    return questionBlock.replace(/^ID:\s*.+$/m, `ID: ${questionId}`);
  } else {
    // Add ID after TYPE line
    const typeMatch = questionBlock.match(/^(TYPE:\s*.+)$/m);
    if (typeMatch) {
      return questionBlock.replace(
        typeMatch[0],
        `${typeMatch[0]}\nID: ${questionId}`
      );
    } else {
      // Fallback: add at the beginning
      return `ID: ${questionId}\n${questionBlock}`;
    }
  }
}

function addIdsToMarkdownFile(filePath) {
  console.log(`Processing ${filePath}...`);
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Parse sections (groups)
  const headingRE = /^##\s+(.+)$/gm;
  const headings = Array.from(content.matchAll(headingRE));
  
  let updatedContent = content;
  let changesMade = false;
  
  for (let i = 0; i < headings.length; i++) {
    const num = headings[i][1].trim();
    const start = headings[i].index + headings[i][0].length;
    const end = (i + 1 < headings.length) ? headings[i+1].index : content.length;
    const block = content.slice(start, end);
    
    // Extract questions section
    const qMatch = block.match(/### Questions\s*[\r\n]+([\s\S]*)/i);
    if (!qMatch) continue;
    
    const questionsSection = qMatch[1];
    
    // Find question blocks
    const questionBlocks = Array.from(
      questionsSection.matchAll(/--- start-question[\r\n]+([\s\S]*?)[\r\n]+--- end-question/g)
    );
    
    for (let [idx, match] of questionBlocks.entries()) {
      const questionCode = match[1].trim();
      
      // Check if ID already exists
      if (questionCode.match(/^ID:\s*.+$/m)) {
        console.log(`  Question ${idx + 1} in section ${num} already has ID, skipping`);
        continue;
      }
      
      // Extract type and question text
      const typeM = questionCode.match(/^TYPE:\s*(CLOZE|T-F|Short)$/im);
      const type = typeM ? typeM[1].toUpperCase() : 'UNKNOWN';
      
      const qMatch = questionCode.match(/^Q:\s*([\s\S]*?)(?=\r?\n(?:A:|E:|---\s*end-question))/m);
      const questionText = qMatch ? qMatch[1].replace(/^\r?\n/, '').trim() : '';
      
      if (type === 'UNKNOWN' || !questionText) {
        console.log(`  Skipping question ${idx + 1} in section ${num} - missing type or text`);
        continue;
      }
      
      // Generate ID
      const questionId = generateQuestionId(questionText, type, idx, num);
      console.log(`  Adding ID ${questionId} to question ${idx + 1} in section ${num}`);
      
      // Update the question block
      const updatedQuestionCode = addQuestionIdToBlock(questionCode, questionId);
      
      // Replace in the full content
      updatedContent = updatedContent.replace(questionCode, updatedQuestionCode);
      changesMade = true;
    }
  }
  
  if (changesMade) {
    fs.writeFileSync(filePath, updatedContent, 'utf8');
    console.log(`✅ Updated ${filePath} with question IDs`);
  } else {
    console.log(`ℹ️  No changes needed for ${filePath}`);
  }
}

// Process all markdown files in public/vault
const vaultDir = path.join(__dirname, '..', 'public', 'vault');
const markdownFiles = fs.readdirSync(vaultDir)
  .filter(file => file.endsWith('.md'))
  .filter(file => !file.includes('bookmark')); // Skip bookmarks file

console.log('Adding IDs to existing questions...');
markdownFiles.forEach(file => {
  const filePath = path.join(vaultDir, file);
  addIdsToMarkdownFile(filePath);
});

console.log('Done!');
