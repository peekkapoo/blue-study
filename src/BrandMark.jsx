import React from 'react';
import { Zap } from 'lucide-react';

export default function BrandMark({
  className = '',
  iconSize = 19,
  strokeWidth = 2.5,
  ariaLabel = 'Blue Study logo',
}) {
  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className={`flex items-center justify-center bg-gradient-to-br from-sky-400 to-blue-700 ${className}`.trim()}
    >
      <Zap size={iconSize} className="text-white" strokeWidth={strokeWidth} />
    </div>
  );
}
