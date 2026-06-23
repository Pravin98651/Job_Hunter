"use client";
import React from "react";
import Link from "next/link";
import { ArrowRight, Brain, Zap, Briefcase, BarChart, FileText, CheckCircle2 } from "lucide-react";
import { ParticleConstellation } from "@/components/3d/Visualizations";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col selection:bg-primary/20 selection:text-primary">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <ParticleConstellation count={100} />
        {/* Glow behind the hero */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/20 rounded-full blur-[120px] opacity-50 dark:opacity-40" />
      </div>

      {/* ── Navbar ── */}
      <div className="relative z-50 flex justify-center pt-6 px-4">
        <nav className="bg-card shadow-md backdrop-blur-2xl border border-border rounded-full px-6 py-3 flex items-center justify-between w-full max-w-5xl transition-all hover:bg-card/80 hover:border-primary/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-[0_0_15px_var(--primary)]">
              <Brain className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-heading font-black text-lg tracking-tight text-foreground">
              Antigravity<span className="text-primary">AI</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard"
              className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
            >
              Sign In
            </Link>
            <Link 
              href="/dashboard"
              className="text-sm font-bold bg-primary text-primary-foreground px-5 py-2 rounded-full hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all shadow-md shadow-primary/20 flex items-center gap-2"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </nav>
      </div>

      {/* ── Main Content ── */}
      <main className="relative z-10 flex-1 flex flex-col items-center pt-24 pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        
        {/* Hero Section */}
        <section className="text-center max-w-4xl mx-auto animate-[fadeUp_0.8s_ease-out_forwards]">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-primary/10 text-primary mb-8 ring-1 ring-primary/20 shadow-inner">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_var(--primary)]" />
            Next-Gen Career Agent
          </div>
          
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-heading font-black tracking-tight leading-[1.05] text-foreground mb-8 drop-shadow-sm">
            Automate your job hunt with{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-indigo-500 to-accent">
              Precision AI.
            </span>
          </h1>
          
          <p className="text-lg sm:text-xl text-muted-foreground font-medium mb-12 max-w-2xl mx-auto leading-relaxed">
            Stop endlessly scrolling job boards. Our autonomous agent scrapes the web, scores roles against your exact resume, and generates tailored cover letters instantly.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/dashboard"
              className="w-full sm:w-auto px-8 py-4 rounded-full text-base font-bold bg-foreground text-background hover:bg-foreground/90 hover:scale-105 active:scale-95 transition-all shadow-xl flex items-center justify-center gap-2"
            >
              <Zap className="w-5 h-5" />
              Launch Dashboard
            </Link>
            <Link 
              href="/dashboard"
              className="w-full sm:w-auto px-8 py-4 rounded-full text-base font-bold bg-card border border-border text-foreground hover:bg-muted/50 hover:border-primary/50 transition-all flex items-center justify-center"
            >
              View Live Demo
            </Link>
          </div>
        </section>

        {/* ── Bento Grid Features ── */}
        <section className="w-full mt-32 animate-[fadeUp_1s_ease-out_0.2s_both]">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-heading font-black text-foreground">Powered by Gemini AI</h2>
            <p className="text-muted-foreground mt-2 font-medium">Everything you need to land your dream role.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[250px]">
            
            {/* Feature 1 (Large) */}
            <div className="md:col-span-2 row-span-1 rounded-3xl bg-card shadow-sm border border-border p-8 flex flex-col justify-between group overflow-hidden relative hover:border-primary/50 transition-colors">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[60px] translate-x-1/3 -translate-y-1/3 group-hover:bg-primary/20 transition-colors" />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6 border border-primary/20">
                  <Brain className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-3">Semantic Resume Matching</h3>
                <p className="text-muted-foreground font-medium max-w-md">
                  We don't just look for keywords. Our LLM pipeline understands the deep semantic meaning of your experience and scores it against job requirements.
                </p>
              </div>
            </div>

            {/* Feature 2 (Small) */}
            <div className="md:col-span-1 row-span-1 rounded-3xl bg-card shadow-sm border border-border p-8 flex flex-col justify-between group overflow-hidden relative hover:border-violet-500/50 transition-colors">
              <div className="absolute bottom-0 right-0 w-48 h-48 bg-violet-500/10 rounded-full blur-[40px] translate-x-1/3 translate-y-1/3 group-hover:bg-violet-500/20 transition-colors" />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-violet-500/10 text-violet-500 flex items-center justify-center mb-6 border border-violet-500/20">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Tailored Cover Letters</h3>
                <p className="text-sm text-muted-foreground font-medium">
                  Generate hyper-personalized cover letters instantly using your exact profile.
                </p>
              </div>
            </div>

            {/* Feature 3 (Small) */}
            <div className="md:col-span-1 row-span-1 rounded-3xl bg-card shadow-sm border border-border p-8 flex flex-col justify-between group overflow-hidden relative hover:border-emerald-500/50 transition-colors">
              <div className="absolute top-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-[40px] -translate-x-1/3 -translate-y-1/3 group-hover:bg-emerald-500/20 transition-colors" />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-6 border border-emerald-500/20">
                  <Briefcase className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Live Scraping</h3>
                <p className="text-sm text-muted-foreground font-medium">
                  Trigger a live scrape of LinkedIn and Indeed to find roles posted in the last 24 hours.
                </p>
              </div>
            </div>

            {/* Feature 4 (Large) */}
            <div className="md:col-span-2 row-span-1 rounded-3xl bg-card shadow-sm border border-border p-8 flex flex-col justify-between group overflow-hidden relative hover:border-blue-500/50 transition-colors">
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[60px] -translate-x-1/3 translate-y-1/3 group-hover:bg-blue-500/20 transition-colors" />
              <div className="relative z-10 flex items-start justify-between h-full">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-6 border border-blue-500/20">
                    <BarChart className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-3">Pipeline Analytics</h3>
                  <p className="text-muted-foreground font-medium max-w-md">
                    Track your conversion rates and identify skill gaps automatically based on the jobs you are scoring highly on.
                  </p>
                </div>
                
                {/* Mini decorative element */}
                <div className="hidden sm:flex flex-col gap-2 p-4 bg-background border border-border rounded-2xl shadow-sm rotate-3 group-hover:rotate-6 transition-transform">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg">
                    <CheckCircle2 className="w-3 h-3" /> Offer Received
                  </div>
                  <div className="h-2 w-24 bg-muted rounded-full"></div>
                  <div className="h-2 w-16 bg-muted rounded-full"></div>
                </div>
              </div>
            </div>

          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border bg-card py-8 px-4 text-center">
        <p className="text-sm font-semibold text-muted-foreground">
          © 2026 Antigravity AI Agency. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
