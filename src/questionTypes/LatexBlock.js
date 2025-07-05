import React from 'react';
import 'katex/dist/katex.min.css';
import { BlockMath, InlineMath } from 'react-katex';

export default function LatexBlock({ latex, type = 'block' }) {
  return type === 'block'
    ? <div className="my-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 text-center">
        <BlockMath math={latex} />
      </div>
    : <InlineMath math={latex} />;
}
