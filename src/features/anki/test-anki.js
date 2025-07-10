// Test file for Anki integration
// Run this in browser console to test the AnkiConnect functionality

import { 
  testAnkiConnection, 
  getDeckNames, 
  getNoteTypes, 
  addNoteToAnki, 
  mapQuestionTypeToNoteType,
  fixClozeNumbering 
} from './ankiConnect.js';

// Test connection
console.log('Testing Anki connection...');
testAnkiConnection().then(connected => {
  console.log('Anki connection:', connected ? 'SUCCESS' : 'FAILED');
});

// Test deck names
console.log('Getting deck names...');
getDeckNames().then(decks => {
  console.log('Available decks:', decks);
});

// Test note types
console.log('Getting note types...');
getNoteTypes().then(types => {
  console.log('Available note types:', types);
});

// Test question type mapping
console.log('Question type mapping:');
console.log('CLOZE ->', mapQuestionTypeToNoteType('CLOZE'));
console.log('T-F ->', mapQuestionTypeToNoteType('T-F'));
console.log('T-P ->', mapQuestionTypeToNoteType('T-P'));
console.log('SHORT ->', mapQuestionTypeToNoteType('SHORT'));

// Test cloze numbering fix
console.log('Cloze numbering test:');
const testCloze = 'This is {{c::first}} and {{c::second}} cloze.';
console.log('Before:', testCloze);
console.log('After:', fixClozeNumbering(testCloze));

// Test adding a sample question
const sampleQuestion = {
  type: 'T-F',
  text: 'Berlin ist die Hauptstadt von Deutschland.',
  rawText: 'Berlin ist die **Hauptstadt** von Deutschland.',
  answer: 'R',
  explanation: 'Berlin ist seit 1990 die Hauptstadt von Deutschland.',
  rawExplanation: 'Berlin ist seit **1990** die Hauptstadt von Deutschland.'
};

console.log('Testing note addition...');
addNoteToAnki(sampleQuestion, 'Default').then(noteId => {
  console.log('Note added with ID:', noteId);
}).catch(error => {
  console.error('Failed to add note:', error);
});
