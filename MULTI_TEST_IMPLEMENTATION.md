# German Test App - Multi-File Support

The application has been successfully updated to support multiple Markdown test files from the `/vault` directory.

## New Features

### 1. Test Selection Screen
- **Initial Screen**: When you start the app, you'll see a beautiful test selection interface
- **Available Tests**: All `.md` files in `/vault` are automatically discovered and displayed as selectable cards
- **Theme Support**: Light/dark mode toggle available on the selection screen

### 2. Dynamic Test Loading
- **File Discovery**: The app scans `/vault` directory for available Markdown test files
- **Manifest Support**: Uses `manifest.json` for efficient file listing (with fallback to known files)
- **Error Handling**: Graceful handling of missing files or network issues

### 3. Enhanced Navigation
- **Back Button**: Easy return to test selection from any active test
- **Persistent Theme**: Theme preference maintained across test switches
- **Clean Interface**: Streamlined navigation with theme toggle in header

## Available Test Files

The following test files are currently available in your `/vault` directory:
- `Question-Sample.md`
- `Question-Sample - 2.md` 
- `German-Test-1.md`
- `Test-2.md`

## How to Add New Tests

1. **Create Markdown File**: Add new `.md` files to the `/public/vault/` directory
2. **Update Manifest**: Add the filename to `/public/vault/manifest.json` (optional but recommended)
3. **Follow Format**: Use the same Markdown format as existing test files

## Technical Implementation

### Key Components

1. **TestSelector Component** (`src/components/TestSelector.jsx`)
   - Displays available tests as interactive cards
   - Handles test selection and theme management
   - Responsive grid layout with hover effects

2. **Test Utilities** (`src/utils/testUtils.js`)
   - `getAvailableTests()`: Discovers available test files
   - `loadTestFile()`: Loads individual test content
   - Supports both manifest.json and fallback discovery

3. **Enhanced App Logic** (`src/App.js`)
   - Conditional rendering: test selector vs. active test
   - State management for selected test and theme
   - Back navigation functionality

4. **Updated Data Hook** (`src/hooks/useQuestionData.js`)
   - Accepts `selectedTestFile` parameter
   - Dynamic test loading based on selection
   - Maintains existing functionality for each test

### File Structure
```
src/
├── components/
│   ├── TestSelector.jsx       # New: Test selection interface
│   ├── Navigation.jsx         # Updated: Simplified navigation
│   └── ...
├── utils/
│   └── testUtils.js          # New: Test file utilities
├── hooks/
│   └── useQuestionData.js    # Updated: Accepts test file parameter
└── App.js                    # Updated: Multi-test flow control

public/vault/
├── manifest.json             # New: File discovery helper
├── Question-Sample.md
├── Question-Sample - 2.md
├── German-Test-1.md
└── Test-2.md
```

## Usage Instructions

1. **Start Application**: Run `npm start` or use the VS Code task
2. **Select Test**: Choose from available test cards on the home screen
3. **Take Test**: Complete questions as usual with full functionality
4. **Switch Tests**: Use "Back to Test Selection" to choose a different test
5. **Theme Toggle**: Use the theme button in the top-right corner

The application maintains all existing functionality while adding the ability to seamlessly switch between multiple test files!
