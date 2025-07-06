import React from 'react';
import { renderWithInlineLatex } from '../utils/latexRenderer';

// Debug component to test LaTeX rendering
export default function DebugLatexTest() {
  const testCases = [
    'Simple text without LaTeX',
    'Text with inline $x^2 + y^2 = z^2$ math',
    'Who invents $x^2 + y^2 = z^2$ the theory?',
    'Text with display $$E = mc^2$$ math',
    'Mixed $a = b$ and $$c = d$$ math'
  ];

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>LaTeX Rendering Debug Test</h2>
      {testCases.map((testCase, index) => (
        <div key={index} style={{ 
          margin: '20px 0', 
          padding: '10px', 
          border: '1px solid #ccc',
          backgroundColor: '#f9f9f9'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>
            Test Case {index + 1}: "{testCase}"
          </div>
          <div style={{ marginBottom: '10px' }}>
            Raw input: <code>{testCase}</code>
          </div>
          <div style={{ border: '1px solid #00f', padding: '5px' }}>
            Rendered: {renderWithInlineLatex(testCase)}
          </div>
        </div>
      ))}
    </div>
  );
}
