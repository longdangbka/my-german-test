// Quick test for code block regex
const testText = `Here is some text with a code block:

\`\`\`jsx
// In your component
return (
  <div className="upload-wrapper">
    <label htmlFor={\`upload-\${group.title}\`} className="btn">
      {src ? 'Change Audio' : 'Upload Audio'}
    </label>
  </div>
);
\`\`\`

More text after the code block.`;

const codeBlockRegex = /```([\w-]*)\r?\n([\s\S]*?)```/g;

console.log('Testing regex on sample text...');
console.log('Text to test:', testText);

let match;
const matches = [];
while ((match = codeBlockRegex.exec(testText)) !== null) {
  console.log('Found match:', match);
  matches.push({
    fullMatch: match[0],
    language: match[1],
    code: match[2],
    start: match.index,
    end: match.index + match[0].length
  });
}

console.log('All matches:', matches);
