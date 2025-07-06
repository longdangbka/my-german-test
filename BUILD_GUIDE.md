# German Quiz App - Build Guide

## 🚀 Building the Application

### Development Mode
```bash
# Start development server (React + Electron)
npm start                    # Starts React dev server on http://localhost:3001
npm run electron-dev         # Starts Electron in development mode
```

### Production Builds
```bash
# Build React app only
npm run build

# Build Windows executables (recommended)
npm run dist-portable        # Creates portable .exe and installer

# Build for specific platforms
npm run dist-win            # Windows only
npm run dist                # All configured platforms
npm run dist-all            # Windows, Mac, Linux
```

## 📁 Build Output (dist/ folder)

After running `npm run dist-portable`, you'll find:

```
dist/
├── win-unpacked/                           # Unpacked Windows app folder
│   └── My German Test.exe                  # Direct executable
├── MyGermanTest-Portable-0.1.0.exe       # Portable executable (recommended)
└── My German Test Setup 0.1.0.exe        # Windows installer
```

## 🎯 Recommended Usage

### For Distribution:
- **`MyGermanTest-Portable-0.1.0.exe`** - Single file, no installation needed

### For Development/Testing:
- **`dist/win-unpacked/My German Test.exe`** - Faster to rebuild and test

## 🔧 Quiz Management

```bash
# Update quiz manifest (after adding new .md files to /vault)
npm run update-quizzes
```

## 📝 Project Structure

```
src/
├── components/              # React components
├── features/               # Feature-specific modules
├── utils/                  # Utility functions
└── questionTypes/          # Quiz question type handlers

public/
├── vault/                  # Quiz files (.md)
└── audios/                # Audio files

main.js                     # Electron main process
preload.js                  # Electron preload script
```

## ✅ Features Included

- ✅ Quiz sorting (by name, created date, modified date)
- ✅ Image support with IPC-based loading
- ✅ Audio playback support
- ✅ Dark/Light theme toggle
- ✅ LaTeX math rendering
- ✅ Code syntax highlighting
- ✅ True/False and Cloze question types
- ✅ **Bookmark System**: Save individual questions for later review
  - Bookmark any question during quiz
  - Access bookmarks as a special quiz
  - Persistent storage in vault/bookmarks.md
- ✅ Vault file management via Electron IPC
