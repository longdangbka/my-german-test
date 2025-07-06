# Bookmark Feature Implementation

## Overview
The bookmark feature allows users to save individual question blocks for later review. Bookmarked questions can be accessed as a special quiz in the app.

## Features Implemented

### 1. Bookmark Button
- Added to each question block (both T-F and Cloze types)
- Shows bookmark status (filled/unfilled bookmark icon)
- Smooth hover animations and visual feedback
- Loading state during bookmark operations

### 2. Bookmark Storage
- **Electron**: Stores bookmarks in `vault/bookmarks.md` file
- **Browser**: Falls back to localStorage for browser-only usage
- Uses a structured format compatible with existing quiz parsing

### 3. Bookmark Format
Bookmarks are stored in the same format as quiz questions:
```markdown
--- start-question
TYPE: CLOZE

Q: 
{{Machen}} Sie bitte während der Führung Handys und Smartphones {aus} oder stellen Sie sie auf {lautlos}.

ANSWER: R

E: Explanation here...

--- end-question

id: unique_question_id
quiz: original_quiz_name
timestamp: 2025-07-06T12:34:56.789Z
---
```

### 4. Bookmarks Viewer
- Accessible via "Bookmarks" button in Quiz Center
- Shows all bookmarked questions as a reviewable quiz
- Supports same functionality as regular quizzes:
  - Answer checking
  - Auto-fill (Show answers)
  - Reset functionality
- Empty state when no bookmarks exist

### 5. IPC Integration
- Added `vault:write-file` IPC handler for saving bookmarks
- Updated preload.js to expose writeVaultFile method
- Maintains security with proper IPC channel whitelisting

## Files Modified

### Core Components
- `src/components/BookmarkButton.jsx` - New bookmark button component
- `src/components/BookmarksViewer.jsx` - New bookmarks quiz viewer
- `src/components/QuestionList.jsx` - Updated to pass quizName prop
- `src/components/TestSelector.jsx` - Added bookmarks button to UI

### Question Types
- `src/questionTypes/TrueFalse.js` - Added bookmark button integration
- `src/questionTypes/Cloze.js` - Added bookmark button integration

### App Structure
- `src/App.js` - Added bookmark viewer routing and state management

### Electron Integration
- `main.js` - Added vault:write-file IPC handler
- `preload.js` - Exposed writeVaultFile method

## Usage Instructions

### For Users
1. **Bookmarking Questions**: Click the bookmark icon on any question to save it
2. **Viewing Bookmarks**: Click "Bookmarks" button in Quiz Center
3. **Reviewing Bookmarks**: Use bookmarks viewer like any other quiz
4. **Removing Bookmarks**: Click the filled bookmark icon to remove

### For Developers
1. **Adding to New Question Types**: 
   - Import BookmarkButton component
   - Add quizName prop to Renderer function
   - Include BookmarkButton in question layout

2. **Bookmark File Location**:
   - Development: `public/vault/bookmarks.md`
   - Production: `{app}/resources/vault/bookmarks.md`

## Technical Details

### Unique ID Generation
Each bookmark gets a unique ID combining:
- Quiz name
- Question index
- Original question ID (if available)

### Error Handling
- Graceful fallback to localStorage in browser mode
- Error logging for debugging
- Non-blocking failures (app continues if bookmark fails)

### Performance
- Lazy loading of bookmark status
- Efficient bookmark file parsing
- Minimal impact on main quiz functionality

## Future Enhancements
- Export bookmarks to separate quiz files
- Bookmark categories/tags
- Search within bookmarks
- Bookmark sharing between users
- Analytics on most bookmarked question types
