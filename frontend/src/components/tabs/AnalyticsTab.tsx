"use client";
import React from "react";
import { ExternalLink, Search, Sparkles, Briefcase } from "lucide-react";
import { PipelineStats, SourceStat, SkillGap, ScoreTrend } from "@/types";

interface AnalyticsTabProps {
  isLoadingAnalytics: boolean;
  pipelineStats: PipelineStats | null;
  sourceStats: SourceStat[];
  skillGaps: SkillGap[];
  scoreTrends: ScoreTrend[];
}

export function AnalyticsTab({
  isLoadingAnalytics,
  pipelineStats,
  sourceStats,
  skillGaps,
  scoreTrends,
}: AnalyticsTabProps) {
  return (
    <div className="animate-[fadeUp_0.5s_ease-out]">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">Analytics Dashboard</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Track trends, identify skill gaps, and monitor your application pipeline.</p>
      </div>

      {isLoadingAnalytics ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pipeline Funnel + Sources Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pipeline Stats */}
            <div className="bg-white/60 dark:bg-slate-900/50 backdrop-blur-2xl border border-white/60 dark:border-white/[0.06] rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                Pipeline Funnel
              </h3>
              {pipelineStats ? (
                <div className="space-y-3">
                  {[
                    { label: "Bookmarked", value: pipelineStats.bookmarked, color: "bg-slate-400" },
                    { label: "Applied", value: pipelineStats.applied, color: "bg-blue-500" },
                    { label: "Interviewing", value: pipelineStats.interviewing, color: "bg-amber-500" },
                    { label: "Offer", value: pipelineStats.offer, color: "bg-emerald-500" },
                    { label: "Rejected", value: pipelineStats.rejected, color: "bg-rose-400" },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-slate-500 w-24">{s.label}</span>
                      <div className="flex-1 h-5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${s.color} rounded-full transition-all duration-500`}
                          style={{ width: `${pipelineStats.total ? (s.value / pipelineStats.total) * 100 : 0}%`, minWidth: s.value > 0 ? '8px' : '0' }}
                        />
                      </div>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300 w-8 text-right">{s.value}</span>
                    </div>
                  ))}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-400">Conversion Rate</span>
                    <span className="text-lg font-black text-blue-600 dark:text-blue-400">{pipelineStats.conversionRate}%</span>
                  </div>
                </div>
              ) : <p className="text-sm text-slate-500">No pipeline data yet. Track some jobs first.</p>}
            </div>

            {/* Job Sources */}
            <div className="bg-white/60 dark:bg-slate-900/50 backdrop-blur-2xl border border-white/60 dark:border-white/[0.06] rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Search className="w-4 h-4" />
                Job Sources
              </h3>
              {sourceStats.length > 0 ? (
                <div className="space-y-3">
                  {sourceStats.map((s, i) => {
                    const colors = ["bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-amber-500", "bg-rose-500"];
                    const maxCount = Math.max(...sourceStats.map(x => x.count));
                    return (
                      <div key={s.source} className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-slate-500 capitalize w-24">{s.source}</span>
                        <div className="flex-1 h-5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className={`h-full ${colors[i % colors.length]} rounded-full transition-all duration-500`} style={{ width: `${(s.count / maxCount) * 100}%` }} />
                        </div>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300 w-8 text-right">{s.count}</span>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="text-sm text-slate-500">No source data yet.</p>}
            </div>
          </div>

          {/* Skill Gaps */}
          <div className="bg-white/60 dark:bg-slate-900/50 backdrop-blur-2xl border border-white/60 dark:border-white/[0.06] rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Top Skill Gaps — Learn These Next
            </h3>
            <p className="text-xs text-slate-400 mb-4">Skills most frequently requested by employers but missing from your resume.</p>
            {skillGaps.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {skillGaps.slice(0, 20).map((g, i) => (
                  <span key={g.skill} className={`px-3 py-1.5 rounded-xl text-sm font-semibold border ${
                    i < 3 ? "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20" :
                    i < 7 ? "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20" :
                    "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                  }`}>
                    {g.skill} <span className="text-xs opacity-60">({g.count})</span>
                  </span>
                ))}
              </div>
            ) : <p className="text-sm text-slate-500">No skill gap data yet. Run some job searches first.</p>}
          </div>

          {/* Score Trends */}
          <div className="bg-white/60 dark:bg-slate-900/50 backdrop-blur-2xl border border-white/60 dark:border-white/[0.06] rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Match Score Trends
            </h3>
            {scoreTrends.length > 0 ? (
              <div className="flex items-end gap-2 h-32">
                {scoreTrends.map((t) => (
                  <div key={t.date} className="flex-1 flex flex-col items-center gap-1 group">
                    <span className="text-[10px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">{t.avgScore}%</span>
                    <div
                      className="w-full bg-blue-500 dark:bg-blue-400 rounded-t-lg transition-all duration-500 hover:bg-blue-600 cursor-pointer"
                      style={{ height: `${t.avgScore}%` }}
                      title={`${t.date}: ${t.avgScore}% avg (${t.count} jobs)`}
                    />
                    <span className="text-[9px] text-slate-400 truncate w-full text-center">{t.date.slice(5)}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-slate-500">No trend data yet.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
