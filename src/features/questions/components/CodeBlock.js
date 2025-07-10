import React, { useState, useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';

export default function CodeBlock({ code, lang }) {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Better dark mode detection with observer
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };

    // Initial check
    checkDarkMode();

    // Watch for theme changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['class'] 
    });

    return () => observer.disconnect();
  }, []);
  
  // Handle empty or invalid code
  if (!code || typeof code !== 'string') {
    return (
      <div className="my-3 p-4 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg">
        <span className="text-gray-500 dark:text-gray-400 italic">No code content</span>
      </div>
    );
  }
  
  return (
    <div className="code-block my-3">
      <SyntaxHighlighter
        language={lang || 'text'}
        style={isDarkMode ? vscDarkPlus : vs}
        customStyle={{ 
          margin: 0, 
          borderRadius: 8, 
          fontSize: 14,
          padding: '16px',
          border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
          backgroundColor: isDarkMode ? '#1f2937' : '#f9fafb',
          overflow: 'auto',
          maxHeight: '400px' // Prevent extremely long code blocks from taking up too much space
        }}
        showLineNumbers={true}
        wrapLongLines={true}
        PreTag="div"
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
