/**
 * Anki Connect configuration and constants
 */

export const ANKI_CONFIG = {
  PORT: 8765,
  VERSION: 6,
  DEFAULT_DECK: 'Default',
  TAGS: ['german-quiz', 'bookmark']
};

export const MEDIA_CONFIG = {
  IMAGE_EXTS: ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.tiff'],
  AUDIO_EXTS: ['.wav', '.m4a', '.flac', '.mp3', '.wma', '.aac', '.webm']
};

export const SUPPORTED_MEDIA_EXTS = [...MEDIA_CONFIG.IMAGE_EXTS, ...MEDIA_CONFIG.AUDIO_EXTS];

export const NOTE_TYPE_MAPPING = {
  CLOZE: 'Cloze',
  'T-F': 'T-F',
  'T-P': 'T-F',
  SHORT: 'Short',
  BASIC: 'Basic'
};

export const FIELD_MAPPING = {
  CLOZE: {
    TEXT_FIELDS: ['Text', 'Q', 'Front', 'Question'],
    EXTRA_FIELDS: ['Extra', 'E', 'A', 'Back', 'Notes'],
    AUDIO_FIELD: 'AUDIO'
  },
  BASIC: {
    QUESTION_FIELDS: ['Front', 'Question', 'Prompt', 'Q'],
    ANSWER_FIELDS: ['Back', 'Answer', 'Response', 'A'],
    EXPLANATION_FIELDS: ['Extra', 'Explanation', 'Notes', 'E'],
    AUDIO_FIELD: 'AUDIO'
  }
};

// Pre-compiled regex patterns for better performance
export const REGEX_PATTERNS = {
  CLOZE: /\{\{c(\d+)?(::|:\[)/.test.bind(/\{\{c(\d+)?(::|:\[)/),
  OBSIDIAN_MEDIA: /!\[\[([^\]]+)\]\]/g,
  MARKDOWN_MEDIA: /!\[([^\]]*)\]\(([^)]+)\)/g,
  AUDIO_REFS: /AUDIO:\s*!\[\[([^\]]+)\]\]/g,
  ESCAPE_REGEX: /[.*+?^${}()|[\]\\]/g,
  LATEX_DISPLAY: /\$\$([\s\S]*?)\$\$/g,
  LATEX_INLINE: /\$([^$\n]+)\$/g,
  CODE_BLOCKS: /```(\w*)\n?([\s\S]*?)```/g,
  INLINE_CODE: /`([^`]+)`/g,
  TABLE: /(\|[^\n]*\|[\s]*\n[\s]*\|[^\n]*\|[\s]*\n(?:\|[^\n]*\|[\s]*\n)*)/g
};

export const DEBUG_CONFIG = {
  ENABLED: false, // Set to true to enable debug logging
  PREFIX: '🔧 ANKI DEBUG'
};
