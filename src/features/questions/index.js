/**
 * Questions feature module exports
 * Provides all question-related functionality including types, components, services, and utilities
 */

// Question type classes and factory
export * from './types/index.js';
export { default as createQuestionType } from './types/index.js';

// Question components
export * from './components/index.js';

// Question services
export { default as questionParser } from './services/questionParser.js';

// Question utilities
export { default as contentExtractor } from './utils/contentExtractor.js';

// Re-export the main question creation factory for convenience
export { createQuestionType as QuestionTypeFactory } from './types/index.js';
