// Test the audio support in Anki export functionality
import { 
  extractAudioReferences, 
  extractMediaLinks, 
  prepareQuestionForAnkiAsync 
} from './src/modules/anki/ankiConnect.js';

// Test question object that mimics what would be parsed from the bookmark
const testQuestion = {
  id: 'qREFRESHTEST_1_short_1wvt8j',
  type: 'SHORT',
  rawText: `AUDIO: ![[audio1_1.mp3]]

Q: Who invented the famous equation $E = mc^2$ that relates energy?
$x=5$

$y=5$`,
  text: 'Who invented the famous equation $E = mc^2$ that relates energy? $x=5$ $y=5$',
  answer: 'Einstein',
  audioFile: 'audio1_1.mp3', // This would be set by the bookmark parser
  orderedElements: [],
  explanationOrderedElements: [],
  images: [],
  codeBlocks: [],
  latexBlocks: [],
  htmlTables: []
};

async function testAudioSupport() {
  console.log('🎵 Testing Audio Support in Anki Export');
  console.log('=====================================');
  
  console.log('Test Question:');
  console.log('- ID:', testQuestion.id);
  console.log('- Type:', testQuestion.type);
  console.log('- Raw Text:', testQuestion.rawText);
  console.log('- Audio File:', testQuestion.audioFile);
  console.log('- Answer:', testQuestion.answer);
  
  console.log('\n🔍 Step 1: Testing audio reference extraction');
  const audioRefs = extractAudioReferences(testQuestion.rawText);
  console.log('Audio references found:', audioRefs);
  
  console.log('\n🔍 Step 2: Testing media links extraction');
  const mediaLinks = extractMediaLinks(testQuestion.rawText);
  console.log('Media links found:', mediaLinks);
  
  console.log('\n🔍 Step 3: Testing question preparation for Anki');
  try {
    // Note: This will fail in Node.js because it needs browser environment
    // But we can see if the logic flow works
    const result = await prepareQuestionForAnkiAsync(testQuestion, 'Short');
    console.log('Prepared Anki note:', result);
  } catch (error) {
    console.log('Expected error (browser environment needed):', error.message);
  }
  
  console.log('\n✅ Test completed!');
}

// Run the test
testAudioSupport();
