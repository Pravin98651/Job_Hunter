import React from "react";

export function SectionCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white/60 dark:bg-slate-900/50 backdrop-blur-2xl border border-white/60 dark:border-white/[0.06] rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300 relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent dark:from-white/[0.03] pointer-events-none" />
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-200/40 dark:border-blue-500/20">
            {icon}
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white tracking-tight">
            {title}
          </h3>
        </div>
        {children}
      </div>
    </div>
  );
}
