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
    <div className="group relative border border-white/50 dark:border-white/10 rounded-3xl p-6 shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl flex flex-col gap-5 hover:-translate-y-1">
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5 pointer-events-none rounded-3xl"></div>
      
      <div className="flex justify-between items-start relative z-10">
        <div className="space-y-1">
          <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors tracking-tight">{props.title}</h3>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            {props.company}
            <span className="opacity-40">•</span>
            <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            {props.location}
          </p>
          {(props.salaryMin || props.salaryMax) && (
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-2 bg-emerald-50 dark:bg-emerald-500/10 inline-block px-2.5 py-0.5 rounded-full">
              ${props.salaryMin?.toLocaleString()} - ${props.salaryMax?.toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end text-right bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 min-w-[80px]">
          <span className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-br from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 leading-none">{props.matchScore}%</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Match</span>
        </div>
      </div>
      
      <div className="relative z-10">
        <ScoreBar score={props.matchScore} />
      </div>

      <div className="relative z-10 mt-1 text-sm text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50 p-4 rounded-2xl border border-white/50 dark:border-white/5 shadow-inner">
        <p><strong className="text-slate-900 dark:text-white mr-2">AI Analysis:</strong> {props.matchReason}</p>
      </div>

      {props.skillGaps.length > 0 && (
        <div className="relative z-10 mt-2">
          <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            Missing Skills
          </p>
          <div className="flex flex-wrap gap-2">
            {props.skillGaps.map((skill, idx) => (
              <span key={idx} className="px-3 py-1 bg-rose-50 border border-rose-100 text-rose-600 dark:bg-rose-900/20 dark:border-rose-800/50 dark:text-rose-400 text-xs font-semibold rounded-lg shadow-sm">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="relative z-10 mt-2 pt-5 border-t border-slate-200/50 dark:border-slate-700/50 flex justify-end">
        <a href={props.applyUrl} target="_blank" rel="noopener noreferrer" className="bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white px-6 py-2.5 rounded-full text-sm font-bold transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center gap-2">
          Apply Now
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
        </a>
      </div>
    </div>
  );
}
