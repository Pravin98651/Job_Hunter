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
    fetch('http://localhost:8000/jobs/')
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
    fetch('http://localhost:8000/jobs/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: "AI Engineer",
        location: "Remote",
        user_id: "00000000-0000-0000-0000-000000000000"
      })
    }).then(res => res.json())
      .then(data => alert(data.status))
      .catch(err => console.error(err));
  };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Job Hunt AI</h1>
            <p className="text-slate-500 mt-1">Your autonomous job searching agent.</p>
          </div>
          <div className="flex bg-white dark:bg-slate-900 rounded-lg p-1 shadow-sm border">
            <button 
              onClick={() => setActiveTab('matches')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'matches' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              High Matches
            </button>
            <button 
              onClick={() => setActiveTab('preferences')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'preferences' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              Preferences
            </button>
          </div>
        </header>

        {activeTab === 'matches' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Latest Matches</h2>
              <div className="flex gap-2 items-center">
                <button onClick={handleSearch} className="text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded-full font-medium transition">
                  Trigger Scrape
                </button>
                <span className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">Auto-scraping Active</span>
              </div>
            </div>
            
            {isLoading ? (
              <div className="animate-pulse flex flex-col gap-4">
                <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
              </div>
            ) : jobs.length === 0 ? (
              <div className="text-center p-12 bg-white dark:bg-slate-900 rounded-xl border border-dashed">
                <p className="text-slate-500">No scored jobs found yet. Trigger a scrape to populate data.</p>
              </div>
            ) : (
              jobs.map((job, idx) => (
                <JobCard key={idx} {...job} />
              ))
            )}
          </div>
        )}

        {activeTab === 'preferences' && (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border shadow-sm">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-6">Agent Preferences</h2>
            <form className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Target Job Title</label>
                <input type="text" className="w-full border rounded-md p-2 dark:bg-slate-800 dark:border-slate-700" placeholder="e.g. AI Engineer, Data Scientist" defaultValue="AI Engineer" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Location</label>
                  <input type="text" className="w-full border rounded-md p-2 dark:bg-slate-800 dark:border-slate-700" placeholder="e.g. Remote, New York" defaultValue="Remote" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Minimum Salary (USD)</label>
                  <input type="number" className="w-full border rounded-md p-2 dark:bg-slate-800 dark:border-slate-700" defaultValue="120000" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Must-have Skills (comma separated)</label>
                <input type="text" className="w-full border rounded-md p-2 dark:bg-slate-800 dark:border-slate-700" placeholder="Python, FastAPI, LangChain" defaultValue="Python, React, Postgres, LLMs" />
              </div>
              <button type="button" className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition self-start">
                Update Preferences
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
