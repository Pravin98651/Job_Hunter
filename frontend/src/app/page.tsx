"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Search, Briefcase, LayoutDashboard, BarChart3, Presentation, Settings, CheckCircle2, XCircle, AlertCircle, Sparkles } from "lucide-react";

/* ───────────────────────────── Types ───────────────────────────── */

async function apiFetch(url: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});
  let id = "";
  if (typeof window !== "undefined") {
    id = localStorage.getItem("jobhunt_session_id") || "";
  }
  if (id) {
    headers.set("X-User-ID", id);
  }
  return fetch(url, { ...options, headers, signal: options.signal });
}

import { MatchesTab } from "@/components/tabs/MatchesTab";
import { PreferencesTab } from "@/components/tabs/PreferencesTab";
import { PipelineTab } from "@/components/tabs/PipelineTab";
import { AnalyticsTab } from "@/components/tabs/AnalyticsTab";
import { InterviewTab } from "@/components/tabs/InterviewTab";
import { ParticleConstellation, FloatingOrb, StatCard3D } from "@/components/3d/Visualizations";

import {
  Job,
  AppStatus,
  TrackedApp,
  Preferences,
  Toast,
  ResumeProfile,
  OptimizationResult,
  DEFAULT_PREFERENCES,
  FILTER_TIERS
} from "@/types";

/* ──────────────────────────── Helpers ───────────────────────────── */

function savePreferences(prefs: Preferences) {
  if (typeof window === "undefined") return;
  localStorage.setItem("jobhunt_preferences", JSON.stringify(prefs));
  const id = localStorage.getItem("jobhunt_session_id");
  if (id) {
    apiFetch(`/api/users/me`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferences: prefs })
    }).catch(e => console.error("Error saving preferences to cloud", e));
  }
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

function saveResumeProfile(profile: ResumeProfile) {
  if (typeof window === "undefined") return;
  const id = localStorage.getItem("jobhunt_session_id");
  if (id) {
    apiFetch(`/api/users/me`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resume_profile: profile })
    }).catch(e => console.error("Error saving profile to cloud", e));
  }
}



/* ════════════════════════ MAIN DASHBOARD ════════════════════════ */

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<"matches" | "preferences" | "pipeline" | "analytics" | "interview">("matches");
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

  /* ── Resume state ── */
  const [resumeProfile, setResumeProfile] = useState<ResumeProfile | null>(null);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Optimization state ── */
  const [optimizationJob, setOptimizationJob] = useState<Job | null>(null);
  const [optimizationData, setOptimizationData] = useState<OptimizationResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  /* ── Pipeline / Kanban state ── */
  const [trackedApps, setTrackedApps] = useState<TrackedApp[]>([]);
  const [isLoadingPipeline, setIsLoadingPipeline] = useState(false);
  const [coverLetterModal, setCoverLetterModal] = useState<TrackedApp | null>(null);
  const [generatedCoverLetter, setGeneratedCoverLetter] = useState<string | null>(null);
  const [isGeneratingCL, setIsGeneratingCL] = useState(false);

  /* ── Analytics state ── */
  const [scoreTrends, setScoreTrends] = useState<{date: string; avgScore: number; count: number}[]>([]);
  const [skillGaps, setSkillGaps] = useState<{skill: string; count: number}[]>([]);
  const [pipelineStats, setPipelineStats] = useState<{bookmarked: number; applied: number; interviewing: number; rejected: number; offer: number; total: number; conversionRate: number} | null>(null);
  const [sourceStats, setSourceStats] = useState<{source: string; count: number}[]>([]);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  /* ── Interview Prep state ── */
  const [interviewQuestions, setInterviewQuestions] = useState<{question: string; type: string; tip: string}[]>([]);
  const [companyBrief, setCompanyBrief] = useState<{overview: string; culture: string; recentNews: string[]; interviewTips: string[]; glassdoorSentiment: string} | null>(null);
  const [isLoadingInterview, setIsLoadingInterview] = useState(false);
  const [isLoadingBrief, setIsLoadingBrief] = useState(false);
  const [interviewJobTitle, setInterviewJobTitle] = useState("");
  const [interviewCompany, setInterviewCompany] = useState("");
  const [interviewJobDesc, setInterviewJobDesc] = useState("");

  /* ── Toast helper ── */
  const showToast = useCallback((message: string, type: Toast["type"] = "success") => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  /* ── Load preferences + profile from Cloud (PostgreSQL) ── */
  useEffect(() => {
    const initializeSession = async () => {
      try {
        let id = localStorage.getItem("jobhunt_session_id");
        if (!id) {
          id = crypto.randomUUID();
          localStorage.setItem("jobhunt_session_id", id);
          // Create guest user on backend
          try {
            await apiFetch("/api/users/", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id })
            });
          } catch (e) { console.error("Error creating guest user", e); }
        }

        let res = await apiFetch(`/api/users/me`);
        if (!res.ok) {
          // If the user doesn't exist on the backend yet, create it.
          try {
            await apiFetch("/api/users/", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id })
            });
            res = await apiFetch(`/api/users/me`);
          } catch (e) {
            console.error("Error creating guest user", e);
          }
        }

        try {
          if (res.ok) {
            const userData = await res.json();
            if (userData.preferences) {
              setPrefs({ ...DEFAULT_PREFERENCES, ...userData.preferences });
              setSearchQuery(userData.preferences.targetTitle || "AI Engineer");
              setSearchLocation(userData.preferences.locations?.[0] || "Remote");
            } else {
              setSearchQuery(DEFAULT_PREFERENCES.targetTitle);
              setSearchLocation(DEFAULT_PREFERENCES.locations[0]);
            }
            if (userData.resume_profile) {
              setResumeProfile(userData.resume_profile);
              setResumeFileName(localStorage.getItem("jobhunt_resume_filename") || "resume.pdf");
            }
          }
        } catch (e) {
          console.error("Error fetching cloud user data", e);
        }
        setSearchCount(loadSearchCount()); // search count remains local for now
      } finally {
        setPrefsLoaded(true);
      }
    };

    initializeSession();
  }, []);

  /* ── Fetch jobs on mount (after session is initialized) ── */
  useEffect(() => {
    if (!prefsLoaded) return;
    const controller = new AbortController();
    apiFetch("/api/jobs/", { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => { setJobs(data); setIsLoading(false); })
      .catch((err) => {
        if (err.name === "AbortError") return;
        console.error("Failed to fetch jobs:", err); setIsLoading(false);
      });
    return () => controller.abort();
  }, [prefsLoaded]);

  /* ── Trigger scrape ── */
  const handleSearch = useCallback(() => {
    const query = searchQuery.trim() || prefs.targetTitle || "AI Engineer";
    const location = searchLocation.trim() || prefs.locations[0] || "Remote";

    setIsScraping(true);
    apiFetch("/api/jobs/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        location,
        user_profile: {
          title: prefs.targetTitle,
          skills: prefs.mustHaveSkills,
          experience_years: prefs.yearsExperience,
          salary_expectation_min: prefs.minSalary
        }
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        showToast(data.status || `Scrape complete for "${query}" in ${location}`, "success");
        const newCount = incrementSearchCount();
        setSearchCount(newCount);
        // Refresh jobs
        return apiFetch("/api/jobs/").then((r) => r.json()).then((d) => setJobs(d));
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

  /* ── Resume upload handler ── */
  const handleResumeUpload = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      showToast("Please upload a PDF file", "error");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast("File too large. Max 10MB.", "error");
      return;
    }

    setIsUploadingResume(true);
    setResumeFileName(file.name);

    const formData = new FormData();
    formData.append("file", file);
    const userId = localStorage.getItem("jobhunt_session_id");
    if (userId) {
      formData.append("user_id", userId);
    }

    try {
      const res = await apiFetch("/api/resume/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Upload failed");
      }

      const profile = data.profile as ResumeProfile;
      setResumeProfile(profile);
      saveResumeProfile(profile);
      localStorage.setItem("jobhunt_resume_filename", file.name);

      // Auto-fill preferences from resume
      setPrefs((prev) => ({
        ...prev,
        targetTitle: profile.targetTitle || prev.targetTitle,
        currentRole: profile.currentRole || prev.currentRole,
        yearsExperience: profile.yearsExperience || prev.yearsExperience,
        mustHaveSkills: profile.skills?.length > 0 ? profile.skills.slice(0, 10) : prev.mustHaveSkills,
        locations: profile.preferredLocations?.length > 0 ? profile.preferredLocations : prev.locations,
        industries: profile.industries?.length > 0 ? profile.industries : prev.industries,
      }));
      setSearchQuery(profile.targetTitle || searchQuery);

      showToast(
        `Resume parsed! Found ${profile.skills?.length || 0} skills via ${data.method === "gemini" ? "Gemini AI" : "keyword scan"}`,
        "success"
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      showToast(message, "error");
      setResumeFileName(null);
    } finally {
      setIsUploadingResume(false);
    }
  }, [showToast, searchQuery]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleResumeUpload(file);
  }, [handleResumeUpload]);

  /* ── Optimize Handler ── */
  const handleOptimize = useCallback(async (job: Job) => {
    if (!resumeProfile) {
      showToast("Please upload a resume first in Preferences.", "error");
      return;
    }
    setOptimizationJob(job);
    setOptimizationData(null);
    setIsOptimizing(true);
    
    try {
      const res = await apiFetch("/api/resume/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_profile: resumeProfile,
          job_description: `Role: ${job.title} at ${job.company}\nDescription: ${job.description || job.matchReason}`
        }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Optimization failed");
      
      setOptimizationData(data);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Optimization failed", "error");
      setOptimizationJob(null);
    } finally {
      setIsOptimizing(false);
    }
  }, [resumeProfile, showToast]);

  /* ── Pipeline handlers ── */
  const fetchTrackedApps = useCallback(async () => {
    setIsLoadingPipeline(true);
    try {
      const res = await apiFetch("/api/applications/");
      const data = await res.json();
      setTrackedApps(data);
    } catch (err) {
      console.error("Failed to fetch tracked apps:", err);
      showToast("Failed to load pipeline data", "error");
    } finally {
      setIsLoadingPipeline(false);
    }
  }, [showToast]);

  const handleTrackJob = useCallback(async (job: Job) => {
    try {
      const res = await apiFetch("/api/applications/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing_id: job.id,
          status: "bookmarked",
        }),
      });
      if (res.status === 409) {
        showToast("Already tracking this job", "info");
        return;
      }
      if (!res.ok) throw new Error("Failed to track");
      showToast(`Bookmarked "${job.title}"`, "success");
      fetchTrackedApps();
    } catch {
      showToast("Failed to track job", "error");
    }
  }, [showToast, fetchTrackedApps]);


  const handleUpdateStatus = useCallback(async (appId: string, newStatus: AppStatus) => {
    try {
      const res = await apiFetch(`/api/applications/${appId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setTrackedApps((prev) =>
        prev.map((a) => (a.applicationId === appId ? { ...a, status: newStatus } : a))
      );
    } catch {
      showToast("Failed to update status", "error");
    }
  }, [showToast]);

  const handleRemoveTrack = useCallback(async (appId: string) => {
    try {
      await apiFetch(`/api/applications/${appId}`, { method: "DELETE" });
      setTrackedApps((prev) => prev.filter((a) => a.applicationId !== appId));
      showToast("Removed from pipeline", "info");
    } catch {
      showToast("Failed to remove", "error");
    }
  }, [showToast]);

  const handleAutoFill = useCallback(async (app: TrackedApp) => {
    if (!resumeProfile) {
      showToast("Upload your resume in Preferences first to use auto-fill", "error");
      return;
    }
    showToast("Launching browser for Auto-Fill... Please wait.", "success");
    try {
      const res = await apiFetch(`/api/applications/${app.applicationId}/auto-fill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume_profile: resumeProfile })
      });
      if (!res.ok) throw new Error("Failed to trigger auto-fill");
    } catch (error) {
      console.error(error);
      showToast("Failed to launch auto-fill", "error");
    }
  }, [resumeProfile, showToast]);

  const handleGenerateCoverLetter = useCallback(async (app: TrackedApp) => {
    if (!resumeProfile) {
      showToast("Upload your resume in Preferences first", "error");
      return;
    }
    setCoverLetterModal(app);
    setGeneratedCoverLetter(app.coverLetter);
    if (app.coverLetter) return; // Already generated

    setIsGeneratingCL(true);
    try {
      const res = await apiFetch(`/api/applications/${app.applicationId}/cover-letter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume_profile: resumeProfile }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Generation failed");
      setGeneratedCoverLetter(data.coverLetter);
      setTrackedApps((prev) =>
        prev.map((a) =>
          a.applicationId === app.applicationId ? { ...a, coverLetter: data.coverLetter } : a
        )
      );
      showToast("Cover letter generated!", "success");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to generate", "error");
    } finally {
      setIsGeneratingCL(false);
    }
  }, [resumeProfile, showToast]);

  // Pipeline data is fetched when clicking the tab now.
  const fetchAnalytics = useCallback(async () => {
    setIsLoadingAnalytics(true);
    try {
      const [trendsRes, gapsRes, statsRes, sourcesRes] = await Promise.all([
        apiFetch("/api/analytics/score-trends"),
        apiFetch("/api/analytics/skill-gaps"),
        apiFetch("/api/analytics/pipeline-stats"),
        apiFetch("/api/analytics/sources"),
      ]);
      setScoreTrends(await trendsRes.json());
      setSkillGaps(await gapsRes.json());
      setPipelineStats(await statsRes.json());
      setSourceStats(await sourcesRes.json());
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
      showToast("Failed to load analytics", "error");
    } finally {
      setIsLoadingAnalytics(false);
    }
  }, [showToast]);
  // Analytics data is fetched when clicking the tab now.

  /* ── Interview Prep handlers ── */
  const handleGenerateQuestions = useCallback(async () => {
    if (!interviewJobTitle || !interviewCompany) {
      showToast("Enter a job title and company first", "error");
      return;
    }
    setIsLoadingInterview(true);
    setInterviewQuestions([]);
    try {
      const res = await apiFetch("/api/interview/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_title: interviewJobTitle,
          company: interviewCompany,
          job_description: interviewJobDesc || `${interviewJobTitle} at ${interviewCompany}`,
          resume_profile: resumeProfile || {},
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed");
      setInterviewQuestions(data.questions);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed", "error");
    } finally {
      setIsLoadingInterview(false);
    }
  }, [interviewJobTitle, interviewCompany, interviewJobDesc, resumeProfile, showToast]);

  const handleGenerateBrief = useCallback(async () => {
    if (!interviewCompany) {
      showToast("Enter a company name first", "error");
      return;
    }
    setIsLoadingBrief(true);
    setCompanyBrief(null);
    try {
      const res = await apiFetch("/api/interview/company-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: interviewCompany,
          job_title: interviewJobTitle || "Software Engineer",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed");
      setCompanyBrief(data.brief);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed", "error");
    } finally {
      setIsLoadingBrief(false);
    }
  }, [interviewCompany, interviewJobTitle, showToast]);

  /* ── Derived data ── */
  const filteredJobs = jobs.filter((j) => j.matchScore >= filterMin);
  const avgScore = jobs.length ? Math.round(jobs.reduce((a, j) => a + j.matchScore, 0) / jobs.length) : 0;

  const filterCounts = FILTER_TIERS.map((tier) => ({
    ...tier,
    count: jobs.filter((j) => j.matchScore >= tier.min).length,
  }));

  /* ── Prevent flash of default state ── */
  if (!prefsLoaded) return (
    <div className="min-h-screen bg-[#f5f5f0] dark:bg-[#0a0a0a] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        <p className="text-sm text-muted-foreground font-medium">Loading your dashboard...</p>
      </div>
    </div>
  );

  /* ════════════════════════════ RENDER ══════════════════════════ */
  return (
    <ErrorBoundary>
    <main className="min-h-screen bg-[#f5f5f0] dark:bg-[#0a0a0a] font-[family-name:var(--font-sans)] selection:bg-blue-500/20 relative">
      {/* ── 3D Background Elements ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <ParticleConstellation count={60} />
        <FloatingOrb size={400} color="violet" x={-300} y={-200} delay={0} blur={100} />
        <FloatingOrb size={300} color="blue" x={400} y={100} delay={2} blur={80} />
      </div>

      {/* ── Subtle warm noise texture ── */}
      <div className="fixed inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iLjc1IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iLjAzIi8+PC9zdmc+')] opacity-30 pointer-events-none z-0" />

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
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              )}
              {toast.type === "error" && (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              {toast.message}
            </div>
          </div>
        ))}
      </div>

      {/* ── Top Navigation Bar (Pill) ── */}
      <div className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
        <nav className="pointer-events-auto bg-card/60 backdrop-blur-2xl border border-border shadow-2xl rounded-full px-2 py-2 flex items-center gap-4 sm:gap-8 transition-all hover:bg-card/80 hover:border-primary/30">
          <div className="flex items-center gap-2 pl-4 pr-2">
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-base font-heading font-black tracking-tight hidden md:block">JobHunt</span>
          </div>
          
          <div className="flex items-center gap-1">
            {(["matches", "pipeline", "analytics", "interview", "preferences"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  if (tab === "pipeline") fetchTrackedApps();
                  if (tab === "analytics") fetchAnalytics();
                }}
                className={`relative px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 flex items-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  activeTab === tab
                    ? "bg-foreground text-background shadow-md"
                    : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                }`}
              >
                {tab === "matches" && <Search className="w-4 h-4" />}
                {tab === "pipeline" && <LayoutDashboard className="w-4 h-4" />}
                {tab === "analytics" && <BarChart3 className="w-4 h-4" />}
                {tab === "interview" && <Presentation className="w-4 h-4" />}
                {tab === "preferences" && <Settings className="w-4 h-4" />}
                <span className="hidden lg:inline capitalize">{tab}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>

      <div className="max-w-7xl mx-auto relative z-10 px-4 sm:px-6 lg:px-8 pb-24 pt-32">
        
        {/* ══════════════════════ BENTO GRID HERO ══════════════════════ */}
        <header className="mb-14">
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6 auto-rows-[140px]">
            
            {/* Main Title Tile (Span 4 cols, 2 rows) */}
            <div className="md:col-span-4 lg:col-span-4 row-span-2 relative overflow-hidden rounded-3xl bg-card border border-border p-8 sm:p-10 flex flex-col justify-between group">
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 opacity-50 group-hover:opacity-100 transition-opacity duration-1000" />
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-primary/10 text-primary mb-6 ring-1 ring-primary/20 shadow-inner">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_var(--primary)]" />
                  Agent Active
                </div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-black tracking-tight leading-[1.05] text-foreground">
                  Your autonomous <br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">career agent.</span>
                </h1>
                <p className="text-muted-foreground text-lg sm:text-xl font-medium mt-6 max-w-lg leading-relaxed">
                  We scrape, analyze, and rank the perfect roles specifically tailored to your resume profile.
                </p>
              </div>
            </div>

            {/* Stat Tile 1 (Jobs Found) */}
            <div className="md:col-span-2 lg:col-span-2 row-span-1 rounded-3xl bg-card border border-border p-6 flex flex-col justify-center relative overflow-hidden group hover:border-primary/50 transition-colors">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center justify-between mb-2 relative z-10">
                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Jobs Found</span>
                <Briefcase className="w-5 h-5 text-blue-500" />
              </div>
              <div className="text-4xl font-black font-heading tracking-tighter text-foreground relative z-10">
                {jobs.length}
              </div>
            </div>

            {/* Stat Tile 2 (Avg Match) */}
            <div className="md:col-span-2 lg:col-span-2 row-span-1 rounded-3xl bg-card border border-border p-6 flex flex-col justify-center relative overflow-hidden group hover:border-primary/50 transition-colors">
               <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center justify-between mb-2 relative z-10">
                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Avg Match</span>
                <Sparkles className="w-5 h-5 text-violet-500" />
              </div>
              <div className="text-4xl font-black font-heading tracking-tighter text-foreground relative z-10">
                {avgScore}%
              </div>
            </div>

          </div>
        </header>

        {/* ══════════════════════ MATCHES TAB ══════════════════════ */}
        {activeTab === "matches" && (
          <MatchesTab
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchLocation={searchLocation}
            setSearchLocation={setSearchLocation}
            handleSearch={handleSearch}
            isScraping={isScraping}
            filterMin={filterMin}
            setFilterMin={setFilterMin}
            filteredJobs={filteredJobs}
            isLoading={isLoading}
            jobs={jobs}
            avgScore={avgScore}
            handleTrackJob={handleTrackJob}
            handleOptimize={handleOptimize}
            filterCounts={filterCounts}
            handleApplyJob={(job) => window.open(job.applyUrl, "_blank", "noopener,noreferrer")}
          />
        )}

        {/* ══════════════════════ PREFERENCES TAB ══════════════════════ */}
        {activeTab === "preferences" && (
          <PreferencesTab
            prefs={prefs}
            setPrefs={setPrefs}
            updatePref={updatePref}
            handleSavePrefs={handleSavePrefs}
            resumeProfile={resumeProfile}
            setResumeProfile={setResumeProfile}
            isUploadingResume={isUploadingResume}
            resumeFileName={resumeFileName}
            setResumeFileName={setResumeFileName}
            handleResumeUpload={handleResumeUpload}
            handleDrop={handleDrop}
            isDragging={isDragging}
            setIsDragging={setIsDragging}
            fileInputRef={fileInputRef}
            showToast={showToast}
          />
        )}

        {/* ══════════════════════ PIPELINE TAB ══════════════════════ */}
        {activeTab === "pipeline" && (
          <PipelineTab
            isLoadingPipeline={isLoadingPipeline}
            trackedApps={trackedApps}
            handleUpdateStatus={handleUpdateStatus}
            handleRemoveTrack={handleRemoveTrack}
            handleAutoFill={handleAutoFill}
            handleGenerateCoverLetter={handleGenerateCoverLetter}
            coverLetterModal={coverLetterModal}
            setCoverLetterModal={setCoverLetterModal}
            generatedCoverLetter={generatedCoverLetter}
            setGeneratedCoverLetter={setGeneratedCoverLetter}
            isGeneratingCL={isGeneratingCL}
            showToast={showToast}
          />
        )}

        {/* ══════════════════════ ANALYTICS TAB ══════════════════════ */}
        {activeTab === "analytics" && (
          <AnalyticsTab
            isLoadingAnalytics={isLoadingAnalytics}
            pipelineStats={pipelineStats}
            sourceStats={sourceStats}
            skillGaps={skillGaps}
            scoreTrends={scoreTrends}
          />
        )}

        {/* ══════════════════════ INTERVIEW PREP TAB ══════════════════════ */}
        {activeTab === "interview" && (
          <InterviewTab
            interviewJobTitle={interviewJobTitle}
            setInterviewJobTitle={setInterviewJobTitle}
            interviewCompany={interviewCompany}
            setInterviewCompany={setInterviewCompany}
            interviewJobDesc={interviewJobDesc}
            setInterviewJobDesc={setInterviewJobDesc}
            handleGenerateQuestions={handleGenerateQuestions}
            handleGenerateBrief={handleGenerateBrief}
            isLoadingInterview={isLoadingInterview}
            isLoadingBrief={isLoadingBrief}
            interviewQuestions={interviewQuestions}
            companyBrief={companyBrief}
          />
        )}
      </div>

      {/* ══════════════════════ OPTIMIZATION MODAL ══════════════════════ */}
      {(optimizationJob || isOptimizing) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => !isOptimizing && setOptimizationJob(null)}></div>
          <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-[fadeUp_0.3s_ease-out]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Resume Optimization
                </h3>
                {optimizationJob && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Tailoring your resume for <strong className="text-slate-700 dark:text-slate-300">{optimizationJob.title}</strong> at {optimizationJob.company}
                  </p>
                )}
              </div>
              <button 
                onClick={() => setOptimizationJob(null)}
                disabled={isOptimizing}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 bg-[#fcfcfc] dark:bg-[#0a0a0a]">
              {isOptimizing ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-slate-100 dark:border-slate-800"></div>
                    <div className="w-16 h-16 rounded-full border-4 border-blue-500 border-t-transparent animate-spin absolute top-0 left-0"></div>
                  </div>
                  <h4 className="mt-6 text-lg font-bold text-slate-800 dark:text-white">Analyzing ATS Match...</h4>
                  <p className="text-sm text-slate-500 mt-2 text-center max-w-sm">Our AI is rewriting your bullet points and extracting missing keywords specifically for this role.</p>
                </div>
              ) : optimizationData ? (
                <div className="space-y-8">
                  {/* Keywords Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-rose-100 dark:border-rose-900/30">
                      <h4 className="text-sm font-bold uppercase tracking-wider text-rose-500 flex items-center gap-2 mb-4">
                        <AlertCircle className="w-4 h-4" />
                        Missing Keywords
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {optimizationData.missing_keywords.length > 0 ? optimizationData.missing_keywords.map((kw, i) => (
                          <span key={i} className="px-2.5 py-1 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20 text-xs font-semibold rounded-lg">{kw}</span>
                        )) : <p className="text-sm text-slate-500">None! You hit all major keywords.</p>}
                      </div>
                    </div>
                    
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                      <h4 className="text-sm font-bold uppercase tracking-wider text-emerald-500 flex items-center gap-2 mb-4">
                        <CheckCircle2 className="w-4 h-4" />
                        Matched Keywords
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {optimizationData.matched_keywords.length > 0 ? optimizationData.matched_keywords.map((kw, i) => (
                          <span key={i} className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 text-xs font-semibold rounded-lg">{kw}</span>
                        )) : <p className="text-sm text-slate-500">None detected.</p>}
                      </div>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Suggested Summary</h4>
                    <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed font-medium">
                      {optimizationData.tailored_summary}
                    </p>
                  </div>

                  {/* Bullet Points */}
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 ml-1">Bullet Point Rewrites</h4>
                    <div className="space-y-4">
                      {optimizationData.bullet_suggestions.map((suggestion, i) => (
                        <div key={i} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 relative group">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-2xl opacity-50"></div>
                          <div className="mb-3">
                            <span className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Rewrite Idea based on:</span>
                            <p className="text-sm text-slate-500 dark:text-slate-400 line-through decoration-rose-500/50">{suggestion.original_concept}</p>
                          </div>
                          <div className="mb-3">
                            <span className="text-[10px] font-bold uppercase text-blue-500 mb-1 block">Optimized Bullet:</span>
                            <p className="text-sm font-semibold text-slate-800 dark:text-white leading-relaxed">{suggestion.suggested_bullet}</p>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">
                            <p className="text-xs text-slate-500 dark:text-slate-400"><strong className="text-slate-600 dark:text-slate-300">Why:</strong> {suggestion.reasoning}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              ) : null}
            </div>
            
          </div>
        </div>
      )}


    </main>
    </ErrorBoundary>
  );
}
