// Test bookmark parsing
const testBookmarkContent = `--- start-question
TYPE: T-F

Q: Frau Dr. Elke Riedel ist eine Kollegin von Dr. Nowak. $x=5$ asdasdasdasd
![[a282db8dc65a5a98beb88413d7f1d57d549d65882c3e5d4e2250c39dd1953480e22d3d864280d3600dc36b5495d860da4a627cd1991450ea92e721eccfe045f2.jpg]]

\`\`\`jsx
// In your component
return (
  <div className="upload-wrapper">
    <label htmlFor={\`upload-\${group.title}\`} className="btn">
      {src ? 'Change Audio' : 'Upload Audio'}
    </label>
    <input
      id={\`upload-\${group.title}\`}
      type="file"
      accept="audio/*"
      onChange={handleUpload}
    />
  </div>
);
\`\`\`

| a   | b   |
| --- | --- |
| 1   | 2   |

A: R
E: "Sie können aber auch bei unserer Kollegin, Frau Dr. Elke Riedel, einen Termin vereinbaren."

$x=5$
\`\`\`css
.App {
  text-align: center;
}
\`\`\`

--- end-question`;

// Simulate the parsing logic
const parts = testBookmarkContent.split('--- end-question');
if (parts.length >= 2) {
  const questionContent = parts[0].replace('--- start-question', '').trim();
  
  console.log('Question content to parse:', questionContent);
  
  const lines = questionContent.split('\n');
  let currentSection = '';
  let textLines = [];
  let explanationLines = [];
  
  lines.forEach(line => {
    const trimmed = line.trim();
    console.log('Processing line:', `"${line}"`);
    
    if (trimmed.startsWith('TYPE:')) {
      console.log('Found TYPE:', trimmed.substring(5).trim());
    } else if (trimmed.startsWith('Q:')) {
      currentSection = 'question';
      console.log('Starting question section');
      // If there's content after Q: on the same line, include it
      const questionStart = trimmed.substring(2).trim();
      if (questionStart) {
        console.log('Adding inline question start:', `"${questionStart}"`);
        textLines.push(questionStart);
      }
    } else if (trimmed.startsWith('A:')) {
      console.log('Found answer:', trimmed.substring(2).trim());
      currentSection = '';
    } else if (trimmed.startsWith('E:')) {
      currentSection = 'explanation';
      console.log('Starting explanation section');
      // If there's content after E: on the same line, include it
      const explanationStart = trimmed.substring(2).trim();
      if (explanationStart) {
        console.log('Adding inline explanation start:', `"${explanationStart}"`);
        explanationLines.push(explanationStart);
      }
    } else if (currentSection === 'question') {
      console.log('Adding to question:', `"${line}"`);
      textLines.push(line);
    } else if (currentSection === 'explanation') {
      console.log('Adding to explanation:', `"${line}"`);
      explanationLines.push(line);
    }
  });
  
  const questionText = textLines.join('\n');
  const explanationText = explanationLines.join('\n');
  
  console.log('\n=== FINAL RESULTS ===');
  console.log('Question text:');
  console.log(questionText);
  console.log('\nExplanation text:');
  console.log(explanationText);
}
