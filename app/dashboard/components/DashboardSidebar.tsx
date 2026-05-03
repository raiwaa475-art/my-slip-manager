"use client";

import { Wallet, Scan, Plus, Trash2, LogOut, User as UserIcon } from "lucide-react";
import { useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "../../components/ui/ThemeToggle";
import { User, Dashboard } from "../../../types";
import { cn } from "@/lib/utils";

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
  const supabase = useMemo(() => createClient(), []);
  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-border flex-col p-6 gap-8 bg-card sticky top-0 h-screen">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center relative">
              <Image src="/logo.png" alt="Logo" fill className="object-cover" />
           </div>
           <span className="font-black text-xl tracking-tighter text-foreground">FINANCE.AI</span>
        </div>

        <nav className="flex-1 flex flex-col gap-2 w-full overflow-y-auto pr-2 custom-scrollbar">
           <Link href="/" className="flex items-center gap-4 p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-muted hover:text-foreground transition-all shrink-0">
              <Scan className="w-6 h-6" />
              <span className="font-medium">สแกนสลิป</span>
           </Link>
           <div className="mt-4 mb-2 px-3 text-[10px] font-black text-muted uppercase tracking-widest">แดชบอร์ดของคุณ</div>
           <div className="flex flex-col gap-1">
              {dashboards.map(dash => (
                <div key={dash.id} className="group flex items-center gap-2">
                  <button 
                    onClick={() => setActiveDashboard(dash)}
                    className={cn(
                      "flex-1 flex items-center gap-3 p-3 rounded-xl transition-all text-left",
                      activeDashboard?.id === dash.id 
                        ? "bg-accent/10 text-accent border border-accent/20" 
                        : "text-muted hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground border border-transparent"
                    )}
                  >
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      activeDashboard?.id === dash.id ? "bg-accent animate-pulse" : "bg-muted/40"
                    )} />
                    <span className={cn("font-bold text-sm truncate", activeDashboard?.id === dash.id ? "" : "font-medium")}>
                      {dash.name}
                    </span>
                  </button>
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity pr-1">
                    {dash.created_by === user.id ? (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteDashboard(dash.id); }}
                        className="p-1.5 text-muted hover:text-red-500 rounded-lg hover:bg-red-500/10 transition-colors"
                        title="ลบแดชบอร์ด"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleLeaveDashboard(dash.id); }}
                        className="p-1.5 text-muted hover:text-amber-500 rounded-lg hover:bg-amber-500/10 transition-colors"
                        title="ออกจากแดชบอร์ด"
                      >
                        <LogOut className="w-3.5 h-3.5 rotate-180" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button 
                onClick={() => setSetupMode("choose")}
                className="flex items-center gap-3 p-3 rounded-xl text-indigo-500 hover:bg-indigo-500/10 transition-all border border-dashed border-indigo-500/30 mt-2"
              >
                <Plus className="w-5 h-5" />
                <span className="font-bold text-sm">สร้าง/เข้าร่วมใหม่</span>
              </button>
           </div>
        </nav>
        
        <div className="space-y-4 pt-6 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center overflow-hidden border border-indigo-500/20 relative">
              {user.user_metadata?.avatar_url ? (
                <Image 
                  src={user.user_metadata.avatar_url} 
                  alt="avatar" 
                  fill
                  className="object-cover" 
                />
              ) : (
                <UserIcon className="w-4 h-4 text-indigo-500" />
              )}
            </div>
            <div className="flex flex-col truncate">
              <span className="text-xs font-bold truncate">{user.user_metadata?.full_name || user.email}</span>
              <button 
                onClick={() => supabase.auth.signOut()}
                className="text-[10px] text-muted hover:text-red-500 flex items-center gap-1 font-bold"
              >
                <LogOut className="w-3 h-3" /> ออกจากระบบ
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <span className="text-sm font-medium text-muted">เปลี่ยนธีม</span>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-card/80 backdrop-blur-xl border-b border-border z-50 flex items-center justify-between px-6">
        <div className="flex items-center gap-3 overflow-hidden">
           <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center relative shrink-0 shadow-lg shadow-accent/20">
              <Image src="/logo.png" alt="Logo" fill className="object-cover" />
           </div>
           <div className="flex flex-col overflow-hidden">
              <span className="font-black text-[10px] tracking-tighter opacity-50 uppercase leading-none mb-1">FINANCE.AI</span>
              <span className="font-black text-sm truncate text-foreground leading-none">{activeDashboard?.name || "แดชบอร์ด"}</span>
           </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center border border-accent/20 overflow-hidden relative">
             {user.user_metadata?.avatar_url ? (
               <Image 
                 src={user.user_metadata.avatar_url} 
                 alt="avatar" 
                 fill
                 className="object-cover" 
               />
             ) : (
               <UserIcon className="w-4 h-4 text-accent" />
             )}
          </div>
        </div>
      </div>
    </>
  );
}
