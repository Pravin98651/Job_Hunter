import React from "react";

/* ───────────────────────────── Core Types ───────────────────────────── */

export interface Job {
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

export type AppStatus = "bookmarked" | "applied" | "interviewing" | "rejected" | "offer";

export interface TrackedApp {
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

export interface Preferences {
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

export interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

export interface ResumeProfile {
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

export interface RewriteSuggestion {
  original_concept: string;
  suggested_bullet: string;
  reasoning: string;
}

export interface OptimizationResult {
  missing_keywords: string[];
  matched_keywords: string[];
  tailored_summary: string;
  bullet_suggestions: RewriteSuggestion[];
}

/* ───────────────────────────── Constants ───────────────────────────── */

export const KANBAN_COLUMNS: { key: AppStatus; label: string; color: string; icon: React.ReactNode }[] = [];
// Note: KANBAN_COLUMNS with JSX icons are defined in the components that use them,
// because this file is a pure types/constants file.

export const DEFAULT_PREFERENCES: Preferences = {
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

export const JOB_TYPES = ["Full-time", "Part-time", "Contract", "Freelance", "Internship"];
export const INDUSTRIES = ["Tech", "Finance", "Healthcare", "Education", "E-commerce", "AI/ML", "SaaS", "Consulting", "Media", "Government"];
export const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "INR", "JPY", "SGD"];
export const FILTER_TIERS = [
  { label: "All", min: 0 },
  { label: "90%+", min: 90 },
  { label: "75%+", min: 75 },
  { label: "50%+", min: 50 },
] as const;

/* ───────────────────────────── Analytics Types ───────────────────────────── */

export interface ScoreTrend {
  date: string;
  avgScore: number;
  count: number;
}

export interface SkillGap {
  skill: string;
  count: number;
}

export interface PipelineStats {
  bookmarked: number;
  applied: number;
  interviewing: number;
  rejected: number;
  offer: number;
  total: number;
  conversionRate: number;
}

export interface SourceStat {
  source: string;
  count: number;
}

/* ───────────────────────────── Interview Types ───────────────────────────── */

export interface InterviewQuestion {
  question: string;
  type: string;
  tip: string;
}

export interface CompanyBrief {
  overview: string;
  culture: string;
  recentNews: string[];
  interviewTips: string[];
  glassdoorSentiment: string;
}

export interface MockInterviewSession {
  session_id: string;
  job_title: string;
  company: string;
  overall_score: number | null;
  summary: string | null;
  qa_count: number;
  created_at: string;
}

export interface MockInterviewQA {
  id: string;
  question: string;
  user_answer: string;
  feedback: string;
  score: number;
  created_at: string;
}
