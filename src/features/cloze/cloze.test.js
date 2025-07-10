/**
 * Unit Tests for Centralized Cloze Logic
 * 
 * Tests for the main cloze.js API functions to ensure consistent behavior
 * across all cloze operations in the app.
 */

import { 
  parseClozes, 
  stripMarkers, 
  replaceWithBlanks, 
  renderWithInputs,
  extractClozeBlanksByGroup,
  extractAllClozeBlanks,
  toSequentialBlanks,
  getClozeIds,
  // Legacy functions for backward compatibility testing
  findCloze,
  stripCloze,
  toBlanks
} from './cloze.js';

describe('parseClozes', () => {
  test('parses single cloze correctly', () => {
    const result = parseClozes("Hello {{c1::world}}!");
    expect(result.ids).toEqual([1]);
    expect(result.parts).toEqual([
      "Hello ",
      expect.objectContaining({
        id: 1,
        content: "world",
        fullMatch: "{{c1::world}}",
        start: 6,
        end: 19
      }),
      "!"
    ]);
  });

  test('handles multiple clozes with same ID', () => {
    const result = parseClozes("{{c1::A}} and {{c1::B}}");
    expect(result.ids).toEqual([1]);
    expect(result.parts).toHaveLength(3);
    expect(result.parts[0]).toEqual(expect.objectContaining({id: 1, content: "A"}));
    expect(result.parts[1]).toBe(" and ");
    expect(result.parts[2]).toEqual(expect.objectContaining({id: 1, content: "B"}));
  });

  test('handles multiple different cloze IDs', () => {
    const result = parseClozes("{{c1::A}} {{c2::B}} {{c3::C}}");
    expect(result.ids).toEqual([1, 2, 3]);
    expect(result.parts).toHaveLength(5);
  });

  test('handles empty text', () => {
    expect(parseClozes("")).toEqual({ids: [], parts: [""]});
    expect(parseClozes(null)).toEqual({ids: [], parts: [""]});
    expect(parseClozes(undefined)).toEqual({ids: [], parts: [""]});
  });

  test('handles text without clozes', () => {
    const result = parseClozes("Plain text without clozes");
    expect(result.ids).toEqual([]);
    expect(result.parts).toEqual(["Plain text without clozes"]);
  });

  test('handles LaTeX inside clozes', () => {
    const result = parseClozes("Equation: {{c1::$x = 2$}}");
    expect(result.parts[1]).toEqual(expect.objectContaining({
      content: "$x = 2$"
    }));
  });
});

describe('stripMarkers', () => {
  test('removes all cloze markers', () => {
    expect(stripMarkers("{{c1::hello}} {{c2::world}}")).toBe("hello world");
  });

  test('handles text without markers', () => {
    expect(stripMarkers("plain text")).toBe("plain text");
  });

  test('handles LaTeX inside clozes', () => {
    expect(stripMarkers("{{c1::$x=2$}}")).toBe("$x=2$");
  });

  test('handles empty text', () => {
    expect(stripMarkers("")).toBe("");
    expect(stripMarkers(null)).toBe("");
    expect(stripMarkers(undefined)).toBe("");
  });

  test('handles complex nested content', () => {
    expect(stripMarkers("The {{c1::capital of {{c2::France}}}} is {{c1::Paris}}"))
      .toBe("The capital of {{c2::France}} is Paris");
  });
});

describe('replaceWithBlanks', () => {
  test('replaces all clozes with blanks', () => {
    expect(replaceWithBlanks("{{c1::A}} {{c2::B}}")).toBe("_____ _____");
  });

  test('replaces only target cloze ID', () => {
    expect(replaceWithBlanks("{{c1::A}} {{c2::B}}", 1)).toBe("_____ {{c2::B}}");
    expect(replaceWithBlanks("{{c1::A}} {{c2::B}}", 2)).toBe("{{c1::A}} _____");
  });

  test('handles multiple instances of same cloze ID', () => {
    expect(replaceWithBlanks("{{c1::A}} and {{c1::B}}", 1)).toBe("_____ and _____");
  });

  test('handles text without clozes', () => {
    expect(replaceWithBlanks("plain text")).toBe("plain text");
  });

  test('handles empty text', () => {
    expect(replaceWithBlanks("")).toBe("");
    expect(replaceWithBlanks(null)).toBe("");
  });
});

describe('extractClozeBlanksByGroup', () => {
  test('extracts unique blanks per cloze ID', () => {
    expect(extractClozeBlanksByGroup("{{c1::A}} {{c2::B}} {{c1::A}}")).toEqual(["A", "B"]);
  });

  test('handles single cloze', () => {
    expect(extractClozeBlanksByGroup("{{c1::hello}}")).toEqual(["hello"]);
  });

  test('handles empty text', () => {
    expect(extractClozeBlanksByGroup("")).toEqual([]);
    expect(extractClozeBlanksByGroup(null)).toEqual([]);
  });

  test('handles object input with rawText', () => {
    const questionObj = { rawText: "{{c1::answer}}" };
    expect(extractClozeBlanksByGroup(questionObj)).toEqual(["answer"]);
  });

  test('maintains cloze ID order', () => {
    expect(extractClozeBlanksByGroup("{{c3::C}} {{c1::A}} {{c2::B}}"))
      .toEqual(["A", "B", "C"]);
  });
});

describe('getClozeIds', () => {
  test('returns unique sorted IDs', () => {
    expect(getClozeIds("{{c3::C}} {{c1::A}} {{c2::B}} {{c1::A2}}")).toEqual([1, 2, 3]);
  });

  test('handles empty text', () => {
    expect(getClozeIds("")).toEqual([]);
    expect(getClozeIds(null)).toEqual([]);
  });

  test('handles text without clozes', () => {
    expect(getClozeIds("plain text")).toEqual([]);
  });
});

describe('renderWithInputs', () => {
  test('renders mixed text and inputs', () => {
    const { parts } = parseClozes("Hello {{c1::world}}");
    const result = renderWithInputs(parts, {
      renderBlank: (idx, info) => `<input-${idx}-${info.content}>`,
      renderText: (text) => text
    });
    expect(result).toEqual(["Hello ", "<input-0-world>"]);
  });

  test('handles multiple clozes with same ID', () => {
    const { parts } = parseClozes("{{c1::A}} and {{c1::B}}");
    const result = renderWithInputs(parts, {
      renderBlank: (idx, info) => `<input-${idx}>`,
      renderText: (text) => text
    });
    // Should only render one input for c1, second becomes placeholder
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual("<input-0>");
    expect(result[1]).toBe(" and ");
    // Second c1 should be a placeholder element
  });

  test('throws error for missing renderBlank function', () => {
    const { parts } = parseClozes("{{c1::test}}");
    expect(() => {
      renderWithInputs(parts, {});
    }).toThrow('renderBlank must be a function');
  });
});

// Test backward compatibility functions
describe('Backward Compatibility', () => {
  test('findCloze works like before', () => {
    const result = findCloze("{{c1::A}} {{c2::B}}");
    expect(result).toEqual([
      {id: 1, content: "A", fullMatch: "{{c1::A}}"},
      {id: 2, content: "B", fullMatch: "{{c2::B}}"}
    ]);
  });

  test('stripCloze works like stripMarkers', () => {
    expect(stripCloze("{{c1::hello}}")).toBe(stripMarkers("{{c1::hello}}"));
  });

  test('toBlanks works like replaceWithBlanks', () => {
    expect(toBlanks("{{c1::A}} {{c2::B}}", 1))
      .toBe(replaceWithBlanks("{{c1::A}} {{c2::B}}", 1));
  });
});

// Test new functions for individual cloze handling
describe('Individual Cloze Extraction', () => {
  test('extractAllClozeBlanks extracts all clozes individually', () => {
    const result = extractAllClozeBlanks("{{c1::hello}} {{c2::world}} {{c1::again}}");
    expect(result).toEqual(["hello", "world", "again"]);
  });

  test('extractAllClozeBlanks vs extractClozeBlanksByGroup difference', () => {
    const text = "{{c1::first}} {{c1::second}} {{c2::third}}";
    
    // Grouped extraction (traditional Anki behavior) 
    const grouped = extractClozeBlanksByGroup(text);
    expect(grouped).toEqual(["first", "third"]);
    
    // Individual extraction (app behavior)
    const individual = extractAllClozeBlanks(text);
    expect(individual).toEqual(["first", "second", "third"]);
  });

  test('toSequentialBlanks creates unique placeholders', () => {
    const result = toSequentialBlanks("{{c1::hello}} {{c2::world}} {{c1::again}}");
    expect(result).toBe("__CLOZE_1__ __CLOZE_2__ __CLOZE_3__");
  });

  test('sequential blanks work with LaTeX content', () => {
    const result = toSequentialBlanks("{{c1::$x=1$}} and {{c1::$y=2$}}");
    expect(result).toBe("__CLOZE_1__ and __CLOZE_2__");
  });

  test('extractAllClozeBlanks handles empty input', () => {
    expect(extractAllClozeBlanks("")).toEqual([]);
    expect(extractAllClozeBlanks(null)).toEqual([]);
    expect(extractAllClozeBlanks(undefined)).toEqual([]);
  });

  test('toSequentialBlanks handles empty input', () => {
    expect(toSequentialBlanks("")).toBe("");
    expect(toSequentialBlanks(null)).toBe("");
    expect(toSequentialBlanks(undefined)).toBe("");
  });
});
