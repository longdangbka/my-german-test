import React from 'react';
import { BlockMath, InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';

export default function LatexBlock({
  latex,
  type = 'display',    // 'inline' or 'display'
  className = '',      // optional extra classes
  style = {},          // optional inline styles
}) {
  if (typeof latex !== 'string') return null;
  const clean = latex.trim();

  if (type === 'inline') {
    return (
      <span
        className={className}
        style={{ display: 'inline', verticalAlign: 'middle', ...style }}
      >
        <InlineMath math={clean} />
      </span>
    );
  }

  // display math
  return (
    <div
      className={className}
      style={{ display: 'block', textAlign: 'center', margin: '1em 0', ...style }}
    >
      <BlockMath math={clean} />
    </div>
  );
}
