"use client";
import React from "react";
import { Briefcase, CheckCircle2, UploadCloud, CheckCircle, MapPin, Sparkles, Target, LineChart, Loader2, Check } from "lucide-react";
import { SectionCard } from "@/components/ui/SectionCard";
import { TagInput } from "@/components/ui/TagInput";
import { Toggle } from "@/components/ui/Toggle";
import { Preferences, ResumeProfile, Toast, DEFAULT_PREFERENCES, JOB_TYPES, INDUSTRIES, CURRENCIES } from "@/types";

interface PreferencesTabProps {
  prefs: Preferences;
  setPrefs: React.Dispatch<React.SetStateAction<Preferences>>;
  updatePref: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
  handleSavePrefs: () => void;
  resumeProfile: ResumeProfile | null;
  setResumeProfile: (val: ResumeProfile | null) => void;
  isUploadingResume: boolean;
  resumeFileName: string | null;
  setResumeFileName: (val: string | null) => void;
  handleResumeUpload: (file: File) => void;
  handleDrop: (e: React.DragEvent) => void;
  isDragging: boolean;
  setIsDragging: (val: boolean) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  showToast: (message: string, type?: Toast["type"]) => void;
}

export function PreferencesTab({
  prefs,
  setPrefs,
  updatePref,
  handleSavePrefs,
  resumeProfile,
  setResumeProfile,
  isUploadingResume,
  resumeFileName,
  setResumeFileName,
  handleResumeUpload,
  handleDrop,
  isDragging,
  setIsDragging,
  fileInputRef,
  showToast,
}: PreferencesTabProps) {
  return (
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
  );
}
