import React from 'react';
import { ScoreBar } from './ScoreBar';

interface JobCardProps {
  title: string;
  company: string;
  location: string;
  salaryMin?: number;
  salaryMax?: number;
  matchScore: number;
  matchReason: string;
  skillGaps: string[];
  applyUrl: string;
}

export function JobCard(props: JobCardProps) {
  return (
    <div className="border rounded-xl p-4 shadow-sm hover:shadow-md transition bg-white dark:bg-slate-900 flex flex-col gap-3">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{props.title}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">{props.company} • {props.location}</p>
          {(props.salaryMin || props.salaryMax) && (
            <p className="text-sm font-semibold text-green-600">
              ${props.salaryMin?.toLocaleString()} - ${props.salaryMax?.toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end">
          <span className="text-2xl font-bold">{props.matchScore}%</span>
          <span className="text-xs text-slate-500">Match Score</span>
        </div>
      </div>
      
      <ScoreBar score={props.matchScore} />

      <div className="mt-2 text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
        <p><strong>Why it matches:</strong> {props.matchReason}</p>
      </div>

      {props.skillGaps.length > 0 && (
        <div className="mt-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Missing Skills</p>
          <div className="flex flex-wrap gap-2">
            {props.skillGaps.map((skill, idx) => (
              <span key={idx} className="px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs rounded-md">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 pt-4 border-t flex justify-end">
        <a href={props.applyUrl} target="_blank" rel="noopener noreferrer" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition">
          Apply Now
        </a>
      </div>
    </div>
  );
}
