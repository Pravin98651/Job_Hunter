"use client";
import React, { useState, useEffect } from 'react';
import { JobCard } from '@/components/JobCard';

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

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'matches' | 'preferences'>('matches');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/jobs/')
      .then(res => res.json())
      .then(data => {
        setJobs(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch jobs:", err);
        setIsLoading(false);
      });
  }, []);

  const handleSearch = () => {
    setIsLoading(true);
    fetch('/api/jobs/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: "AI Engineer",
        location: "Remote",
        user_id: "00000000-0000-0000-0000-000000000000"
      })
    }).then(res => res.json())
      .then(data => {
        alert(data.status);
        // Refresh jobs
        fetch('/api/jobs/')
          .then(res => res.json())
          .then(data => setJobs(data))
          .finally(() => setIsLoading(false));
      })
      .catch(err => {
        console.error(err);
        setIsLoading(false);
      });
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50 via-white to-slate-100 dark:from-slate-900 dark:via-black dark:to-slate-950 p-4 sm:p-8 font-sans selection:bg-blue-500/30">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>
      <div className="max-w-5xl mx-auto relative z-10">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-6 pt-6">
          <div className="space-y-2">
            <h1 className="text-5xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-slate-900 via-slate-700 to-slate-500 dark:from-white dark:via-slate-200 dark:to-slate-500 tracking-tighter drop-shadow-sm">
              Job Hunt AI
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-lg tracking-wide">
              Your autonomous AI career agent.
            </p>
          </div>
          <div className="flex bg-slate-200/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-full p-1.5 shadow-inner border border-white/40 dark:border-white/5">
            <button 
              onClick={() => setActiveTab('matches')}
              className={`px-7 py-3 rounded-full text-sm font-bold transition-all duration-300 ${activeTab === 'matches' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-md scale-100' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white scale-95 hover:bg-white/20 dark:hover:bg-slate-700/50'}`}
            >
              High Matches
            </button>
            <button 
              onClick={() => setActiveTab('preferences')}
              className={`px-7 py-3 rounded-full text-sm font-bold transition-all duration-300 ${activeTab === 'preferences' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-md scale-100' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white scale-95 hover:bg-white/20 dark:hover:bg-slate-700/50'}`}
            >
              Preferences
            </button>
          </div>
        </header>

        {activeTab === 'matches' && (
          <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 bg-white/50 dark:bg-slate-900/50 backdrop-blur-2xl border border-white/60 dark:border-white/10 p-6 sm:px-8 sm:py-6 rounded-[28px] shadow-sm">
              <div>
                <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Recommended Roles</h2>
                <p className="text-[15px] font-medium text-slate-500 dark:text-slate-400 mt-1">Based on your AI semantic profile</p>
              </div>
              <div className="flex gap-4 items-center">
                <span className="flex items-center gap-2 text-xs bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 px-3.5 py-1.5 rounded-full font-extrabold uppercase tracking-widest shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Auto-sync
                </span>
                <button 
                  onClick={handleSearch} 
                  disabled={isLoading}
                  className="text-sm bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-blue-600 dark:hover:bg-blue-50 px-6 py-3 rounded-full font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:hover:translate-y-0 flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white dark:text-slate-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      Scanning...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                      Trigger Scrape
                    </>
                  )}
                </button>
              </div>
            </div>
            
            {isLoading ? (
              <div className="grid grid-cols-1 gap-8 animate-pulse">
                <div className="h-[300px] bg-white/40 dark:bg-slate-800/40 backdrop-blur-2xl rounded-[32px] border border-white/40 dark:border-white/5"></div>
                <div className="h-[300px] bg-white/40 dark:bg-slate-800/40 backdrop-blur-2xl rounded-[32px] border border-white/40 dark:border-white/5 opacity-70"></div>
              </div>
            ) : jobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 px-8 bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl rounded-[32px] border border-white/60 dark:border-white/10 shadow-sm text-center">
                <div className="w-20 h-20 bg-blue-50 dark:bg-blue-500/10 text-blue-500 dark:text-blue-400 rounded-full flex items-center justify-center mb-6 shadow-inner border border-blue-100 dark:border-blue-500/20">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">No scored jobs found yet</h3>
                <p className="text-[15px] text-slate-500 dark:text-slate-400 mt-3 max-w-md font-medium leading-relaxed">Trigger a scrape to send the LangGraph agent out to find and evaluate perfect roles for you.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-8">
                {jobs.map((job, idx) => (
                  <JobCard key={idx} {...job} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'preferences' && (
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-3xl p-10 rounded-[32px] border border-white/60 dark:border-white/10 shadow-2xl shadow-slate-200/50 dark:shadow-black/50 animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5 pointer-events-none"></div>
            <div className="relative z-10">
              <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-10 tracking-tight">Agent Preferences</h2>
              <form className="flex flex-col gap-8">
                <div>
                  <label className="block text-[15px] font-bold text-slate-700 dark:text-slate-200 mb-3">Target Job Title</label>
                  <input type="text" className="w-full bg-white/70 dark:bg-slate-800/70 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 rounded-2xl p-4 text-[15px] font-medium transition-all shadow-sm" placeholder="e.g. AI Engineer, Data Scientist" defaultValue="AI Engineer" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-[15px] font-bold text-slate-700 dark:text-slate-200 mb-3">Location</label>
                    <input type="text" className="w-full bg-white/70 dark:bg-slate-800/70 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 rounded-2xl p-4 text-[15px] font-medium transition-all shadow-sm" placeholder="e.g. Remote, New York" defaultValue="Remote" />
                  </div>
                  <div>
                    <label className="block text-[15px] font-bold text-slate-700 dark:text-slate-200 mb-3">Minimum Salary (USD)</label>
                    <input type="number" className="w-full bg-white/70 dark:bg-slate-800/70 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 rounded-2xl p-4 text-[15px] font-medium transition-all shadow-sm" defaultValue="120000" />
                  </div>
                </div>
                <div>
                  <label className="block text-[15px] font-bold text-slate-700 dark:text-slate-200 mb-3">Must-have Skills (comma separated)</label>
                  <input type="text" className="w-full bg-white/70 dark:bg-slate-800/70 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 rounded-2xl p-4 text-[15px] font-medium transition-all shadow-sm" placeholder="Python, FastAPI, LangChain" defaultValue="Python, React, Postgres, LLMs" />
                </div>
                <div className="pt-6 mt-4 border-t border-slate-200/50 dark:border-slate-700/50 flex justify-end">
                  <button type="button" className="bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white font-bold py-3.5 px-10 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95 text-[15px]">
                    Save Configuration
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
