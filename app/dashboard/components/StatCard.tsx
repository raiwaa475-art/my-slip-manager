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
    indigo: "from-indigo-600/10 to-indigo-600/5 dark:from-indigo-600/20 dark:to-indigo-600/5 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    pink: "from-pink-600/10 to-pink-600/5 dark:from-pink-600/20 dark:to-pink-600/5 text-pink-600 dark:text-pink-400 border-pink-500/20",
    emerald: "from-emerald-600/10 to-emerald-600/5 dark:from-emerald-600/20 dark:to-emerald-600/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  };

  return (
    <div className={cn(
      "glass rounded-[2rem] p-5 md:p-8 bg-gradient-to-br border backdrop-blur-xl relative overflow-hidden group hover:scale-[1.02] transition-all duration-300", 
      colorMap[color], 
      className
    )}>
       {/* Background Decoration */}
       <div className="absolute -right-4 -top-4 w-24 h-24 bg-current opacity-[0.03] rounded-full blur-2xl group-hover:opacity-[0.07] transition-opacity" />
       
       <div className="flex justify-between items-start mb-4 md:mb-8 relative z-10">
          <div className="p-3 md:p-4 rounded-2xl bg-white/60 dark:bg-black/20 shadow-sm backdrop-blur-md transition-transform group-hover:scale-110">
            {icon}
          </div>
          <div className={cn(
            "flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] md:text-[11px] font-black uppercase tracking-wider",
            isNegative ? "bg-pink-500/20 text-pink-600 dark:text-pink-400" : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
          )}>
             {isNegative ? <ArrowDownRight className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
             <span className="hidden xs:inline">{isNegative ? "EXPENSE" : "INCOME"}</span>
          </div>
       </div>
       
       <div className="space-y-1 relative z-10">
          <p className="text-[11px] md:text-sm font-bold text-muted uppercase tracking-widest opacity-70 group-hover:opacity-100 transition-opacity">{title}</p>
          <p className="text-2xl md:text-4xl font-black text-foreground tracking-tighter group-hover:translate-x-1 transition-transform">{value}</p>
       </div>
       
       <div className="mt-4 md:mt-6 flex items-center gap-2 relative z-10">
          <div className="h-px flex-1 bg-current opacity-10" />
          <p className="text-[10px] md:text-xs text-muted font-black uppercase tracking-tight opacity-60 group-hover:opacity-90 transition-opacity whitespace-nowrap">{trend}</p>
       </div>
    </div>
  );
}
