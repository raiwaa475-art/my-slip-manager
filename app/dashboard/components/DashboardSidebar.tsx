"use client";

import { Wallet, Scan, Plus, Trash2, LogOut, User as UserIcon, LayoutDashboard } from "lucide-react";
import { useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "../../components/ui/ThemeToggle";
import { User, Dashboard } from "../../../types";
import { cn } from "@/lib/utils";
import { useAuth } from "../../contexts/AuthContext";

interface DashboardSidebarProps {
  user: User;
  dashboards: Dashboard[];
  activeDashboard: Dashboard | null;
  setActiveDashboard: (dash: Dashboard) => void;
  setSetupMode: (mode: "choose" | "create" | "join" | null) => void;
  handleDeleteDashboard: (id: string) => void;
  handleLeaveDashboard: (id: string) => void;
}

export function DashboardSidebar({ 
  user, 
  dashboards, 
  activeDashboard, 
  setActiveDashboard, 
  setSetupMode, 
  handleDeleteDashboard, 
  handleLeaveDashboard
}: DashboardSidebarProps) {
  const { signOut } = useAuth();
  const pathname = usePathname();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-72 border-r border-border/50 flex-col p-8 gap-10 bg-white dark:bg-card/30 backdrop-blur-xl sticky top-0 h-screen z-50">
        <div className="flex items-center gap-4 px-2">
           <div className="w-12 h-12 rounded-2xl gradient-bg flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 relative group">
              <Wallet className="w-6 h-6 group-hover:scale-110 transition-transform" />
              <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
           </div>
           <div className="flex flex-col">
             <span className="font-black text-2xl tracking-tighter text-foreground leading-none uppercase">FINANCE</span>
             <span className="text-[10px] font-black tracking-[0.2em] text-accent uppercase">Intelligence</span>
           </div>
        </div>

        <nav className="flex-1 flex flex-col gap-3 w-full">
           <Link 
            href="/" 
            className={cn(
              "flex items-center gap-4 p-4 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98]",
              pathname === "/" 
                ? "bg-accent text-white shadow-xl shadow-accent/30" 
                : "hover:bg-accent/5 text-muted hover:text-accent"
            )}
           >
              <Scan className="w-6 h-6" />
              <span className="font-bold">สแกนสลิป</span>
           </Link>
           <Link 
            href="/dashboard" 
            className={cn(
              "flex items-center gap-4 p-4 rounded-2xl transition-all hover:translate-x-1",
              pathname.startsWith("/dashboard") && !pathname.includes("#settings")
                ? "bg-accent/10 text-accent border border-accent/20"
                : "hover:bg-accent/5 text-muted hover:text-accent"
            )}
           >
              <LayoutDashboard className="w-6 h-6" />
              <span className="font-medium">แดชบอร์ด</span>
           </Link>
           <Link href="/dashboard#settings" className="flex items-center gap-4 p-4 rounded-2xl hover:bg-accent/5 text-muted hover:text-accent transition-all hover:translate-x-1">
              <Plus className="w-6 h-6" />
              <span className="font-medium">การจัดการเงิน</span>
           </Link>

           <div className="mt-6 mb-2 px-4 text-[10px] font-black text-muted uppercase tracking-[0.2em]">แดชบอร์ดของคุณ</div>
           <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {dashboards.map(dash => (
                <div key={dash.id} className="group flex items-center gap-2">
                  <button 
                    onClick={() => setActiveDashboard(dash)}
                    className={cn(
                      "flex-1 flex items-center gap-3 p-3 rounded-xl transition-all text-left",
                      activeDashboard?.id === dash.id 
                        ? "bg-accent/10 dark:bg-white/5 border border-accent/20 shadow-sm text-accent" 
                        : "text-muted hover:bg-accent/5 hover:text-foreground"
                    )}
                  >
                    <div className={cn(
                      "w-2 h-2 rounded-full shrink-0",
                      activeDashboard?.id === dash.id ? "bg-accent animate-pulse" : "bg-muted/30"
                    )} />
                    <span className={cn("font-bold text-xs truncate", activeDashboard?.id === dash.id ? "" : "font-medium")}>
                      {dash.name}
                    </span>
                  </button>
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity pr-1">
                    {dash.created_by === user.id ? (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteDashboard(dash.id); }}
                        className="p-1.5 text-muted hover:text-red-500 rounded-lg hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleLeaveDashboard(dash.id); }}
                        className="p-1.5 text-muted hover:text-amber-500 rounded-lg hover:bg-amber-500/10 transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5 rotate-180" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button 
                onClick={() => setSetupMode("choose")}
                className="flex items-center gap-3 p-3 rounded-xl text-accent hover:bg-accent/5 transition-all border border-dashed border-accent/30 mt-2"
              >
                <Plus className="w-4 h-4" />
                <span className="font-bold text-xs">สร้าง/เข้าร่วมใหม่</span>
              </button>
           </div>
        </nav>
        
        <div className="space-y-6 pt-6 border-t border-border/50">
          <div className="flex items-center gap-4 p-3 rounded-2xl bg-slate-50 dark:bg-card border border-border/50 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center overflow-hidden border-2 border-accent/20 relative shrink-0">
              {user.user_metadata?.avatar_url ? (
                <Image src={user.user_metadata.avatar_url} alt="avatar" fill className="object-cover" sizes="40px" />
              ) : (
                <UserIcon className="w-5 h-5 text-accent" />
              )}
            </div>
            <div className="flex flex-col truncate flex-1">
              <span className="text-xs font-black truncate text-foreground">{user.user_metadata?.full_name || user.email}</span>
              <button onClick={signOut} className="text-[10px] text-red-500 hover:text-red-600 flex items-center gap-1 font-black uppercase tracking-wider transition-colors">
                <LogOut className="w-3 h-3" /> Sign Out
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between px-2">
            <span className="text-[10px] font-black text-muted uppercase tracking-widest">Appearance</span>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-card/80 backdrop-blur-xl border-b border-border/50 z-50 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Wallet className="w-6 h-6" />
           </div>
           <span className="font-black text-xl tracking-tighter uppercase">FINANCE</span>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <button onClick={signOut} className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 active:scale-90 transition-transform">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
}
