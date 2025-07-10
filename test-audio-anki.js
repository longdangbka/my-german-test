// Test script for audio reference extraction in Anki export
const { extractAudioReferences, extractMediaLinks } = require('./src/modules/anki/ankiConnect.js');

// Test content with audio reference
const testContent = `
TYPE: SHORT
ID: qREFRESHTEST_1_short_1wvt8j

AUDIO: ![[audio1_1.mp3]]

Q: Who invented the famous equation $E = mc^2$ that relates energy?
$x=5$

A: Einstein
`;

console.log('Testing audio reference extraction...');
console.log('Test content:');
console.log(testContent);
console.log('\n--- Results ---');

// Test extractAudioReferences function
const audioRefs = extractAudioReferences(testContent);
console.log('Audio references found:', audioRefs);

// Test extractMediaLinks function (should also pick up the audio)
const mediaLinks = extractMediaLinks(testContent);
console.log('Media links found:', mediaLinks);

// Test text after audio removal
let cleanText = testContent;
audioRefs.forEach(audioRef => {
  cleanText = cleanText.replace(audioRef.original, '').trim();
});
console.log('\nText after audio removal:');
console.log(cleanText);
