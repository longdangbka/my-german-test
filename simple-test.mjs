// Simple test to check if our re-exports work
import { testAnkiConnection } from './src/features/anki/ankiConnect.js';

console.log('Testing re-exports...');
console.log('testAnkiConnection function:', typeof testAnkiConnection);
console.log('✅ Basic import test passed!');
