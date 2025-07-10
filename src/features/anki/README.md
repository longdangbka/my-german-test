# Anki Integration

This module provides integration with Anki through the AnkiConnect add-on.

## Features

- **Send questions to Anki**: Convert bookmarked questions to Anki notes
- **Automatic note type detection**: Maps question types to appropriate Anki note types
- **Cloze fix**: Sequential numbering for cloze deletions
- **Full content support**: Preserves markdown formatting

## Prerequisites

1. **Anki**: Must be running
2. **AnkiConnect**: Install the AnkiConnect add-on from [here](https://ankiweb.net/shared/info/2055492159)
3. **Note Types**: The following note types should exist in Anki:
   - `Cloze` (for cloze deletion questions)
   - `T-P` (for True/False questions)
   - `Short` (for short answer questions)
   - `Basic` (fallback for other question types)

## Question Type Mapping

| Quiz Type | Anki Note Type | Fields Used |
|-----------|----------------|-------------|
| `Cloze`   | `Cloze`        | Text, Extra |
| `T-F`, `T-P` | `T-P`       | Front, Back, Extra |
| `Short`   | `Short`        | Front, Back, Extra |
| Others    | `Basic`        | Front, Back, Extra |

## Cloze Fix

The system automatically converts cloze markers:
- `{{c::text}}` → `{{c1::text}}`
- Multiple clozes get sequential numbering: `{{c1::...}}`, `{{c2::...}}`, etc.

## Usage

1. Bookmark questions in any quiz
2. Go to the Bookmarks section
3. Click "Send to Anki" on any question
4. The system will:
   - Test connection to Anki
   - Convert the question to the appropriate format
   - Add it to the specified deck (default: "Default")

## Error Handling

- Connection errors: Check if Anki is running and AnkiConnect is installed
- Note type errors: Ensure required note types exist in Anki
- Field errors: Check that note types have the expected fields

## Troubleshooting

**"Cannot connect to Anki"**
- Make sure Anki is running
- Install AnkiConnect add-on
- Check if AnkiConnect is listening on port 8765

**"Failed to add note"**
- Check if the note type exists
- Verify the note type has the required fields
- Make sure the deck exists

**Cloze not working**
- Ensure you have a "Cloze" note type in Anki
- Check that cloze markers are properly formatted
