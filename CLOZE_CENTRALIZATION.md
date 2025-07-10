# Centralized Cloze Logic Documentation

## Overview

All cloze parsing, blanking, stripping, and rendering logic has been centralized into the `src/cloze.js` module. This ensures consistent behavior across the entire application and makes maintenance much easier.

## Main API Functions

### 1. `parseClozes(text)` 
**The main parsing function that replaces all ad-hoc parsing logic**

```javascript
const { ids, parts } = parseClozes("Hello {{c1::world}} and {{c2::universe}}");
// Returns: {
//   ids: [1, 2],
//   parts: [
//     "Hello ", 
//     {id: 1, content: "world", fullMatch: "{{c1::world}}", start: 6, end: 19},
//     " and ",
//     {id: 2, content: "universe", fullMatch: "{{c2::universe}}", start: 24, end: 39}
//   ]
// }
```

### 2. `stripMarkers(text)`
**Remove all cloze markers, showing only inner content**

```javascript
stripMarkers("Hello {{c1::world}} and {{c2::universe}}")
// Returns: "Hello world and universe"
```

### 3. `replaceWithBlanks(text, targetId?)`
**Convert markers to blanks for preview/non-interactive views**

```javascript
replaceWithBlanks("Hello {{c1::world}} and {{c2::universe}}", 1)
// Returns: "Hello _____ and {{c2::universe}}"

replaceWithBlanks("Hello {{c1::world}} and {{c2::universe}}")
// Returns: "Hello _____ and _____"
```

### 4. `renderWithInputs(parts, props)`
**Render cloze parts with React inputs or components**

```javascript
const { parts } = parseClozes("Hello {{c1::world}}");
const rendered = renderWithInputs(parts, {
  renderBlank: (idx, clozeInfo) => 
    <input key={idx} placeholder={clozeInfo.content} />,
  renderText: (text) => <span>{text}</span>
});
```

## React Components

### `ClozeBlank`
Centralized React component for rendering cloze input fields or feedback displays.

```jsx
<ClozeBlank
  question={question}
  blankIndex={0}
  value={formValues}
  onChange={handleChange}
  showFeedback={false}
  feedback={feedbackState}
  clozeInfo={{id: 1, content: "world"}}
/>
```

### `ClozeText` (in ClozeBlank.jsx)
Higher-order component that automatically parses and renders cloze text.

```jsx
<ClozeText
  text="Hello {{c1::world}}"
  question={question}
  value={formValues}
  onChange={handleChange}
  showFeedback={false}
  feedback={feedbackState}
/>
```

## Advanced Functions

### `extractClozeBlanksByGroup(content)`
Extract unique blanks for question processing.

```javascript
extractClozeBlanksByGroup("{{c1::hello}} {{c2::world}} {{c1::hello}}")
// Returns: ["hello", "world"]
```

### `toIdAwareBlanks(text)`
Convert to ID-aware placeholder format.

```javascript
toIdAwareBlanks("{{c1::hello}} {{c2::world}} {{c1::again}}")
// Returns: "__CLOZE_1__ __CLOZE_2__ __CLOZE_1__"
```

### `validateClozeText(text)`
Validate cloze structure and numbering.

```javascript
const result = validateClozeText("{{c1::hello}} {{c3::world}}");
// Returns: {
//   isValid: false,
//   errors: ["Cloze IDs are not sequential"],
//   ids: [1, 3],
//   clozeCount: 2
// }
```

## Migration Guide

### Before (Ad-hoc Logic)
```javascript
// Old scattered approach
const regex = /\{\{c(\d+)::([^}]+)\}\}/g;
const matches = text.matchAll(regex);
// ... custom parsing logic everywhere
```

### After (Centralized API)
```javascript
// New centralized approach
import { parseClozes, stripMarkers, renderWithInputs } from './cloze.js';

const { ids, parts } = parseClozes(text);
const cleanText = stripMarkers(text);
const rendered = renderWithInputs(parts, { renderBlank, renderText });
```

## Key Features

✅ **Numbered clozes** (c1, c2, ...) and sequential renumbering  
✅ **Converting markers to blanks** for preview/non-interactive views  
✅ **Stripping markers** entirely while preserving inner text  
✅ **Injecting input fields** or React components for interactive mode  
✅ **LaTeX support** inside cloze spans (e.g. `{{c1::$x=2$}}`)  
✅ **Backward compatibility** with existing function names  
✅ **Unit tests** covering each API method  
✅ **Single source of truth** - future fixes only touch `cloze.js`  

## Integration Points

The centralized cloze logic is now used in:

- `src/modules/questions/types/Cloze.js` - Main cloze question renderer
- `src/modules/questions/components/TableWithLatex.js` - Table cell processing
- `src/modules/questions/components/ClozeRenderers.jsx` - Focused rendering components
- `src/modules/bookmarks/BookmarksViewer.jsx` - Bookmark display and export
- `src/modules/questions/questions.js` - Question parsing and processing

## Testing

Unit tests are provided in `src/cloze.test.js` covering:
- Parsing edge cases and complex scenarios
- Stripping and blanking with various inputs
- React rendering with different configurations
- Backward compatibility with legacy functions
- Error handling and validation

Run tests with: `npm test cloze.test.js`

## Backward Compatibility

Legacy function names are still supported:
- `findCloze()` → use `parseClozes()` for new code
- `stripCloze()` → use `stripMarkers()` for new code  
- `toBlanks()` → use `replaceWithBlanks()` for new code
- `renderClozeText()` → use `renderWithInputs()` with `parseClozes()` for new code

These functions are marked as deprecated and will show warnings in development.
