"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { JobCard } from "@/components/JobCard";
import { Search, MapPin, Briefcase, LayoutDashboard, BarChart3, Presentation, Settings, CheckCircle2, XCircle, AlertCircle, Loader2, Sparkles, Filter, Bookmark, Play, CheckCircle, ExternalLink, CalendarDays, LineChart, FileText, UploadCloud, ChevronRight, Check, Target } from "lucide-react";

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
  source?: string;
  description?: string;
}

type AppStatus = "bookmarked" | "applied" | "interviewing" | "rejected" | "offer";

interface TrackedApp {
  applicationId: string;
  listingId: string;
  status: AppStatus;
  coverLetter: string | null;
  notes: string | null;
  appliedAt: string | null;
  createdAt: string | null;
  title: string;
  company: string;
  location: string;
  salaryMin: number | null;
  salaryMax: number | null;
  source: string;
  description: string;
  applyUrl: string | null;
  matchScore: number | null;
  matchReason: string | null;
  skillGaps: string[] | null;
}

const KANBAN_COLUMNS: { key: AppStatus; label: string; color: string; icon: React.ReactNode }[] = [
  { key: "bookmarked", label: "Bookmarked", color: "slate", icon: <Bookmark className="w-4 h-4" /> },
  { key: "applied", label: "Applied", color: "blue", icon: <CheckCircle2 className="w-4 h-4" /> },
  { key: "interviewing", label: "Interviewing", color: "amber", icon: <Presentation className="w-4 h-4" /> },
  { key: "rejected", label: "Rejected", color: "rose", icon: <XCircle className="w-4 h-4" /> },
  { key: "offer", label: "Offer 🎉", color: "emerald", icon: <Sparkles className="w-4 h-4" /> },
];

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

interface ResumeProfile {
  name: string;
  currentRole: string;
  targetTitle: string;
  yearsExperience: number;
  skills: string[];
  education: string;
  summary: string;
  preferredLocations: string[];
  industries: string[];
}

interface RewriteSuggestion {
  original_concept: string;
  suggested_bullet: string;
  reasoning: string;
}

interface OptimizationResult {
  missing_keywords: string[];
  matched_keywords: string[];
  tailored_summary: string;
  bullet_suggestions: RewriteSuggestion[];
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

function loadResumeProfile(): ResumeProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("jobhunt_resume_profile");
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function saveResumeProfile(profile: ResumeProfile) {
  if (typeof window === "undefined") return;
  localStorage.setItem("jobhunt_resume_profile", JSON.stringify(profile));
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
              <XCircle className="w-3 h-3" />
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

  /* ── Load preferences + search count + resume from localStorage ── */
  useEffect(() => {
    const loaded = loadPreferences();
    setPrefs(loaded);
    setSearchQuery(loaded.targetTitle);
    setSearchLocation(loaded.locations[0] || "Remote");
    setSearchCount(loadSearchCount());
    const savedResume = loadResumeProfile();
    if (savedResume) {
      setResumeProfile(savedResume);
      setResumeFileName(localStorage.getItem("jobhunt_resume_filename") || "resume.pdf");
    }
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

    try {
      const res = await fetch("/api/resume/upload", {
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
      const res = await fetch("/api/resume/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_profile: resumeProfile,
          job_description: `Role: ${job.title} at ${job.company}\nDescription: ${job.matchReason}` // Ideally we'd send full description, but using reason for now to save bandwidth if full desc isn't in frontend
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
      const res = await fetch("/api/applications/");
      const data = await res.json();
      setTrackedApps(data);
    } catch (err) {
      console.error("Failed to fetch tracked apps:", err);
    } finally {
      setIsLoadingPipeline(false);
    }
  }, []);

  const handleTrackJob = useCallback(async (job: Job) => {
    try {
      const res = await fetch("/api/applications/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing_id: job.id,
          user_id: "00000000-0000-0000-0000-000000000000",
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

  const handleApplyJob = useCallback(async (job: Job) => {
    try {
      // Create or update status to 'applied'
      const res = await fetch("/api/applications/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing_id: job.id,
          user_id: "00000000-0000-0000-0000-000000000000",
          status: "applied",
        }),
      });
      
      if (res.status === 409) {
        // If already tracking, try to fetch its app_id to update status
        // We'll just do a silent refresh of the pipeline to see if it's there
        // Note: Full implementation would PATCH /api/applications/{app_id}/status
        // Since we don't return app_id on 409 currently, we'll just show a toast.
        showToast(`Opened application. Check Pipeline.`, "info");
      } else if (res.ok) {
        showToast(`Moved "${job.title}" to Applied pipeline`, "success");
      }
      fetchTrackedApps();
    } catch {
      console.error("Failed to track apply click");
    }
  }, [showToast, fetchTrackedApps]);


  const handleUpdateStatus = useCallback(async (appId: string, newStatus: AppStatus) => {
    try {
      const res = await fetch(`/api/applications/${appId}/status`, {
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
      await fetch(`/api/applications/${appId}`, { method: "DELETE" });
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
      const res = await fetch(`/api/applications/${app.applicationId}/auto-fill`, {
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
      const res = await fetch(`/api/applications/${app.applicationId}/cover-letter`, {
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

  // Fetch pipeline data when switching to pipeline tab
  useEffect(() => {
    if (activeTab === "pipeline") fetchTrackedApps();
  }, [activeTab, fetchTrackedApps]);

  /* ── Analytics handlers ── */
  const fetchAnalytics = useCallback(async () => {
    setIsLoadingAnalytics(true);
    try {
      const [trendsRes, gapsRes, statsRes, sourcesRes] = await Promise.all([
        fetch("/api/analytics/score-trends"),
        fetch("/api/analytics/skill-gaps"),
        fetch("/api/analytics/pipeline-stats"),
        fetch("/api/analytics/sources"),
      ]);
      setScoreTrends(await trendsRes.json());
      setSkillGaps(await gapsRes.json());
      setPipelineStats(await statsRes.json());
      setSourceStats(await sourcesRes.json());
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
    } finally {
      setIsLoadingAnalytics(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "analytics") fetchAnalytics();
  }, [activeTab, fetchAnalytics]);

  /* ── Interview Prep handlers ── */
  const handleGenerateQuestions = useCallback(async () => {
    if (!interviewJobTitle || !interviewCompany) {
      showToast("Enter a job title and company first", "error");
      return;
    }
    setIsLoadingInterview(true);
    setInterviewQuestions([]);
    try {
      const res = await fetch("/api/interview/questions", {
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
      const res = await fetch("/api/interview/company-brief", {
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
  if (!prefsLoaded) return null;

  /* ════════════════════════════ RENDER ══════════════════════════ */
  return (
    <main className="min-h-screen bg-[#f5f5f0] dark:bg-[#0a0a0a] font-[family-name:var(--font-geist-sans)] selection:bg-blue-500/20">
      {/* ── Subtle warm noise texture ── */}
      <div className="fixed inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iLjc1IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iLjAzIi8+PC9zdmc+')] opacity-30 pointer-events-none" />

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

      {/* ── Top Navigation Bar ── */}
      <nav className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-2xl border-b border-border shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <span className="text-lg font-heading font-black tracking-tight hidden sm:block">JobHunt AI</span>
          </div>
          
          <div className="flex bg-muted/50 p-1 rounded-xl border border-border overflow-x-auto no-scrollbar">
            {(["matches", "pipeline", "analytics", "interview", "preferences"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  activeTab === tab
                    ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {tab === "matches" && <Search className="w-4 h-4" />}
                {tab === "pipeline" && <LayoutDashboard className="w-4 h-4" />}
                {tab === "analytics" && <BarChart3 className="w-4 h-4" />}
                {tab === "interview" && <Presentation className="w-4 h-4" />}
                {tab === "preferences" && <Settings className="w-4 h-4" />}
                <span className="hidden md:inline capitalize">{tab}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto relative z-10 px-4 sm:px-6 lg:px-8 pb-24 pt-10">
        
        {/* ══════════════════════ HERO SECTION ══════════════════════ */}
        <header className="mb-14 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase bg-primary/10 text-primary border border-primary/20 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Autonomous Career Agent
          </div>
          <h1 className="text-5xl sm:text-6xl font-heading font-black tracking-tight leading-[1.1] text-foreground mb-4">
            Find the perfect role, <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet-500">
              automatically.
            </span>
          </h1>
          <p className="text-muted-foreground text-lg sm:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
            Your AI agent that scrapes, scores, and ranks jobs based on your unique resume.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 sm:gap-6 max-w-xl mx-auto mt-10">
            {[
              { label: "Jobs Found", value: jobs.length, icon: Briefcase },
              { label: "Avg Match", value: `${avgScore}%`, icon: Sparkles },
              { label: "Searches", value: searchCount, icon: Search },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl py-5 px-4 text-center shadow-sm flex flex-col items-center justify-center group hover:border-primary/30 transition-colors"
              >
                <stat.icon className="w-5 h-5 text-muted-foreground mb-2 group-hover:text-primary transition-colors" />
                <div className="text-2xl sm:text-3xl font-heading font-black text-foreground">{stat.value}</div>
                <div className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-widest mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </header>

        {/* ══════════════════════ MATCHES TAB ══════════════════════ */}
        {activeTab === "matches" && (
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
                  <Search className="w-8 h-8" />
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
                    <JobCard {...job} onOptimize={() => handleOptimize(job)} onTrack={() => handleTrackJob(job)} onApply={() => handleApplyJob(job)} />
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

            {/* ── Resume Upload Section ── */}
            <div className="mb-6">
              <SectionCard
                icon={<Briefcase className="w-4.5 h-4.5" />}
                title="Resume Upload"
              >
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Upload your resume to auto-fill your profile and get AI-matched job recommendations.</p>

                {/* Drop zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative cursor-pointer border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ${
                    isDragging
                      ? "border-blue-500 bg-blue-50/50 dark:bg-blue-500/10 scale-[1.01]"
                      : resumeProfile
                      ? "border-emerald-300 dark:border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-500/5 hover:border-emerald-400"
                      : "border-slate-200 dark:border-slate-700 bg-white/40 dark:bg-slate-800/30 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-white/60 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleResumeUpload(file);
                      e.target.value = "";
                    }}
                  />

                  {isUploadingResume ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="animate-spin h-8 w-8 text-primary" />
                      <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">Analyzing resume with AI...</p>
                    </div>
                  ) : resumeProfile ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-white">{resumeFileName}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Parsed as {resumeProfile.targetTitle} · {resumeProfile.skills?.length || 0} skills detected</p>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">Click or drag to replace</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <UploadCloud className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Drop your resume here or click to browse</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">PDF files only · Max 10MB</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Resume profile summary */}
                {resumeProfile && (
                  <div className="mt-4 bg-white/60 dark:bg-slate-800/40 rounded-xl p-4 border border-slate-100 dark:border-slate-700/50">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-white">{resumeProfile.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{resumeProfile.currentRole} · {resumeProfile.yearsExperience}+ years</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setResumeProfile(null);
                          setResumeFileName(null);
                          localStorage.removeItem("jobhunt_resume_profile");
                          localStorage.removeItem("jobhunt_resume_filename");
                          showToast("Resume removed", "info");
                        }}
                        className="text-xs font-semibold text-red-500 hover:text-red-600 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                    {resumeProfile.summary && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">{resumeProfile.summary}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {resumeProfile.skills?.slice(0, 12).map((skill) => (
                        <span key={skill} className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 border border-blue-100 dark:border-blue-500/20">
                          {skill}
                        </span>
                      ))}
                      {(resumeProfile.skills?.length || 0) > 12 && (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold text-slate-400">+{resumeProfile.skills.length - 12} more</span>
                      )}
                    </div>
                  </div>
                )}
              </SectionCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* ── Profile ── */}
              <SectionCard
                icon={<CheckCircle className="w-4.5 h-4.5" />}
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
                icon={<MapPin className="w-4.5 h-4.5" />}
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
                icon={<Briefcase className="w-4.5 h-4.5" />}
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
                icon={<Sparkles className="w-4.5 h-4.5" />}
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
                icon={<Target className="w-4.5 h-4.5" />}
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
                            <Check className="w-2.5 h-2.5 text-primary-foreground" />
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
                icon={<Briefcase className="w-4.5 h-4.5" />}
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
                icon={<LineChart className="w-4.5 h-4.5" />}
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

        {/* ══════════════════════ PIPELINE TAB ══════════════════════ */}
        {activeTab === "pipeline" && (
          <div className="animate-[fadeUp_0.5s_ease-out]">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">Application Pipeline</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Track your applications through the hiring process. Bookmark jobs from Matches to get started.</p>
            </div>

            {isLoadingPipeline ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
              </div>
            ) : trackedApps.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                  <LayoutDashboard className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">No tracked applications</h3>
                <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">Go to the Matches tab and click the bookmark icon on jobs you want to track.</p>
              </div>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4">
                {KANBAN_COLUMNS.map((col) => {
                  const colApps = trackedApps.filter((a) => a.status === col.key);
                  const colorMap: Record<string, { bg: string; border: string; text: string; badge: string }> = {
                    slate:   { bg: "bg-slate-50 dark:bg-slate-900/50", border: "border-slate-200 dark:border-slate-800", text: "text-slate-600 dark:text-slate-400", badge: "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300" },
                    blue:    { bg: "bg-blue-50/50 dark:bg-blue-500/5", border: "border-blue-200/60 dark:border-blue-500/20", text: "text-blue-600 dark:text-blue-400", badge: "bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300" },
                    amber:   { bg: "bg-amber-50/50 dark:bg-amber-500/5", border: "border-amber-200/60 dark:border-amber-500/20", text: "text-amber-600 dark:text-amber-400", badge: "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300" },
                    rose:    { bg: "bg-rose-50/50 dark:bg-rose-500/5", border: "border-rose-200/60 dark:border-rose-500/20", text: "text-rose-600 dark:text-rose-400", badge: "bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300" },
                    emerald: { bg: "bg-emerald-50/50 dark:bg-emerald-500/5", border: "border-emerald-200/60 dark:border-emerald-500/20", text: "text-emerald-600 dark:text-emerald-400", badge: "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
                  };
                  const colors = colorMap[col.color];

                  return (
                    <div key={col.key} className={`flex-shrink-0 w-72 rounded-2xl border ${colors.border} ${colors.bg} p-4`}>
                      {/* Column header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span className={colors.text}>{col.icon}</span>
                          <h3 className={`text-sm font-bold ${colors.text} uppercase tracking-wider`}>{col.label}</h3>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors.badge}`}>{colApps.length}</span>
                      </div>

                      {/* Cards */}
                      <div className="flex flex-col gap-3">
                        {colApps.map((app) => (
                          <div key={app.applicationId} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/50 p-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="min-w-0">
                                <h4 className="text-sm font-bold text-slate-800 dark:text-white truncate">{app.title}</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{app.company} · {app.location}</p>
                              </div>
                              {app.matchScore !== null && (
                                <span className={`shrink-0 text-xs font-black px-2 py-1 rounded-lg ${
                                  app.matchScore >= 75 ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400" :
                                  app.matchScore >= 50 ? "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400" :
                                  "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400"
                                }`}>{app.matchScore}%</span>
                              )}
                            </div>

                            {/* Status selector */}
                            <select
                              value={app.status}
                              onChange={(e) => handleUpdateStatus(app.applicationId, e.target.value as AppStatus)}
                              className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 mb-3 outline-none focus:ring-2 focus:ring-blue-500/30"
                            >
                              {KANBAN_COLUMNS.map((c) => (
                                <option key={c.key} value={c.key}>{c.label}</option>
                              ))}
                            </select>

                            {/* Action buttons */}
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleGenerateCoverLetter(app)}
                                className="flex-1 text-[11px] font-semibold py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 transition-colors truncate"
                              >
                                {app.coverLetter ? "✏️ View Letter" : "✨ Cover Letter"}
                              </button>
                              {app.applyUrl && (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleAutoFill(app)}
                                    className="text-[11px] font-semibold py-1.5 px-3 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20 transition-colors border border-indigo-200 dark:border-indigo-500/20"
                                    title="Auto-Fill with Playwright"
                                  >
                                    ⚡ Auto-Fill
                                  </button>
                                  <a
                                    href={app.applyUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[11px] font-semibold py-1.5 px-3 rounded-lg bg-slate-900 text-white hover:bg-blue-600 dark:bg-white dark:text-slate-900 dark:hover:bg-blue-500 dark:hover:text-white transition-colors"
                                  >
                                    Apply
                                  </a>
                                </div>
                              )}
                              <button
                                onClick={() => handleRemoveTrack(app.applicationId)}
                                className="text-[11px] font-semibold py-1.5 px-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                                title="Remove"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════ ANALYTICS TAB ══════════════════════ */}
        {activeTab === "analytics" && (
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
        )}

        {/* ══════════════════════ INTERVIEW PREP TAB ══════════════════════ */}
        {activeTab === "interview" && (
          <div className="animate-[fadeUp_0.5s_ease-out]">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">Interview Prep</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Generate AI-powered interview questions and research your target company.</p>
            </div>

            {/* Input form */}
            <div className="bg-white/60 dark:bg-slate-900/50 backdrop-blur-2xl border border-white/60 dark:border-white/[0.06] rounded-2xl p-6 shadow-sm mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Job Title</label>
                  <input
                    type="text"
                    value={interviewJobTitle}
                    onChange={(e) => setInterviewJobTitle(e.target.value)}
                    placeholder="e.g. Senior AI Engineer"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Company</label>
                  <input
                    type="text"
                    value={interviewCompany}
                    onChange={(e) => setInterviewCompany(e.target.value)}
                    placeholder="e.g. Google"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Job Description (optional, improves results)</label>
                <textarea
                  value={interviewJobDesc}
                  onChange={(e) => setInterviewJobDesc(e.target.value)}
                  placeholder="Paste the full job description here for best results..."
                  rows={3}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleGenerateQuestions}
                  disabled={isLoadingInterview}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-slate-900 text-white hover:bg-blue-600 dark:bg-white dark:text-slate-900 dark:hover:bg-blue-500 dark:hover:text-white transition-all disabled:opacity-50"
                >
                  {isLoadingInterview ? (
                    <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Generating...</>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> Generate Questions</>
                  )}
                </button>
                <button
                  onClick={handleGenerateBrief}
                  disabled={isLoadingBrief}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10 dark:hover:text-blue-400 transition-all disabled:opacity-50"
                >
                  {isLoadingBrief ? (
                    <><div className="w-4 h-4 rounded-full border-2 border-slate-400/30 border-t-slate-400 animate-spin" /> Researching...</>
                  ) : (
                    <><Briefcase className="w-4 h-4" /> Company Brief</>
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Interview Questions */}
              {interviewQuestions.length > 0 && (
                <div className="bg-white/60 dark:bg-slate-900/50 backdrop-blur-2xl border border-white/60 dark:border-white/[0.06] rounded-2xl p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Likely Interview Questions</h3>
                  <div className="space-y-4">
                    {interviewQuestions.map((q, i) => (
                      <div key={i} className="relative pl-4 border-l-2 border-blue-200 dark:border-blue-800">
                        <span className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-md mb-1.5 ${
                          q.type === "technical" ? "bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400" :
                          q.type === "behavioral" ? "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400" :
                          "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400"
                        }`}>{q.type}</span>
                        <p className="text-sm font-semibold text-slate-800 dark:text-white mb-1">{q.question}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 italic">💡 {q.tip}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Company Brief */}
              {companyBrief && (
                <div className="bg-white/60 dark:bg-slate-900/50 backdrop-blur-2xl border border-white/60 dark:border-white/[0.06] rounded-2xl p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Company Research Brief — {interviewCompany}</h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-bold text-blue-500 uppercase mb-1">Overview</h4>
                      <p className="text-sm text-slate-700 dark:text-slate-300">{companyBrief.overview}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-emerald-500 uppercase mb-1">Culture</h4>
                      <p className="text-sm text-slate-700 dark:text-slate-300">{companyBrief.culture}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-violet-500 uppercase mb-1">Recent News</h4>
                      <ul className="space-y-1">{companyBrief.recentNews.map((n, i) => <li key={i} className="text-sm text-slate-600 dark:text-slate-400 flex gap-2"><span>•</span>{n}</li>)}</ul>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-amber-500 uppercase mb-1">Interview Tips</h4>
                      <ul className="space-y-1">{companyBrief.interviewTips.map((t, i) => <li key={i} className="text-sm text-slate-600 dark:text-slate-400 flex gap-2"><span>💡</span>{t}</li>)}</ul>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-rose-500 uppercase mb-1">Glassdoor Sentiment</h4>
                      <p className="text-sm text-slate-700 dark:text-slate-300">{companyBrief.glassdoorSentiment}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════ COVER LETTER MODAL ══════════════════════ */}
      {coverLetterModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => { setCoverLetterModal(null); setGeneratedCoverLetter(null); }} />
          <div className="relative w-full max-w-3xl max-h-[85vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-[fadeUp_0.3s_ease-out]">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Cover Letter
                </h3>
                <p className="text-sm text-slate-500 mt-0.5">{coverLetterModal.title} at {coverLetterModal.company}</p>
              </div>
              <button onClick={() => { setCoverLetterModal(null); setGeneratedCoverLetter(null); }} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {isGeneratingCL ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full border-4 border-slate-100 dark:border-slate-800" />
                    <div className="w-14 h-14 rounded-full border-4 border-blue-500 border-t-transparent animate-spin absolute top-0 left-0" />
                  </div>
                  <p className="mt-5 text-sm font-semibold text-slate-600 dark:text-slate-300">Generating with Gemini AI...</p>
                  <p className="text-xs text-slate-400 mt-1">Crafting a personalized cover letter based on your resume</p>
                </div>
              ) : generatedCoverLetter ? (
                <div>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    {generatedCoverLetter.split('\n').map((p, i) => (
                      <p key={i} className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-3">{p}</p>
                    ))}
                  </div>
                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={() => { navigator.clipboard.writeText(generatedCoverLetter); showToast("Copied to clipboard!", "success"); }}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-slate-900 text-white hover:bg-blue-600 dark:bg-white dark:text-slate-900 dark:hover:bg-blue-500 dark:hover:text-white transition-all"
                    >
                      <FileText className="w-4 h-4" />
                      Copy to Clipboard
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

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
