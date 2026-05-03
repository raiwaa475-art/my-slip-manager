"use client";

import { LayoutDashboard, Scan, Receipt, Menu, Plus, LogOut } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Dashboard, User } from "../../../types";
import { ThemeToggle } from "../../components/ui/ThemeToggle";
import { createClient } from "@/lib/supabase/client";

interface BottomNavProps {
  user: User;
  activeDashboard: Dashboard | null;
  dashboards: Dashboard[];
  setActiveDashboard: (dash: Dashboard) => void;
  setSetupMode: (mode: "choose" | "create" | "join" | null) => void;
}

export function BottomNav({ 
  user, 
  activeDashboard, 
  dashboards, 
  setActiveDashboard, 
  setSetupMode
}: BottomNavProps) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const supabase = createClient();

  const navItems = [
    { 
      label: "ภาพรวม", 
      icon: LayoutDashboard, 
      href: "/dashboard",
      active: pathname === "/dashboard" && !isMenuOpen,
      onClick: () => {
        if (pathname === "/dashboard") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }
    },
    { 
      label: "รายการ", 
      icon: Receipt, 
      href: "#transactions",
      active: false,
      onClick: () => {
        const el = document.getElementById('transaction-list');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }
    },
    { 
      label: "สแกน", 
      icon: Scan, 
      href: "/",
      isAction: true 
    },
    { 
      label: "สลับบอร์ด", 
      icon: Plus, 
      href: "#",
      active: false,
      onClick: () => setSetupMode("choose")
    },
    { 
      label: "เพิ่มเติม", 
      icon: Menu, 
      href: "#",
      active: isMenuOpen,
      onClick: () => setIsMenuOpen(!isMenuOpen)
    }
  ];

  return (
    <>
      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60] md:hidden transition-all duration-300">
          <div className="absolute bottom-20 left-4 right-4 bg-card border border-border rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10">
            <div className="flex items-center gap-4 mb-6 pb-4 border-b border-border">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center overflow-hidden border border-accent/20 relative">
                {user.user_metadata?.avatar_url ? (
                  <Image 
                    src={user.user_metadata.avatar_url} 
                    alt="avatar" 
                    fill
                    className="object-cover" 
                  />
                ) : (
                  <div className="text-accent font-bold">{user.email?.[0].toUpperCase()}</div>
                )}
              </div>
              <div className="flex flex-col">
                <span className="font-bold">{user.user_metadata?.full_name || user.email}</span>
                <span className="text-xs text-muted">เข้าใช้งานเมื่อ {new Date().toLocaleDateString('th-TH')}</span>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <div className="text-[10px] font-black text-muted uppercase tracking-widest mb-3">แดชบอร์ดของคุณ</div>
                <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                  {dashboards.map(dash => (
                    <button 
                      key={dash.id}
                      onClick={() => { setActiveDashboard(dash); setIsMenuOpen(false); }}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl transition-all text-left w-full",
                        activeDashboard?.id === dash.id 
                          ? "bg-accent/10 text-accent border border-accent/20" 
                          : "hover:bg-black/5 dark:hover:bg-white/5 border border-transparent"
                      )}
                    >
                      <div className={cn("w-2 h-2 rounded-full", activeDashboard?.id === dash.id ? "bg-accent" : "bg-muted/40")} />
                      <span className="font-bold text-sm truncate">{dash.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-4 border-t border-border">
                <div className="flex items-center justify-between p-2">
                   <div className="flex items-center gap-3">
                      <ThemeToggle />
                      <span className="font-bold text-sm">เปลี่ยนธีม</span>
                   </div>
                </div>
                <button 
                  onClick={() => supabase.auth.signOut()}
                  className="flex items-center gap-3 p-3 rounded-xl text-red-500 hover:bg-red-500/10 transition-all w-full"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-bold text-sm">ออกจากระบบ</span>
                </button>
              </div>
            </div>
            
            <button 
              onClick={() => setIsMenuOpen(false)}
              className="absolute top-4 right-4 p-2 text-muted hover:text-foreground"
            >
              <Plus className="w-6 h-6 rotate-45" />
            </button>
          </div>
        </div>
      )}

      {/* Bottom Nav Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-card/80 backdrop-blur-xl border-t border-border z-[70] px-4 flex items-center justify-between pb-safe">
        {navItems.map((item, i) => {
          if (item.isAction) {
            return (
              <Link 
                key={i}
                href={item.href}
                className="relative -top-6 w-14 h-14 bg-accent rounded-2xl flex items-center justify-center text-white shadow-lg shadow-accent/40 active:scale-95 transition-transform"
              >
                <item.icon className="w-7 h-7" />
              </Link>
            );
          }
          
          const Content = (
            <div className={cn(
              "flex flex-col items-center gap-1 transition-all duration-300",
              item.active ? "text-accent" : "text-muted hover:text-foreground"
            )}>
              <item.icon className={cn("w-6 h-6", item.active && "animate-pulse")} />
              <span className="text-[10px] font-bold">{item.label}</span>
              {item.active && <div className="w-1 h-1 bg-accent rounded-full mt-0.5" />}
            </div>
          );

          if (item.onClick) {
            return (
              <button key={i} onClick={item.onClick} className="flex-1">
                {Content}
              </button>
            );
          }

          return (
            <Link key={i} href={item.href} className="flex-1">
              {Content}
            </Link>
          );
        })}
      </div>
    </>
  );
}
