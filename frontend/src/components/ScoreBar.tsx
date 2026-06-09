import React from 'react';

interface ScoreBarProps {
  score: number;
}

export function ScoreBar({ score }: ScoreBarProps) {
  const getScoreColor = (s: number) => {
    if (s >= 90) return 'bg-green-500';
    if (s >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="w-full bg-slate-200 rounded-full h-2.5 dark:bg-slate-700 mt-2">
      <div className={`${getScoreColor(score)} h-2.5 rounded-full`} style={{ width: `${score}%` }}></div>
    </div>
  );
}
