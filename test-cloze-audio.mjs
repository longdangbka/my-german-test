// Test AUDIO field with Cloze question type
import { prepareQuestionForAnkiAsync } from './src/modules/anki/ankiConnect.js';

const clozeQuestion = {
  id: 'test_cloze_audio',
  type: 'CLOZE',
  rawText: `AUDIO: ![[pronunciation.mp3]]

Q: The capital of {{c1::Germany}} is {{c2::Berlin}}.`,
  audioFile: 'pronunciation.mp3'
};

async function testClozeWithAudio() {
  console.log('🎵 Testing Cloze Question with AUDIO Field');
  console.log('==========================================');
  
  try {
    const result = await prepareQuestionForAnkiAsync(clozeQuestion, 'Cloze');
    console.log('\n📋 Cloze Note with AUDIO:');
    Object.entries(result.fields).forEach(([field, content]) => {
      console.log(`${field}: ${content}`);
    });
  } catch (error) {
    console.log('Expected error:', error.message);
  }
}

testClozeWithAudio();
