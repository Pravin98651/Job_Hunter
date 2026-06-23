"use client";
import React from "react";
import { ExternalLink, Search, Sparkles, Briefcase } from "lucide-react";
import { PipelineStats, SourceStat, SkillGap, ScoreTrend } from "@/types";
import { BarChart3D, DonutChart3D, Bar3D } from "@/components/3d/Visualizations";

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
        <h2 className="text-2xl font-bold text-foreground tracking-tight">Analytics Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-1">Track trends, identify skill gaps, and monitor your application pipeline.</p>
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
            <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                Pipeline Funnel
              </h3>
              {pipelineStats ? (
                <div className="flex flex-col items-center">
                  <DonutChart3D
                    total={pipelineStats.total}
                    label="Tracked"
                    segments={[
                      { label: "Bookmarked", value: pipelineStats.bookmarked, color: "#94a3b8", glowColor: "rgba(148,163,184,0.3)" },
                      { label: "Applied", value: pipelineStats.applied, color: "#3b82f6", glowColor: "rgba(59,130,246,0.3)" },
                      { label: "Interviewing", value: pipelineStats.interviewing, color: "#f59e0b", glowColor: "rgba(245,158,11,0.3)" },
                      { label: "Offer", value: pipelineStats.offer, color: "#10b981", glowColor: "rgba(16,185,129,0.3)" },
                      { label: "Rejected", value: pipelineStats.rejected, color: "#f43f5e", glowColor: "rgba(244,63,94,0.3)" },
                    ]}
                  />
                  <div className="mt-6 pt-4 border-t border-border w-full flex justify-between items-center px-4">
                    <span className="text-xs font-semibold text-muted-foreground">Conversion Rate</span>
                    <span className="text-lg font-black text-blue-600 dark:text-blue-400">{pipelineStats.conversionRate}%</span>
                  </div>
                </div>
              ) : <p className="text-sm text-muted-foreground">No pipeline data yet. Track some jobs first.</p>}
            </div>

            {/* Job Sources */}
            <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <Search className="w-4 h-4" />
                Job Sources
              </h3>
              {sourceStats.length > 0 ? (
                <div className="space-y-4">
                  {sourceStats.map((s, i) => {
                    const colors = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#f43f5e"];
                    const glows = ["rgba(59,130,246,0.5)", "rgba(16,185,129,0.5)", "rgba(139,92,246,0.5)", "rgba(245,158,11,0.5)", "rgba(244,63,94,0.5)"];
                    const maxCount = Math.max(...sourceStats.map(x => x.count));
                    return (
                      <div key={s.source} className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-muted-foreground capitalize w-24">{s.source}</span>
                        <Bar3D value={s.count} max={maxCount} color={colors[i % colors.length]} glowColor={glows[i % glows.length]} />
                        <span className="text-sm font-bold text-foreground/90 w-8 text-right">{s.count}</span>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="text-sm text-muted-foreground">No source data yet.</p>}
            </div>
          </div>

          {/* Skill Gaps */}
          <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Top Skill Gaps — Learn These Next
            </h3>
            <p className="text-xs text-muted-foreground mb-4">Skills most frequently requested by employers but missing from your resume.</p>
            {skillGaps.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {skillGaps.slice(0, 20).map((g, i) => (
                  <span key={g.skill} className={`px-3 py-1.5 rounded-xl text-sm font-semibold border ${
                    i < 3 ? "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20" :
                    i < 7 ? "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20" :
                    "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-muted-foreground dark:border-slate-700"
                  }`}>
                    {g.skill} <span className="text-xs opacity-60">({g.count})</span>
                  </span>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">No skill gap data yet. Run some job searches first.</p>}
          </div>

          {/* Score Trends */}
          <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Match Score Trends
            </h3>
            {scoreTrends.length > 0 ? (
              <BarChart3D data={scoreTrends.map(t => ({ label: t.date.slice(5), value: t.avgScore, count: t.count }))} />
            ) : <p className="text-sm text-muted-foreground">No trend data yet.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
