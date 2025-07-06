# Custom Vault Folder Feature

This document describes the new custom vault folder functionality that allows users to load quiz files from any folder on their system.

## Overview

The app now supports loading quiz files (.md files) from a custom folder selected by the user, while maintaining a fallback to the default vault directory.

## Features Implemented

### 1. Custom Vault Path Management
- **Persistent Storage**: Custom vault paths are saved to user data and persist across app restarts
- **Validation**: Selected folders are validated to ensure they contain .md files
- **Fallback Logic**: If custom vault is unavailable, app falls back to default vault locations

### 2. User Interface
- **Vault Settings Button**: Added to the Quiz Center header (gear icon)
- **Settings Modal**: Shows current vault info and provides selection options
- **Status Feedback**: Clear messages for success/error states
- **File Count Display**: Shows how many quiz files are found in the selected folder

### 3. Electron Integration
- **File Dialog**: Uses native OS folder selection dialog
- **IPC Communication**: Secure communication between main and renderer processes
- **Path Resolution**: Intelligent path resolution with multiple fallback options

## Technical Implementation

### Files Modified/Created

#### Main Process (`main.js`)
- Added `dialog` import for folder selection
- Implemented custom vault path persistence using `app.getPath('userData')`
- Created `loadCustomVaultPath()` and `saveCustomVaultPath()` functions
- Modified `getVaultPath()` to prioritize custom paths
- Added new IPC handlers:
  - `vault:select-folder` - Opens folder selection dialog
  - `vault:get-info` - Returns current vault information
  - `vault:reset-to-default` - Resets to default vault

#### Preload Script (`preload.js`)
- Exposed new vault management methods to renderer process
- Added security-conscious IPC method exposure

#### React Components
- **`VaultFolderManager.jsx`** (new): Complete vault management UI
- **`TestSelector.jsx`**: Integrated vault settings and auto-refresh

### IPC API Reference

```javascript
// Select a custom vault folder
const result = await window.electron.selectVaultFolder();
// Returns: { success: boolean, path?: string, fileCount?: number, error?: string }

// Get current vault information  
const info = await window.electron.getVaultInfo();
// Returns: { path: string, isCustom: boolean, fileCount: number, exists: boolean }

// Reset to default vault
const result = await window.electron.resetVaultToDefault();
// Returns: { success: boolean, error?: string }
```

### Vault Path Resolution Logic

1. **Custom Path** (highest priority): If set and folder exists
2. **Development Default**: `./public/vault` (when ELECTRON_IS_DEV=true)
3. **Production Default**: `process.resourcesPath/vault`
4. **Alternative Paths**: Various fallback locations

### Data Persistence

Custom vault paths are stored in:
```
%APPDATA%/My German Test/vault-config.json
```

Format:
```json
{
  "customVaultPath": "C:\\Users\\Username\\MyQuizzes"
}
```

## User Guide

### How to Use Custom Vault Folders

1. **Access Settings**: Click the gear icon (⚙️) in the Quiz Center header
2. **View Current Vault**: See information about your current vault location
3. **Select Custom Folder**: Click "Select Custom Vault Folder" 
4. **Choose Folder**: Use the file dialog to select a folder containing .md files
5. **Confirmation**: App will validate the folder and show how many quiz files were found
6. **Automatic Refresh**: Quiz list will automatically update with new files

### Requirements for Vault Folders

- Must contain at least one `.md` (Markdown) file
- Files should follow the quiz format with `--- start-question` and `--- end-question` markers
- Folder can be anywhere on the file system
- Subfolders are not currently scanned (files must be in the root of selected folder)

### Resetting to Default

- Use "Reset to Default Vault" button in settings to return to built-in vault
- This removes the custom path setting and uses the app's default location

## Example Folder Structure

```
My Custom Quizzes/
├── Math-Quiz.md
├── Science-Test.md
├── Language-Practice.md
└── Advanced-Topics.md
```

## Benefits

1. **Flexibility**: Users can organize quiz files anywhere on their system
2. **Multiple Quiz Sets**: Easy switching between different quiz collections
3. **Backup Integration**: Custom folders can be in cloud storage or version control
4. **Collaboration**: Teams can share quiz folders easily
5. **Organization**: Users can organize quizzes by subject, difficulty, etc.

## Error Handling

- **Invalid Folder**: Shows error if selected folder has no .md files
- **Missing Folder**: Falls back to default if custom vault folder is deleted
- **Permission Issues**: Graceful handling of read permission problems
- **Network Paths**: Supports network drives and cloud storage folders

## Future Enhancements

Potential improvements for future versions:
- Recursive folder scanning (include subfolders)
- Multiple vault folder support
- Vault folder bookmarks/favorites
- Import/export vault configurations
- File watcher for automatic updates when vault contents change

## Testing

The feature has been tested with:
- ✅ Default vault functionality (backward compatibility)
- ✅ Custom folder selection and validation
- ✅ Path persistence across app restarts
- ✅ Fallback behavior when custom vault is unavailable
- ✅ UI responsiveness and error states
- ✅ LaTeX rendering in custom vault files
- ✅ Both development and packaged app modes
