import React from 'react';

/**
 * Renders code blocks with syntax highlighting
 * @param {Object} props - Component props
 * @param {string} props.code - Code content to display
 * @param {string} props.language - Programming language for syntax highlighting
 * @param {string} props.className - Additional CSS classes
 */
export default function CodeRenderer({ code, language = '', className = '' }) {
  if (!code) return null;

  return (
    <div className={`bg-gray-900 dark:bg-gray-800 text-gray-100 p-4 rounded-lg overflow-auto my-3 ${className}`}>
      {language && (
        <div className="text-gray-400 text-xs mb-2 uppercase tracking-wide">
          {language}
        </div>
      )}
      <pre className="text-sm">
        <code className={language ? `language-${language}` : ''}>
          {code}
        </code>
      </pre>
    </div>
  );
}
