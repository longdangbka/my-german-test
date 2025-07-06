import React from 'react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

// Simple test component to debug LaTeX rendering
export default function SimpleLatexTest() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h3>LaTeX Rendering Test</h3>
      
      <div style={{ margin: '10px 0', border: '1px solid red', padding: '10px' }}>
        <strong>Test 1: Direct InlineMath component</strong><br/>
        This is text with <InlineMath math="E = mc^2" /> inline math.
      </div>
      
      <div style={{ margin: '10px 0', border: '1px solid blue', padding: '10px' }}>
        <strong>Test 2: InlineMath wrapped in span</strong><br/>
        This is text with <span style={{ display: 'inline' }}><InlineMath math="F = ma" /></span> inline math.
      </div>
      
      <div style={{ margin: '10px 0', border: '1px solid green', padding: '10px' }}>
        <strong>Test 3: BlockMath for comparison</strong><br/>
        This is text with display math:
        <BlockMath math="x^2 + y^2 = z^2" />
        And more text after.
      </div>
      
      <div style={{ margin: '10px 0', border: '1px solid orange', padding: '10px' }}>
        <strong>Test 4: Mixed content in single line</strong><br/>
        <span>Who invented <InlineMath math="E = mc^2" /> the theory?</span>
      </div>
    </div>
  );
}
