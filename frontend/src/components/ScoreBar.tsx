import React, { useEffect, useState } from 'react';

interface ScoreBarProps {
  score: number;
}

export function ScoreBar({ score }: ScoreBarProps) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    // Slight delay to allow CSS transition to animate on mount
    const timeout = setTimeout(() => setWidth(score), 100);
    return () => clearTimeout(timeout);
  }, [score]);

  const getScoreGradient = (s: number) => {
    if (s >= 90) return 'from-emerald-400 to-teal-500 shadow-emerald-500/50';
    if (s >= 75) return 'from-blue-400 to-indigo-500 shadow-blue-500/50';
    if (s >= 50) return 'from-amber-400 to-orange-500 shadow-amber-500/50';
    return 'from-rose-400 to-red-500 shadow-rose-500/50';
  };

  return (
    <div className="w-full bg-slate-100 dark:bg-slate-800/50 rounded-full h-2.5 p-0.5 shadow-inner border border-black/5 dark:border-white/5 relative overflow-hidden">
      <div 
        className={`h-full rounded-full bg-gradient-to-r ${getScoreGradient(score)} shadow-sm transition-all duration-1000 ease-out`} 
        style={{ width: `${width}%` }}
      >
        <div className="absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-r from-transparent to-white/30 rounded-r-full"></div>
      </div>
    </div>
  );
}
