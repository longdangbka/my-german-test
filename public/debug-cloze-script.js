// Debug script to test cloze parsing with LaTeX
// Run this in the browser console when the React app is loaded

function testClozeParsingInApp() {
    console.log('🧪 Testing Cloze Parsing with LaTeX in React App');
    
    // Test content with cloze and LaTeX
    const testContent = "The formula is {{c::Machen $x=1$}}, and the result is {{c::$y = 2x + 3$}}.";
    
    console.log('Original text:', testContent);
    
    // Check if our parsing function is available
    if (window.parseClozeMarkers) {
        const markers = window.parseClozeMarkers(testContent);
        console.log('Parsed cloze markers:', markers);
    } else {
        console.log('parseClozeMarkers not available in global scope');
    }
    
    // Load and test a real question file
    fetch('/vault/Test-Cloze-LaTeX.md')
        .then(response => response.text())
        .then(text => {
            console.log('Test file content:', text);
            
            // Check for cloze markers in the file
            const clozeRegex = /\{\{c::([^}]+)\}\}/g;
            const matches = [...text.matchAll(clozeRegex)];
            console.log('Cloze markers found in test file:', matches);
            
            matches.forEach((match, idx) => {
                console.log(`Marker ${idx + 1}:`, {
                    full: match[0],
                    content: match[1],
                    hasLatex: match[1].includes('$')
                });
            });
        })
        .catch(error => {
            console.error('Error loading test file:', error);
        });
}

// Auto-run the test
testClozeParsingInApp();

console.log('Debug script loaded. You can call testClozeParsingInApp() to run the test again.');
