"use client";
import React from "react";
import { Sparkles, Briefcase } from "lucide-react";
import { InterviewQuestion, CompanyBrief } from "@/types";

interface InterviewTabProps {
  interviewJobTitle: string;
  setInterviewJobTitle: (val: string) => void;
  interviewCompany: string;
  setInterviewCompany: (val: string) => void;
  interviewJobDesc: string;
  setInterviewJobDesc: (val: string) => void;
  handleGenerateQuestions: () => void;
  handleGenerateBrief: () => void;
  isLoadingInterview: boolean;
  isLoadingBrief: boolean;
  interviewQuestions: InterviewQuestion[];
  companyBrief: CompanyBrief | null;
}

export function InterviewTab({
  interviewJobTitle,
  setInterviewJobTitle,
  interviewCompany,
  setInterviewCompany,
  interviewJobDesc,
  setInterviewJobDesc,
  handleGenerateQuestions,
  handleGenerateBrief,
  isLoadingInterview,
  isLoadingBrief,
  interviewQuestions,
  companyBrief,
}: InterviewTabProps) {
  return (
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
  );
}
