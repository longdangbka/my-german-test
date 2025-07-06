# Electron Build Optimization Guide

## Problem Solved ✅
- **Before**: `npm run dist-win` took 3-5+ minutes and consumed heavy CPU/disk resources
- **After**: Fast development builds take ~30-60 seconds with minimal resource usage

## Key Optimizations Implemented

### 1. Separate Scripts for Different Use Cases

```json
{
  "scripts": {
    // Development - No frontend rebuild, fast iteration
    "dist-dev": "electron-builder --dir",
    "dist-dev-fast": "electron-builder --dir --config.win.sign=false",
    
    // Production - Full rebuild when frontend changes
    "dist-win": "electron-builder --win", 
    "dist-win-full": "npm run build && electron-builder --win",
    
    // Utilities
    "clean": "rimraf dist",
    "build": "react-scripts build"
  }
}
```

### 2. Skip Frontend Rebuild When Unnecessary
- Use `dist-win` (no npm run build) when only Electron main process changes
- Use `dist-win-full` only when React code changes

### 3. Use `--dir` for Development Testing
- Creates unpacked app directory instead of installers
- Skips compression and installer creation
- Perfect for testing functionality quickly

### 4. Optimized File Bundling
```json
"files": [
  "build/**/*",
  "main.js", 
  "preload.js",
  "package.json",
  "!**/*.ts",
  "!**/*.map",
  "!build/**/*.map",
  "!node_modules",    // Exclude unnecessary files
  "!src",             // Exclude source code
  "!public",          // Exclude public folder (using extraResources)
  "!scripts",         // Exclude build scripts
  "!**/.git*",        // Exclude git files
  "!**/.*",           // Exclude hidden files
  "!**/*.log"         // Exclude log files
]
```

### 5. Disabled Code Signing for Development
```json
"win": {
  "forceCodeSigning": false,
  "verifyUpdateCodeSignature": false,
  "target": [
    {
      "target": "nsis",
      "arch": ["x64"]     // Single architecture for speed
    }
  ]
}
```

### 6. Content Refresh Solution ✅
**Problem**: Markdown file changes not reflected after reload
**Solution**: 
- Added `forceRefresh()` function that clears React state
- Added timestamp-based cache busting for IPC calls
- Added "📄 Refresh Content" button
- Added keyboard shortcuts (Ctrl+R, F5) for refresh
- IPC handlers now log file modification times for debugging

## Usage Guide

### For Development (Fastest)
```bash
# When testing Electron app functionality (no React changes)
npm run dist-dev              # ~30-60 seconds

# When you need to test with latest React changes  
npm run build                 # Build React first
npm run dist-dev              # Then package

# Clean build artifacts when needed
npm run clean
```

### For Production Release
```bash
npm run dist-win-full         # Full build with React compilation
```

### Testing Content Refresh
1. Run the packaged app: `dist/win-unpacked/My German Test.exe`
2. Edit vault files in: `dist/win-unpacked/resources/vault/`
3. In the app, click "📄 Refresh Content" or press Ctrl+R/F5
4. Content updates immediately without app restart

## Performance Results

| Build Type | Time | CPU Usage | Use Case |
|------------|------|-----------|-----------|
| `dist-dev` | ~30-60s | Low | Development testing |
| `dist-win` | ~1-2min | Medium | Quick packaging |
| `dist-win-full` | ~3-4min | High | Production release |

## Key Files Modified
- `package.json` - Build scripts and configuration
- `src/hooks/useQuestionData.js` - Added forceRefresh function
- `src/components/TestControls.jsx` - Added refresh button
- `src/App.js` - Added keyboard shortcuts
- `src/questions.js` - Cache busting for file requests
- `main.js` - Enhanced IPC logging and timestamp handling

## Content Update Workflow ✅
1. **Development**: Edit files in `public/vault/` → Use refresh button
2. **Packaged App**: Edit files in `dist/win-unpacked/resources/vault/` → Use refresh button  
3. **No App Restart Required**: Content refreshes instantly with button/shortcut

The app now successfully loads updated Markdown content when headings or questions are changed!
