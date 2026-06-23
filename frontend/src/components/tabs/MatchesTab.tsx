"use client";
import React from "react";
import { Search, MapPin, Loader2 } from "lucide-react";
import { JobCard } from "@/components/JobCard";
import type { Job } from "@/types";

interface MatchesTabProps {
  jobs: Job[];
  filteredJobs: Job[];
  filterMin: number;
  setFilterMin: (val: number) => void;
  isLoading: boolean;
  isScraping: boolean;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  searchLocation: string;
  setSearchLocation: (val: string) => void;
  handleSearch: () => void;
  avgScore: number;
  filterCounts: { label: string; min: number; count: number }[];
  handleOptimize: (job: Job) => void;
  handleTrackJob: (job: Job) => void;
  handleApplyJob: (job: Job) => void;
}

export function MatchesTab({
  jobs,
  filteredJobs,
  filterMin,
  setFilterMin,
  isLoading,
  isScraping,
  searchQuery,
  setSearchQuery,
  searchLocation,
  setSearchLocation,
  handleSearch,
  avgScore,
  filterCounts,
  handleOptimize,
  handleTrackJob,
  handleApplyJob,
}: MatchesTabProps) {
  return (
    <div className="flex flex-col gap-6 animate-[fadeUp_0.4s_ease-out]">
      {/* ── Control bar ── */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
        {/* Search row */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
              placeholder="Job title, e.g. AI Engineer"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-border text-sm font-medium focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all outline-none"
            />
          </div>
          <div className="relative sm:w-56">
            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchLocation}
              onChange={(e) => setSearchLocation(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
              placeholder="Location"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-border text-sm font-medium focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all outline-none"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={isScraping}
            className="px-8 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all duration-200 active:translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {isScraping ? (
              <>
                <Loader2 className="animate-spin h-4 w-4" />
                Scanning…
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Trigger Scrape
              </>
            )}
          </button>
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-2 flex-wrap mt-4">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">Filter:</span>
          {filterCounts.map((tier) => (
            <button
              key={tier.label}
              onClick={() => setFilterMin(tier.min)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 border ${
                filterMin === tier.min
                  ? "bg-foreground text-background border-foreground shadow-sm"
                  : "bg-card/50 text-muted-foreground border-border hover:border-primary/50"
              }`}
            >
              {tier.label}
              <span className={`ml-1.5 ${filterMin === tier.min ? "text-background/70" : "text-muted-foreground/60"}`}>
                {tier.count}
              </span>
            </button>
          ))}

          {/* Live status */}
          <div className="ml-auto flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </div>
        </div>
      </div>

      {/* ── Summary stats bar ── */}
      {jobs.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Showing", value: filteredJobs.length, sub: `of ${jobs.length}` },
            { label: "Top Score", value: `${Math.max(...jobs.map((j) => j.matchScore))}%`, sub: "best match" },
            { label: "Avg Score", value: `${avgScore}%`, sub: "average" },
            { label: "Companies", value: new Set(jobs.map((j) => j.company)).size, sub: "unique" },
          ].map((s) => (
            <div key={s.label} className="bg-card/40 backdrop-blur-xl border border-border rounded-xl py-3 px-4 text-center">
              <div className="text-lg font-bold text-foreground">{s.value}</div>
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{s.label} · {s.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Job list ── */}
      {isLoading ? (
        <div className="flex flex-col gap-6">
          {[1, 2].map((i) => (
            <div key={i} className={`h-72 bg-card/30 backdrop-blur-xl rounded-[28px] border border-border animate-pulse ${i === 2 ? "opacity-60" : ""}`} />
          ))}
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-8 bg-card/40 backdrop-blur-2xl rounded-2xl border border-border text-center">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-5 border border-primary/20">
            <Search className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-foreground tracking-tight">
            {jobs.length > 0 ? "No jobs match this filter" : "No scored jobs yet"}
          </h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm leading-relaxed">
            {jobs.length > 0
              ? "Try lowering your filter threshold to see more results."
              : "Trigger a scrape to send the AI agent out to find and evaluate roles for you."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {filteredJobs.map((job, idx) => (
            <div key={job.id || idx} className="animate-[fadeUp_0.4s_ease-out]" style={{ animationDelay: `${idx * 60}ms`, animationFillMode: "backwards" }}>
              <JobCard {...job} onOptimize={() => handleOptimize(job)} onTrack={() => handleTrackJob(job)} onApply={() => handleApplyJob(job)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
