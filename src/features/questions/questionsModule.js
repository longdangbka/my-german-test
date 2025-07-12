// index.js
// Main export for the questions module

export { questionTypes } from './types';
export { QuestionList, CodeBlock, TableWithLatex } from './components';
export { loadQuestionGroups } from './questions';

// Re-export utilities for backward compatibility
export { parseContentWithOrder, extractContentElements } from './parsers/contentParser.js';
export { parseStandardMarkdown } from './parsers/groupParser.js';
export { buildQuestion } from './builders/questionBuilder.js';
export { loadVaultFile, ensureQuestionIds } from './loaders/vaultLoader.js';
