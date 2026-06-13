"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { JobCard } from "@/components/JobCard";

/* ───────────────────────────── Types ───────────────────────────── */

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salaryMin: number;
  salaryMax: number;
  matchScore: number;
  matchReason: string;
  skillGaps: string[];
  applyUrl: string;
}

interface Preferences {
  targetTitle: string;
  yearsExperience: number;
  currentRole: string;
  locations: string[];
  remotePreference: boolean;
  willingToRelocate: boolean;
  minSalary: number;
  currency: string;
  mustHaveSkills: string[];
  niceToHaveSkills: string[];
  jobTypes: string[];
  industries: string[];
  emailAlerts: boolean;
  minScoreThreshold: number;
}

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

/* ──────────────────────────── Defaults ──────────────────────────── */

const DEFAULT_PREFERENCES: Preferences = {
  targetTitle: "AI Engineer",
  yearsExperience: 3,
  currentRole: "Software Engineer",
  locations: ["Remote"],
  remotePreference: true,
  willingToRelocate: false,
  minSalary: 120000,
  currency: "USD",
  mustHaveSkills: ["Python", "React", "LLMs"],
  niceToHaveSkills: ["Postgres", "LangChain"],
  jobTypes: ["Full-time"],
  industries: ["Tech"],
  emailAlerts: false,
  minScoreThreshold: 50,
};

const JOB_TYPES = ["Full-time", "Part-time", "Contract", "Freelance", "Internship"];
const INDUSTRIES = ["Tech", "Finance", "Healthcare", "Education", "E-commerce", "AI/ML", "SaaS", "Consulting", "Media", "Government"];
const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "INR", "JPY", "SGD"];
const FILTER_TIERS = [
  { label: "All", min: 0 },
  { label: "90%+", min: 90 },
  { label: "75%+", min: 75 },
  { label: "50%+", min: 50 },
] as const;

/* ──────────────────────────── Helpers ───────────────────────────── */

function loadPreferences(): Preferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const raw = localStorage.getItem("jobhunt_preferences");
    if (raw) return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULT_PREFERENCES;
}

function savePreferences(prefs: Preferences) {
  if (typeof window === "undefined") return;
  localStorage.setItem("jobhunt_preferences", JSON.stringify(prefs));
}

function loadSearchCount(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem("jobhunt_search_count") || "0", 10);
}

function incrementSearchCount(): number {
  const next = loadSearchCount() + 1;
  localStorage.setItem("jobhunt_search_count", String(next));
  return next;
}

/* ──────────────────────── Tag Input Component ──────────────────── */

function TagInput({
  tags,
  onChange,
  placeholder,
}: {
  tags: string[];
  onChange: (t: string[]) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState("");

  const add = () => {
    const v = input.trim();
    if (v && !tags.includes(v)) {
      onChange([...tags, v]);
    }
    setInput("");
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        {tags.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 border border-blue-200/60 dark:border-blue-500/20 transition-all hover:border-blue-400 dark:hover:border-blue-400/40"
          >
            {t}
            <button
              type="button"
              onClick={() => onChange(tags.filter((x) => x !== t))}
              className="ml-0.5 hover:text-red-500 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          className="flex-1 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md border border-slate-200/60 dark:border-slate-700/50 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm font-medium transition-all outline-none"
        />
        <button
          type="button"
          onClick={add}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/50 transition-all"
        >
          Add
        </button>
      </div>
    </div>
  );
}

/* ──────────────────────── Toggle Component ─────────────────────── */

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center justify-between cursor-pointer group">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${checked ? "bg-blue-500" : "bg-slate-200 dark:bg-slate-700"}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${checked ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </label>
  );
}

/* ───────────────────── Section Card Component ──────────────────── */

function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/60 dark:bg-slate-900/50 backdrop-blur-2xl border border-white/60 dark:border-white/[0.06] rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300 relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent dark:from-white/[0.03] pointer-events-none" />
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-200/40 dark:border-blue-500/20">
            {icon}
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white tracking-tight">{title}</h3>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ════════════════════════ MAIN DASHBOARD ════════════════════════ */

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<"matches" | "preferences">("matches");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScraping, setIsScraping] = useState(false);
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const [filterMin, setFilterMin] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [searchCount, setSearchCount] = useState(0);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const toastId = useRef(0);

  /* ── Toast helper ── */
  const showToast = useCallback((message: string, type: Toast["type"] = "success") => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  /* ── Load preferences + search count from localStorage ── */
  useEffect(() => {
    const loaded = loadPreferences();
    setPrefs(loaded);
    setSearchQuery(loaded.targetTitle);
    setSearchLocation(loaded.locations[0] || "Remote");
    setSearchCount(loadSearchCount());
    setPrefsLoaded(true);
  }, []);

  /* ── Fetch jobs on mount ── */
  useEffect(() => {
    fetch("/api/jobs/")
      .then((res) => res.json())
      .then((data) => { setJobs(data); setIsLoading(false); })
      .catch((err) => { console.error("Failed to fetch jobs:", err); setIsLoading(false); });
  }, []);

  /* ── Trigger scrape ── */
  const handleSearch = useCallback(() => {
    const query = searchQuery.trim() || prefs.targetTitle || "AI Engineer";
    const location = searchLocation.trim() || prefs.locations[0] || "Remote";

    setIsScraping(true);
    fetch("/api/jobs/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        location,
        user_id: "00000000-0000-0000-0000-000000000000",
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        showToast(data.status || `Scrape complete for "${query}" in ${location}`, "success");
        const newCount = incrementSearchCount();
        setSearchCount(newCount);
        // Refresh jobs
        return fetch("/api/jobs/").then((r) => r.json()).then((d) => setJobs(d));
      })
      .catch((err) => {
        console.error(err);
        showToast("Search failed. Check your connection.", "error");
      })
      .finally(() => setIsScraping(false));
  }, [searchQuery, searchLocation, prefs, showToast]);

  /* ── Save preferences ── */
  const handleSavePrefs = useCallback(() => {
    savePreferences(prefs);
    setSearchQuery(prefs.targetTitle);
    setSearchLocation(prefs.locations[0] || "Remote");
    showToast("Preferences saved successfully", "success");
  }, [prefs, showToast]);

  /* ── Update preference helper ── */
  const updatePref = useCallback(<K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  }, []);

  /* ── Derived data ── */
  const filteredJobs = jobs.filter((j) => j.matchScore >= filterMin);
  const avgScore = jobs.length ? Math.round(jobs.reduce((a, j) => a + j.matchScore, 0) / jobs.length) : 0;

  const filterCounts = FILTER_TIERS.map((tier) => ({
    ...tier,
    count: jobs.filter((j) => j.matchScore >= tier.min).length,
  }));

  /* ── Prevent flash of default state ── */
  if (!prefsLoaded) return null;

  /* ════════════════════════════ RENDER ══════════════════════════ */
  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-50 via-white to-blue-50/40 dark:from-slate-950 dark:via-black dark:to-slate-950 font-[family-name:var(--font-geist-sans)] selection:bg-blue-500/20">
      {/* ── Noise texture ── */}
      <div className="fixed inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iLjc1IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iLjAzIi8+PC9zdmc+')] opacity-50 pointer-events-none" />

      {/* ── Grid pattern ── */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />

      {/* ── Toast notifications ── */}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-5 py-3.5 rounded-2xl text-sm font-semibold shadow-xl backdrop-blur-xl border animate-[slideIn_0.3s_ease-out] ${
              toast.type === "success"
                ? "bg-emerald-50/90 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-500/20"
                : toast.type === "error"
                ? "bg-red-50/90 dark:bg-red-500/15 text-red-700 dark:text-red-300 border-red-200/60 dark:border-red-500/20"
                : "bg-blue-50/90 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200/60 dark:border-blue-500/20"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {toast.type === "success" && (
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
              )}
              {toast.type === "error" && (
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01M12 3l9.66 16.5H2.34L12 3z" /></svg>
              )}
              {toast.message}
            </div>
          </div>
        ))}
      </div>

      <div className="max-w-5xl mx-auto relative z-10 px-4 sm:px-6 lg:px-8 pb-24">
        {/* ══════════════════════ HEADER ══════════════════════ */}
        <header className="pt-12 sm:pt-16 pb-12 sm:pb-16">
          {/* Hero */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-500/20 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              AI-Powered Career Agent
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-[-0.04em] leading-[0.9] bg-gradient-to-b from-slate-900 via-slate-800 to-slate-500 dark:from-white dark:via-slate-200 dark:to-slate-500 bg-clip-text text-transparent animate-[fadeUp_0.6s_ease-out]">
              Job Hunt
              <span className="block bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-500 bg-clip-text text-transparent animate-[gradient_6s_ease_infinite] bg-[length:200%_auto]">
                AI
              </span>
            </h1>
            <p className="mt-4 text-slate-500 dark:text-slate-400 text-base sm:text-lg font-medium max-w-md mx-auto leading-relaxed">
              Your autonomous agent that finds, evaluates, and ranks the perfect roles for you.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-lg mx-auto mb-10">
            {[
              { label: "Jobs Found", value: jobs.length, color: "text-blue-600 dark:text-blue-400" },
              { label: "Avg Match", value: `${avgScore}%`, color: "text-emerald-600 dark:text-emerald-400" },
              { label: "Searches", value: searchCount, color: "text-violet-600 dark:text-violet-400" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white/70 dark:bg-slate-900/50 backdrop-blur-xl border border-white/60 dark:border-white/[0.06] rounded-2xl py-4 px-3 text-center shadow-sm"
              >
                <div className={`text-2xl sm:text-3xl font-black tracking-tight ${stat.color}`}>{stat.value}</div>
                <div className="text-[11px] sm:text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Tab switcher */}
          <div className="flex justify-center">
            <div className="flex bg-slate-100/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-full p-1 border border-slate-200/50 dark:border-white/[0.06] shadow-sm">
              {(["matches", "preferences"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative px-6 sm:px-8 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                    activeTab === tab
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-md"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  }`}
                >
                  {tab === "matches" ? (
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                      Matches
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      Preferences
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* ══════════════════════ MATCHES TAB ══════════════════════ */}
        {activeTab === "matches" && (
          <div className="flex flex-col gap-6 animate-[fadeUp_0.5s_ease-out]">
            {/* ── Control bar ── */}
            <div className="bg-white/60 dark:bg-slate-900/50 backdrop-blur-2xl border border-white/60 dark:border-white/[0.06] rounded-2xl p-5 shadow-sm">
              {/* Search row */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="flex-1 relative">
                  <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                    placeholder="Job title, e.g. AI Engineer"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/80 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/50 text-sm font-medium focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all outline-none"
                  />
                </div>
                <div className="relative sm:w-48">
                  <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  <input
                    type="text"
                    value={searchLocation}
                    onChange={(e) => setSearchLocation(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                    placeholder="Location"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/80 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/50 text-sm font-medium focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all outline-none"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  disabled={isScraping}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-blue-600 dark:hover:bg-blue-50 shadow-md hover:shadow-lg transition-all duration-300 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 shrink-0"
                >
                  {isScraping ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                      Scanning…
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                      Trigger Scrape
                    </>
                  )}
                </button>
              </div>

              {/* Filter chips */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-1">Filter:</span>
                {filterCounts.map((tier) => (
                  <button
                    key={tier.label}
                    onClick={() => setFilterMin(tier.min)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 border ${
                      filterMin === tier.min
                        ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm"
                        : "bg-white/70 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-slate-200/60 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    {tier.label}
                    <span className={`ml-1.5 ${filterMin === tier.min ? "text-white/70 dark:text-slate-900/60" : "text-slate-400 dark:text-slate-500"}`}>
                      {tier.count}
                    </span>
                  </button>
                ))}

                {/* Live status */}
                <div className="ml-auto flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
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
                  <div key={s.label} className="bg-white/50 dark:bg-slate-900/40 backdrop-blur-xl border border-white/50 dark:border-white/[0.04] rounded-xl py-3 px-4 text-center">
                    <div className="text-lg font-bold text-slate-800 dark:text-white">{s.value}</div>
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{s.label} · {s.sub}</div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Job list ── */}
            {isLoading ? (
              <div className="flex flex-col gap-6">
                {[1, 2].map((i) => (
                  <div key={i} className={`h-72 bg-white/40 dark:bg-slate-800/30 backdrop-blur-xl rounded-[28px] border border-white/40 dark:border-white/[0.04] animate-pulse ${i === 2 ? "opacity-60" : ""}`} />
                ))}
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-8 bg-white/50 dark:bg-slate-900/40 backdrop-blur-2xl rounded-2xl border border-white/50 dark:border-white/[0.06] text-center">
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-500/10 text-blue-500 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-5 border border-blue-100 dark:border-blue-500/20">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">
                  {jobs.length > 0 ? "No jobs match this filter" : "No scored jobs yet"}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-sm leading-relaxed">
                  {jobs.length > 0
                    ? "Try lowering your filter threshold to see more results."
                    : "Trigger a scrape to send the AI agent out to find and evaluate roles for you."}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {filteredJobs.map((job, idx) => (
                  <div key={job.id || idx} className="animate-[fadeUp_0.4s_ease-out]" style={{ animationDelay: `${idx * 60}ms`, animationFillMode: "backwards" }}>
                    <JobCard {...job} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════ PREFERENCES TAB ══════════════════════ */}
        {activeTab === "preferences" && (
          <div className="animate-[fadeUp_0.5s_ease-out]">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">Agent Preferences</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Configure how the AI agent searches and evaluates job matches.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* ── Profile ── */}
              <SectionCard
                icon={<svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                title="Profile"
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Target Job Title</label>
                    <input
                      type="text"
                      value={prefs.targetTitle}
                      onChange={(e) => updatePref("targetTitle", e.target.value)}
                      className="w-full bg-white/70 dark:bg-slate-800/70 backdrop-blur-md border border-slate-200/60 dark:border-slate-700/50 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm font-medium transition-all outline-none"
                      placeholder="e.g. AI Engineer, Data Scientist"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Years of Experience</label>
                      <input
                        type="number"
                        min={0}
                        max={40}
                        value={prefs.yearsExperience}
                        onChange={(e) => updatePref("yearsExperience", parseInt(e.target.value) || 0)}
                        className="w-full bg-white/70 dark:bg-slate-800/70 backdrop-blur-md border border-slate-200/60 dark:border-slate-700/50 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm font-medium transition-all outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Current Role</label>
                      <input
                        type="text"
                        value={prefs.currentRole}
                        onChange={(e) => updatePref("currentRole", e.target.value)}
                        className="w-full bg-white/70 dark:bg-slate-800/70 backdrop-blur-md border border-slate-200/60 dark:border-slate-700/50 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm font-medium transition-all outline-none"
                        placeholder="e.g. Software Engineer"
                      />
                    </div>
                  </div>
                </div>
              </SectionCard>

              {/* ── Location ── */}
              <SectionCard
                icon={<svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                title="Location"
              >
                <div className="space-y-4">
                  <TagInput
                    tags={prefs.locations}
                    onChange={(v) => updatePref("locations", v)}
                    placeholder="Add a location…"
                  />
                  <div className="space-y-3 pt-1">
                    <Toggle checked={prefs.remotePreference} onChange={(v) => updatePref("remotePreference", v)} label="Open to remote work" />
                    <Toggle checked={prefs.willingToRelocate} onChange={(v) => updatePref("willingToRelocate", v)} label="Willing to relocate" />
                  </div>
                </div>
              </SectionCard>

              {/* ── Salary ── */}
              <SectionCard
                icon={<svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                title="Salary"
              >
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Minimum Salary</label>
                      <span className="text-sm font-bold text-slate-800 dark:text-white">{prefs.currency} {prefs.minSalary.toLocaleString()}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={500000}
                      step={5000}
                      value={prefs.minSalary}
                      onChange={(e) => updatePref("minSalary", parseInt(e.target.value))}
                      className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-slate-200 dark:bg-slate-700 accent-blue-500"
                    />
                    <input
                      type="number"
                      value={prefs.minSalary}
                      onChange={(e) => updatePref("minSalary", parseInt(e.target.value) || 0)}
                      className="mt-2 w-full bg-white/70 dark:bg-slate-800/70 backdrop-blur-md border border-slate-200/60 dark:border-slate-700/50 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm font-medium transition-all outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Currency</label>
                    <select
                      value={prefs.currency}
                      onChange={(e) => updatePref("currency", e.target.value)}
                      className="w-full bg-white/70 dark:bg-slate-800/70 backdrop-blur-md border border-slate-200/60 dark:border-slate-700/50 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm font-medium transition-all outline-none appearance-none cursor-pointer"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </SectionCard>

              {/* ── Skills ── */}
              <SectionCard
                icon={<svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>}
                title="Skills"
              >
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Must-have Skills</label>
                    <TagInput
                      tags={prefs.mustHaveSkills}
                      onChange={(v) => updatePref("mustHaveSkills", v)}
                      placeholder="Add a required skill…"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Nice-to-have Skills</label>
                    <TagInput
                      tags={prefs.niceToHaveSkills}
                      onChange={(v) => updatePref("niceToHaveSkills", v)}
                      placeholder="Add a bonus skill…"
                    />
                  </div>
                </div>
              </SectionCard>

              {/* ── Job Type ── */}
              <SectionCard
                icon={<svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
                title="Job Type"
              >
                <div className="grid grid-cols-2 gap-2.5">
                  {JOB_TYPES.map((type) => {
                    const isChecked = prefs.jobTypes.includes(type);
                    return (
                      <label
                        key={type}
                        className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl cursor-pointer transition-all duration-200 border ${
                          isChecked
                            ? "bg-blue-50 dark:bg-blue-500/10 border-blue-200/60 dark:border-blue-500/20 text-blue-700 dark:text-blue-300"
                            : "bg-white/50 dark:bg-slate-800/30 border-slate-200/40 dark:border-slate-700/30 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) updatePref("jobTypes", [...prefs.jobTypes, type]);
                            else updatePref("jobTypes", prefs.jobTypes.filter((t) => t !== type));
                          }}
                          className="sr-only"
                        />
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                          isChecked ? "bg-blue-500 border-blue-500" : "border-slate-300 dark:border-slate-600"
                        }`}>
                          {isChecked && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
                          )}
                        </div>
                        <span className="text-sm font-medium">{type}</span>
                      </label>
                    );
                  })}
                </div>
              </SectionCard>

              {/* ── Industry ── */}
              <SectionCard
                icon={<svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
                title="Industry"
              >
                <div className="flex flex-wrap gap-2">
                  {INDUSTRIES.map((ind) => {
                    const isChecked = prefs.industries.includes(ind);
                    return (
                      <button
                        key={ind}
                        type="button"
                        onClick={() => {
                          if (isChecked) updatePref("industries", prefs.industries.filter((i) => i !== ind));
                          else updatePref("industries", [...prefs.industries, ind]);
                        }}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 border ${
                          isChecked
                            ? "bg-blue-50 dark:bg-blue-500/10 border-blue-200/60 dark:border-blue-500/20 text-blue-700 dark:text-blue-300"
                            : "bg-white/50 dark:bg-slate-800/30 border-slate-200/40 dark:border-slate-700/30 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
                        }`}
                      >
                        {ind}
                      </button>
                    );
                  })}
                </div>
              </SectionCard>

              {/* ── Notifications ── */}
              <SectionCard
                icon={<svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>}
                title="Notifications"
              >
                <div className="space-y-5">
                  <Toggle checked={prefs.emailAlerts} onChange={(v) => updatePref("emailAlerts", v)} label="Email alerts for new matches" />
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Min Score Threshold</label>
                      <span className="text-sm font-bold text-slate-800 dark:text-white">{prefs.minScoreThreshold}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={prefs.minScoreThreshold}
                      onChange={(e) => updatePref("minScoreThreshold", parseInt(e.target.value))}
                      className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-slate-200 dark:bg-slate-700 accent-blue-500"
                    />
                    <div className="flex justify-between text-[10px] font-semibold text-slate-400 mt-1">
                      <span>0%</span>
                      <span>50%</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>
              </SectionCard>

              {/* ── Empty column spacer for visual alignment ── */}
              <div className="hidden lg:block" />
            </div>

            {/* ── Save bar ── */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/60 dark:bg-slate-900/50 backdrop-blur-2xl border border-white/60 dark:border-white/[0.06] rounded-2xl p-5 shadow-sm">
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                Preferences are saved locally and used when triggering scrapes.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setPrefs(DEFAULT_PREFERENCES);
                    showToast("Reset to defaults", "info");
                  }}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/50 transition-all"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={handleSavePrefs}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-blue-600 dark:hover:bg-blue-50 shadow-md hover:shadow-lg transition-all duration-300 active:scale-[0.97]"
                >
                  Save Preferences
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Custom keyframes via inline style ── */}
      <style jsx global>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(24px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes gradient {
          0%, 100% {
            background-position: 0% center;
          }
          50% {
            background-position: 100% center;
          }
        }
      `}</style>
    </main>
  );
}
