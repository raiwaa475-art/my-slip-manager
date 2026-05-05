"use client";

import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  trend: string;
  icon: React.ReactNode;
  color: "indigo" | "pink" | "emerald";
  isNegative?: boolean;
  className?: string;
}

export function StatCard({ title, value, trend, icon, color, isNegative = false, className }: StatCardProps) {
  const colorMap: Record<string, string> = {
    indigo: "border-indigo-500/20 text-indigo-600 dark:text-indigo-400",
    pink: "border-pink-500/20 text-pink-600 dark:text-pink-400",
    emerald: "border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
  };

  const bgGradient: Record<string, string> = {
    indigo: "from-indigo-600/[0.05] to-transparent",
    pink: "from-pink-600/[0.05] to-transparent",
    emerald: "from-emerald-600/[0.05] to-transparent",
  };

  return (
    <div className={cn(
      "glass-card rounded-[2rem] md:rounded-[2.5rem] p-5 md:p-10 bg-gradient-to-br border transition-all duration-500 group hover:scale-[1.02] hover:-translate-y-1 relative overflow-hidden", 
      colorMap[color],
      bgGradient[color],
      className
    )}>
       {/* Background Decoration */}
       <div className="absolute -right-8 -top-8 w-48 h-48 bg-current opacity-[0.03] rounded-full blur-[60px] group-hover:opacity-[0.08] transition-opacity duration-700" />
       
       <div className="flex justify-between items-center mb-6 md:mb-8 relative z-10">
          <div className={cn(
            "w-10 h-10 md:w-16 md:h-16 rounded-xl md:rounded-[1.5rem] flex items-center justify-center shadow-sm transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 border",
            color === "indigo" ? "bg-indigo-500/10 border-indigo-500/20" :
            color === "emerald" ? "bg-emerald-500/10 border-emerald-500/20" :
            "bg-pink-500/10 border-pink-500/20"
          )}>
            {icon}
          </div>
          <div className={cn(
            "flex items-center gap-1 px-2 md:px-3 py-1 md:py-1.5 rounded-full text-[8px] md:text-[11px] font-black uppercase tracking-[0.1em] border",
            isNegative ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
          )}>
             {isNegative ? <ArrowDownRight className="w-3 h-3 md:w-4 md:h-4" /> : <ArrowUpRight className="w-3 h-3 md:w-4 md:h-4" />}
             <span>{isNegative ? "Out" : "In"}</span>
          </div>
       </div>
       
       <div className="space-y-1 md:space-y-3 relative z-10">
          <p className="text-[9px] md:text-xs font-black text-muted uppercase tracking-[0.2em] group-hover:opacity-100 transition-all leading-tight">{title}</p>
          <p className="text-xl md:text-5xl font-black text-foreground tracking-tighter group-hover:translate-x-1 transition-all duration-500 leading-none break-all">{value}</p>
       </div>
       
       <div className="mt-5 md:mt-8 pt-4 md:pt-6 border-t border-current opacity-20 relative z-10">
          <p className="text-[9px] md:text-[11px] text-muted font-black uppercase tracking-widest group-hover:opacity-100 transition-opacity flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            {trend}
          </p>
       </div>
    </div>
  );
}
