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
    fetch('http://127.0.0.1:8000/jobs/')
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
    fetch('http://127.0.0.1:8000/jobs/search', {
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
        fetch('http://127.0.0.1:8000/jobs/')
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
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50 via-slate-50 to-white dark:from-slate-900 dark:via-slate-950 dark:to-black p-4 sm:p-8 font-sans selection:bg-blue-500/30">
      <div className="max-w-5xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-slate-400 tracking-tight">
              Job Hunt AI
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">
              Your autonomous AI career agent.
            </p>
          </div>
          <div className="flex bg-slate-200/50 dark:bg-slate-800/50 backdrop-blur-md rounded-full p-1 shadow-inner border border-white/20 dark:border-white/5">
            <button 
              onClick={() => setActiveTab('matches')}
              className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${activeTab === 'matches' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm scale-100' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white scale-95'}`}
            >
              High Matches
            </button>
            <button 
              onClick={() => setActiveTab('preferences')}
              className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${activeTab === 'preferences' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm scale-100' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white scale-95'}`}
            >
              Preferences
            </button>
          </div>
        </header>

        {activeTab === 'matches' && (
          <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/50 dark:border-white/10 p-4 sm:p-6 rounded-3xl shadow-sm">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Recommended Roles</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Based on your AI semantic profile</p>
              </div>
              <div className="flex gap-3 items-center">
                <span className="flex items-center gap-1.5 text-xs bg-emerald-100/80 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 px-3 py-1.5 rounded-full font-bold uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Auto-sync On
                </span>
                <button 
                  onClick={handleSearch} 
                  disabled={isLoading}
                  className="text-sm bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-blue-600 dark:hover:bg-blue-500 px-5 py-2.5 rounded-full font-bold shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50"
                >
                  {isLoading ? 'Scanning...' : 'Trigger Scrape'}
                </button>
              </div>
            </div>
            
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
                <div className="h-64 bg-white/40 dark:bg-slate-800/40 backdrop-blur-md rounded-3xl border border-white/20"></div>
                <div className="h-64 bg-white/40 dark:bg-slate-800/40 backdrop-blur-md rounded-3xl border border-white/20"></div>
              </div>
            ) : jobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-16 bg-white/30 dark:bg-slate-900/30 backdrop-blur-xl rounded-3xl border border-white/40 dark:border-white/10 shadow-sm text-center">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">No scored jobs found yet</h3>
                <p className="text-slate-500 mt-2 max-w-md">Trigger a scrape to send the LangGraph agent out to find and evaluate roles for you.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {jobs.map((job, idx) => (
                  <JobCard key={idx} {...job} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'preferences' && (
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl p-8 rounded-3xl border border-white/50 dark:border-white/10 shadow-xl shadow-slate-200/50 dark:shadow-black/50 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-8 tracking-tight">Agent Preferences</h2>
            <form className="flex flex-col gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Target Job Title</label>
                <input type="text" className="w-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-0 ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-blue-500 rounded-xl p-3.5 transition-shadow" placeholder="e.g. AI Engineer, Data Scientist" defaultValue="AI Engineer" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Location</label>
                  <input type="text" className="w-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-0 ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-blue-500 rounded-xl p-3.5 transition-shadow" placeholder="e.g. Remote, New York" defaultValue="Remote" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Minimum Salary (USD)</label>
                  <input type="number" className="w-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-0 ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-blue-500 rounded-xl p-3.5 transition-shadow" defaultValue="120000" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Must-have Skills (comma separated)</label>
                <input type="text" className="w-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-0 ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-blue-500 rounded-xl p-3.5 transition-shadow" placeholder="Python, FastAPI, LangChain" defaultValue="Python, React, Postgres, LLMs" />
              </div>
              <div className="pt-4 mt-4 border-t border-slate-200/50 dark:border-slate-700/50 flex justify-end">
                <button type="button" className="bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white font-bold py-3 px-8 rounded-full transition-all hover:shadow-lg active:scale-95">
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
