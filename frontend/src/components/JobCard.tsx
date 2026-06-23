import React, { useState } from 'react';
import { ScoreRing3D } from '@/components/3d/Visualizations';
import { MapPin, DollarSign, Sparkles, ChevronDown, BookmarkPlus, ExternalLink, Wrench, CircleDot } from 'lucide-react';

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
  source?: string;
  onOptimize?: () => void;
  onTrack?: () => void;
  onApply?: () => void;
}

export function JobCard(props: JobCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 90) return { bg: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-500/20' };
    if (score >= 75) return { bg: 'bg-indigo-500', text: 'text-indigo-600 dark:text-indigo-400', ring: 'ring-indigo-500/20' };
    if (score >= 50) return { bg: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-500/20' };
    return { bg: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400', ring: 'ring-rose-500/20' };
  };

  const scoreColors = getScoreColor(props.matchScore);

  return (
    <div className="group relative rounded-2xl transition-all duration-300 bg-card hover:bg-muted/30 border border-border hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 overflow-hidden">
      {/* Top accent line based on score */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${scoreColors.bg} opacity-80`}></div>

      <div className="p-6 sm:p-7">
        {/* Header row */}
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            {/* Company + Location row */}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-black text-primary shrink-0">
                {props.company.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-semibold text-muted-foreground truncate">{props.company}</span>
              <span className="text-muted-foreground/40">•</span>
              <span className="text-sm text-muted-foreground truncate flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {props.location}
              </span>
            </div>

            {/* Title */}
            <h3 className="text-xl sm:text-2xl font-bold text-foreground leading-tight tracking-tight group-hover:text-primary transition-colors">
              {props.title}
            </h3>

            {/* Salary if available */}
            {(props.salaryMin || props.salaryMax) && (
              <p className="mt-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" />
                ${props.salaryMin?.toLocaleString()} – ${props.salaryMax?.toLocaleString()}
              </p>
            )}
          </div>

          {/* Score Ring 3D */}
          <div className="shrink-0 relative mt-[-10px] mr-[-10px]">
            <ScoreRing3D score={props.matchScore} size={80} strokeWidth={6} />
          </div>
        </div>

        {/* AI Analysis — collapsible */}
        <div className="mt-5">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between text-left group/ai py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-lg"
          >
            <span className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              AI Analysis
            </span>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
          </button>

          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[500px] opacity-100 mt-3' : 'max-h-0 opacity-0'}`}>
            <p className="text-sm text-foreground/80 leading-relaxed bg-muted/50 rounded-xl p-4 border border-border">
              {props.matchReason}
            </p>

            {props.skillGaps.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-bold text-rose-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <CircleDot className="w-3.5 h-3.5" />
                  Skills to Develop
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {props.skillGaps.map((skill, idx) => (
                    <span key={idx} className="px-2.5 py-1 bg-rose-50 border border-rose-100 text-rose-600 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400 text-xs font-medium rounded-md">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {props.onOptimize && (
              <div className="mt-5 pt-4 border-t border-border flex justify-end">
                <button 
                  onClick={(e) => { e.stopPropagation(); props.onOptimize!(); }}
                  className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  Optimize Resume for this Role
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-6 pt-5 border-t border-border">
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">via {props.source || 'linkedin'}</span>
          </div>
          <div className="flex items-center gap-3">
            {props.onTrack && (
              <button
                onClick={(e) => { e.stopPropagation(); props.onTrack!(); }}
                className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl border border-border text-foreground hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                title="Track in Pipeline"
              >
                <BookmarkPlus className="w-4 h-4" />
                Track
              </button>
            )}
            <a
              href={props.applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => props.onApply?.()}
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold px-6 py-2.5 rounded-xl transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Apply
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
