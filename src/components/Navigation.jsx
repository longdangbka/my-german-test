import React from 'react';

export default function Navigation({ onPrev, onNext, isFirst, isLast }) {
  const handlePrev = () => {
    onPrev();
    // Scroll to top of page
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNext = () => {
    onNext();
    // Scroll to top of page
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex justify-center pt-4">
      <div className="space-x-2">
        <button 
          onClick={handlePrev} 
          disabled={isFirst} 
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          ← Previous
        </button>
        <button 
          onClick={handleNext} 
          disabled={isLast} 
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
