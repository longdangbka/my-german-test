import React from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import { renderSimpleLatex } from '../utils/simpleLatexRenderer';

export default function LaTeXTest() {
  const testCases = [
    "Simple inline: $x^2$ in text",
    "Multiple: $a = 1$ and $b = 2$ here",
    "Block: $$E = mc^2$$",
    "Mixed: Before $x = 5$ then $$y = x^2$$ after $z = 1$"
  ];

  return (
    <div style={{ padding: '20px', border: '2px solid red', margin: '10px' }}>
      <h3>LaTeX Test Component</h3>
      
      <div style={{ marginBottom: '20px' }}>
        <h4>Direct KaTeX Components:</h4>
        <p>
          This is <InlineMath math="x^2" /> inline math in text.
        </p>
        <p>
          Multiple: <InlineMath math="a = 1" /> and <InlineMath math="b = 2" /> here.
        </p>
        <BlockMath math="E = mc^2" />
      </div>

      <div>
        <h4>Through simpleLatexRenderer:</h4>
        {testCases.map((test, i) => (
          <div key={i} style={{ 
            border: '1px solid blue', 
            margin: '5px 0', 
            padding: '5px',
            backgroundColor: '#f0f0f0'
          }}>
            <strong>Input:</strong> {test}
            <br />
            <strong>Rendered:</strong> {renderSimpleLatex(test)}
          </div>
        ))}
      </div>
    </div>
  );
}
