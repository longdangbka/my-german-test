import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';

export default function CodeBlock({ code, lang }) {
  // Check if dark mode is active
  const isDarkMode = document.documentElement.classList.contains('dark');
  
  return (
    <div className="my-3">
      <SyntaxHighlighter
        language={lang || 'text'}
        style={isDarkMode ? vscDarkPlus : vs}
        customStyle={{ 
          margin: 0, 
          borderRadius: 8, 
          fontSize: 14,
          padding: '16px',
          border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
          backgroundColor: isDarkMode ? '#1f2937' : '#f9fafb'
        }}
        showLineNumbers={false}
        wrapLongLines={true}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
