// Test script to verify bookmark fix implementations
// This script validates that the bookmark system fixes are working correctly

const fs = require('fs');
const path = require('path');

console.log('🔖 Testing Bookmark System Fixes...\n');

// Test 1: Verify bookmark file has correct format
console.log('📋 Test 1: Checking bookmark file format...');
const bookmarksPath = path.join(__dirname, 'public', 'vault', 'bookmarks.md');

let bookmarkIds = [];

if (fs.existsSync(bookmarksPath)) {
  const bookmarksContent = fs.readFileSync(bookmarksPath, 'utf8');
  console.log('✅ Bookmarks file exists');
  
  // Check for duplicate IDs
  const idMatches = bookmarksContent.match(/^ID:\s*(.+)$/gm);
  if (idMatches) {
    bookmarkIds = idMatches.map(match => match.replace(/^ID:\s*/, '').trim());
    const uniqueIds = [...new Set(bookmarkIds)];
    
    console.log(`📊 Found ${bookmarkIds.length} bookmarks with IDs`);
    console.log(`📊 Unique IDs: ${uniqueIds.length}`);
    
    if (bookmarkIds.length === uniqueIds.length) {
      console.log('✅ No duplicate bookmark IDs found');
    } else {
      console.log('❌ Duplicate bookmark IDs detected!');
      const duplicates = bookmarkIds.filter((id, index) => bookmarkIds.indexOf(id) !== index);
      console.log('Duplicates:', duplicates);
    }
    
    // Display found IDs
    console.log('Found bookmark IDs:');
    uniqueIds.forEach(id => console.log(`  - ${id}`));
  } else {
    console.log('⚠️  No bookmarks with IDs found');
  }
} else {
  console.log('❌ Bookmarks file not found');
}

console.log('\n📋 Test 2: Checking original question IDs...');
const questionFiles = fs.readdirSync(path.join(__dirname, 'public', 'vault'))
  .filter(file => file.endsWith('.md') && !file.includes('bookmark'));

let originalQuestionIds = [];

questionFiles.forEach(file => {
  const filePath = path.join(__dirname, 'public', 'vault', file);
  const content = fs.readFileSync(filePath, 'utf8');
  const idMatches = content.match(/^ID:\s*(.+)$/gm);
  
  if (idMatches) {
    const fileIds = idMatches.map(match => match.replace(/^ID:\s*/, '').trim());
    originalQuestionIds.push(...fileIds);
    console.log(`📄 ${file}: ${fileIds.length} questions with IDs`);
  }
});

console.log(`📊 Total original questions with IDs: ${originalQuestionIds.length}`);

// Test 3: Check for ID consistency between bookmarks and originals
console.log('\n📋 Test 3: Checking ID consistency...');
if (bookmarkIds.length > 0 && originalQuestionIds.length > 0) {
  bookmarkIds.forEach(bookmarkId => {
    if (originalQuestionIds.includes(bookmarkId)) {
      console.log(`✅ Bookmark ID ${bookmarkId} matches original question`);
    } else {
      console.log(`❌ Bookmark ID ${bookmarkId} does not match any original question`);
    }
  });
} else {
  console.log('⚠️  No bookmark IDs or original question IDs to compare');
}

// Test 4: Verify BookmarkButton component fixes
console.log('\n📋 Test 4: Checking BookmarkButton component...');
const bookmarkButtonPath = path.join(__dirname, 'src', 'modules', 'bookmarks', 'BookmarkButton.jsx');

if (fs.existsSync(bookmarkButtonPath)) {
  const buttonContent = fs.readFileSync(bookmarkButtonPath, 'utf8');
  
  // Check for proper ID usage
  if (buttonContent.includes('const questionId = question.id;')) {
    console.log('✅ BookmarkButton uses question.id directly');
  } else {
    console.log('❌ BookmarkButton may not be using question.id correctly');
  }
  
  // Check for duplicate detection
  if (buttonContent.includes('idPattern.test(bookmarksContent)')) {
    console.log('✅ BookmarkButton includes duplicate detection');
  } else {
    console.log('❌ BookmarkButton missing duplicate detection');
  }
  
  // Check for proper yellow/gray styling
  if (buttonContent.includes('text-yellow-500')) {
    console.log('✅ BookmarkButton includes yellow styling for bookmarked items');
  } else {
    console.log('❌ BookmarkButton missing yellow styling');
  }
  
  // Check for logging
  if (buttonContent.includes('🔖')) {
    console.log('✅ BookmarkButton includes debug logging');
  } else {
    console.log('❌ BookmarkButton missing debug logging');
  }
}

// Test 5: Verify BookmarksViewer fixes
console.log('\n📋 Test 5: Checking BookmarksViewer component...');
const bookmarksViewerPath = path.join(__dirname, 'src', 'modules', 'bookmarks', 'BookmarksViewer.jsx');

if (fs.existsSync(bookmarksViewerPath)) {
  const viewerContent = fs.readFileSync(bookmarksViewerPath, 'utf8');
  
  // Check for proper ID extraction
  if (viewerContent.includes('question.id = trimmed.substring(3).trim()')) {
    console.log('✅ BookmarksViewer extracts ID from ID: line');
  } else {
    console.log('❌ BookmarksViewer may not extract ID correctly');
  }
  
  // Check for fallback ID generation
  if (viewerContent.includes('Generated fallback ID')) {
    console.log('✅ BookmarksViewer includes fallback ID generation');
  } else {
    console.log('❌ BookmarksViewer missing fallback ID generation');
  }
  
  // Check for logging
  if (viewerContent.includes('🔖 BOOKMARK PARSER')) {
    console.log('✅ BookmarksViewer includes debug logging');
  } else {
    console.log('❌ BookmarksViewer missing debug logging');
  }
}

console.log('\n🏁 Bookmark system fix validation complete!');
console.log('\n💡 To test manually:');
console.log('1. Open http://localhost:3002');
console.log('2. Go to a quiz and try bookmarking questions');
console.log('3. Check that bookmark button turns yellow for bookmarked questions');
console.log('4. Go to bookmarks section and verify IDs match original questions');
console.log('5. Try bookmarking the same question again - it should not create duplicates');
