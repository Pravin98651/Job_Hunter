import React, { useEffect, useState } from 'react';

interface ScoreBarProps {
  score: number;
}

export function ScoreBar({ score }: ScoreBarProps) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => setWidth(score), 150);
    return () => clearTimeout(timeout);
  }, [score]);

  const getScoreColor = (s: number) => {
    if (s >= 90) return 'bg-emerald-500';
    if (s >= 75) return 'bg-blue-500';
    if (s >= 50) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 relative overflow-hidden">
      <div
        className={`h-full rounded-full ${getScoreColor(score)} transition-all duration-1000 ease-out`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
