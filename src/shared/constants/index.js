/**
 * Application-wide constants
 */

// Question types
export const QUESTION_TYPES = {
  TRUE_FALSE: 'T-F',
  CLOZE: 'CLOZE',
  MULTIPLE_CHOICE: 'MC', // Future extension
  SHORT_ANSWER: 'SA',    // Future extension
};

// Theme constants
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
};

// Feedback states
export const FEEDBACK_STATES = {
  CORRECT: 'correct',
  INCORRECT: 'incorrect',
  UNANSWERED: 'unanswered',
};

// File paths
export const PATHS = {
  VAULT: '/vault',
  AUDIOS: '/audios',
};

// Regex patterns
export const PATTERNS = {
  CLOZE_MARKER: /\{\{([^}]+)\}\}|\{([^}]+)\}/g,
  LATEX_INLINE: /\$([^$\n]+?)\$/g,
  LATEX_DISPLAY: /\$\$([\s\S]+?)\$\$/g,
  IMAGE_LINK: /!\[\[([^\]]+)\]\]/g,
  CODE_BLOCK: /```(\w+)?\n([\s\S]*?)```/g,
};

export default {
  QUESTION_TYPES,
  THEMES,
  FEEDBACK_STATES,
  PATHS,
  PATTERNS,
};
