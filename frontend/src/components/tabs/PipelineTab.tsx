"use client";
import React from "react";
import { LayoutDashboard, FileText, XCircle, Bookmark, CheckCircle2, Presentation, Sparkles } from "lucide-react";
import { TrackedApp, AppStatus, Toast } from "@/types";

const KANBAN_COLUMNS: { key: AppStatus; label: string; color: string; icon: React.ReactNode }[] = [
  { key: "bookmarked", label: "Bookmarked", color: "slate", icon: <Bookmark className="w-4 h-4" /> },
  { key: "applied", label: "Applied", color: "blue", icon: <CheckCircle2 className="w-4 h-4" /> },
  { key: "interviewing", label: "Interviewing", color: "amber", icon: <Presentation className="w-4 h-4" /> },
  { key: "rejected", label: "Rejected", color: "rose", icon: <XCircle className="w-4 h-4" /> },
  { key: "offer", label: "Offer 🎉", color: "emerald", icon: <Sparkles className="w-4 h-4" /> },
];

interface PipelineTabProps {
  isLoadingPipeline: boolean;
  trackedApps: TrackedApp[];
  handleUpdateStatus: (appId: string, status: AppStatus) => void;
  handleRemoveTrack: (appId: string) => void;
  handleAutoFill: (app: TrackedApp) => void;
  handleGenerateCoverLetter: (app: TrackedApp) => void;
  coverLetterModal: TrackedApp | null;
  setCoverLetterModal: (app: TrackedApp | null) => void;
  generatedCoverLetter: string | null;
  setGeneratedCoverLetter: (letter: string | null) => void;
  isGeneratingCL: boolean;
  showToast: (message: string, type?: Toast["type"]) => void;
}

export function PipelineTab({
  isLoadingPipeline,
  trackedApps,
  handleUpdateStatus,
  handleRemoveTrack,
  handleAutoFill,
  handleGenerateCoverLetter,
  coverLetterModal,
  setCoverLetterModal,
  generatedCoverLetter,
  setGeneratedCoverLetter,
  isGeneratingCL,
  showToast,
}: PipelineTabProps) {
  return (
    <div className="animate-[fadeUp_0.5s_ease-out]">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground tracking-tight">Application Pipeline</h2>
        <p className="text-sm text-muted-foreground mt-1">Track your applications through the hiring process. Bookmark jobs from Matches to get started.</p>
      </div>

      {isLoadingPipeline ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
        </div>
      ) : trackedApps.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <LayoutDashboard className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold text-foreground">No tracked applications</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">Go to the Matches tab and click the bookmark icon on jobs you want to track.</p>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4">
          {KANBAN_COLUMNS.map((col) => {
            const colApps = trackedApps.filter((a) => a.status === col.key);
            const colorMap: Record<string, { bg: string; border: string; text: string; badge: string }> = {
              slate:   { bg: "bg-slate-50 dark:bg-slate-900/50", border: "border-border", text: "text-slate-600 dark:text-muted-foreground", badge: "bg-slate-200 dark:bg-slate-700 text-foreground/90" },
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
                    <div key={app.applicationId} className="bg-card rounded-xl border border-border p-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-foreground truncate">{app.title}</h4>
                          <p className="text-xs text-muted-foreground truncate">{app.company} · {app.location}</p>
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
                        className="w-full text-xs font-semibold bg-muted/50 border border-border rounded-lg px-2 py-1.5 mb-3 outline-none focus:ring-2 focus:ring-blue-500/30"
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
                              className="text-[11px] font-semibold py-1.5 px-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                            >
                              Apply
                            </a>
                          </div>
                        )}
                        <button
                          onClick={() => handleRemoveTrack(app.applicationId)}
                          className="text-[11px] font-semibold py-1.5 px-2 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
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

      {/* ══════════════════════ COVER LETTER MODAL ══════════════════════ */}
      {coverLetterModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => { setCoverLetterModal(null); setGeneratedCoverLetter(null); }} />
          <div className="relative w-full max-w-3xl max-h-[85vh] flex flex-col bg-card rounded-3xl shadow-2xl border border-border overflow-hidden animate-[fadeUp_0.3s_ease-out]">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Cover Letter
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">{coverLetterModal.title} at {coverLetterModal.company}</p>
              </div>
              <button onClick={() => { setCoverLetterModal(null); setGeneratedCoverLetter(null); }} className="w-8 h-8 flex items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-slate-900 dark:hover:text-white transition-colors">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {isGeneratingCL ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full border-4 border-border" />
                    <div className="w-14 h-14 rounded-full border-4 border-blue-500 border-t-transparent animate-spin absolute top-0 left-0" />
                  </div>
                  <p className="mt-5 text-sm font-semibold text-slate-600 dark:text-slate-300">Generating with Gemini AI...</p>
                  <p className="text-xs text-muted-foreground mt-1">Crafting a personalized cover letter based on your resume</p>
                </div>
              ) : generatedCoverLetter ? (
                <div>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    {generatedCoverLetter.split('\n').map((p, i) => (
                      <p key={i} className="text-sm text-foreground/90 leading-relaxed mb-3">{p}</p>
                    ))}
                  </div>
                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={() => { navigator.clipboard.writeText(generatedCoverLetter); showToast("Copied to clipboard!", "success"); }}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
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
    </div>
  );
}
