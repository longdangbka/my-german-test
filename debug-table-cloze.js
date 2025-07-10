// Debug script to test table cloze rendering
import React from 'react';
import ReactDOM from 'react-dom/client';
import TableWithLatex from './src/modules/questions/components/TableWithLatex.js';

// Test case: HTML table with __CLOZE_1__ placeholders
const testHtmlTable = `
<table style="border-collapse: collapse; border: 1px solid black; width: 100%; text-align: left; font-size: 14px;">
  <thead style="background-color: #f2f2f2;">
    <tr>
      <th style="border: 1px solid black; padding: 10px;">__CLOZE_1__</th>
      <th style="border: 1px solid black; padding: 10px;">b</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="border: 1px solid black; padding: 10px;">1</td>
      <td style="border: 1px solid black; padding: 10px;">2</td>
    </tr>
  </tbody>
</table>
`;

// Mock question object
const testQuestion = {
  id: 'test_question_1',
  type: 'CLOZE',
  blanks: ['a'] // The answer for __CLOZE_1__
};

// Mock value and onChange
const testValue = {};
const testOnChange = (e) => {
  console.log('Input changed:', e.target.name, '=', e.target.value);
};

function DebugApp() {
  console.log('🚨🚨🚨 DEBUG APP - Rendering test table');
  
  return (
    <div style={{ padding: '20px' }}>
      <h1>Debug: Table with Cloze Rendering</h1>
      <p>Expected: The first cell should show an input field, not "__CLOZE_1__"</p>
      
      <TableWithLatex
        htmlTable={testHtmlTable}
        question={testQuestion}
        value={testValue}
        onChange={testOnChange}
        showFeedback={false}
        feedback={{}}
        startingBlankIndex={0}
      />
    </div>
  );
}

// Mount the debug app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<DebugApp />);
