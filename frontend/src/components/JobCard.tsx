import React, { useState } from 'react';
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
  const [isExpanded, setIsExpanded] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 90) return { bg: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-500/20' };
    if (score >= 75) return { bg: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400', ring: 'ring-blue-500/20' };
    if (score >= 50) return { bg: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-500/20' };
    return { bg: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400', ring: 'ring-rose-500/20' };
  };

  const scoreColors = getScoreColor(props.matchScore);

  return (
    <div className="group relative rounded-2xl transition-all duration-300 bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-black/30 overflow-hidden">
      {/* Top accent line based on score */}
      <div className={`absolute top-0 left-0 right-0 h-[2px] ${scoreColors.bg} opacity-60`}></div>

      <div className="p-6 sm:p-7">
        {/* Header row */}
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            {/* Company + Location row */}
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm font-black text-slate-500 dark:text-slate-400 shrink-0">
                {props.company.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 truncate">{props.company}</span>
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <span className="text-sm text-slate-400 dark:text-slate-500 truncate flex items-center gap-1">
                <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                {props.location}
              </span>
            </div>

            {/* Title */}
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-snug tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {props.title}
            </h3>

            {/* Salary if available */}
            {(props.salaryMin || props.salaryMax) && (
              <p className="mt-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                ${props.salaryMin?.toLocaleString()} – ${props.salaryMax?.toLocaleString()}
              </p>
            )}
          </div>

          {/* Score badge */}
          <div className={`shrink-0 flex flex-col items-center justify-center w-16 h-16 rounded-2xl ${scoreColors.ring} ring-2 bg-white dark:bg-slate-800`}>
            <span className={`text-2xl font-black leading-none ${scoreColors.text}`}>{props.matchScore}</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">score</span>
          </div>
        </div>

        {/* Score bar */}
        <div className="mt-4">
          <ScoreBar score={props.matchScore} />
        </div>

        {/* AI Analysis — collapsible */}
        <div className="mt-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between text-left group/ai"
          >
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
              AI Analysis
            </span>
            <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>

          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-96 opacity-100 mt-3' : 'max-h-0 opacity-0'}`}>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700/50">
              {props.matchReason}
            </p>

            {props.skillGaps.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  Skills to Develop
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {props.skillGaps.map((skill, idx) => (
                    <span key={idx} className="px-2.5 py-1 bg-rose-50 border border-rose-100 text-rose-600 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400 text-xs font-semibold rounded-lg">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-medium">via LinkedIn</span>
          </div>
          <a
            href={props.applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-blue-600 dark:bg-white dark:hover:bg-blue-500 dark:text-slate-900 dark:hover:text-white text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 hover:shadow-lg active:scale-[0.97]"
          >
            Apply
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
          </a>
        </div>
      </div>
    </div>
  );
}
