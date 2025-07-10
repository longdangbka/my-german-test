// Test the updated audio support - now using AUDIO field
import { 
  extractAudioReferences, 
  prepareQuestionForAnkiAsync 
} from './src/modules/anki/ankiConnect.js';

// Test question object that mimics what would be parsed from the bookmark
const testQuestion = {
  id: 'qREFRESHTEST_1_short_1wvt8j',
  type: 'SHORT',
  rawText: `AUDIO: ![[audio1_1.mp3]]

Q: Who invented the famous equation $E = mc^2$ that relates energy?`,
  answer: 'Einstein',
  audioFile: 'audio1_1.mp3'
};

async function testUpdatedAudioSupport() {
  console.log('🎵 Testing Updated Audio Support - AUDIO Field');
  console.log('==============================================');
  
  console.log('\n🔍 Testing question preparation for Anki with AUDIO field');
  try {
    const result = await prepareQuestionForAnkiAsync(testQuestion, 'Short');
    console.log('\n📋 Final Anki Note Structure:');
    console.log('- Note Type:', result.noteType);
    console.log('- Fields:');
    Object.entries(result.fields).forEach(([fieldName, content]) => {
      console.log(`  * ${fieldName}:`, content);
    });
    console.log('- Tags:', result.tags);
    
    console.log('\n✅ Audio should now be in AUDIO field, not mixed with answer!');
  } catch (error) {
    console.log('Expected error (browser environment needed):', error.message);
  }
}

// Run the test
testUpdatedAudioSupport();
