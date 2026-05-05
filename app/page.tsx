"use client";

import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { 
  Upload, FileText, CheckCircle2, Loader2, 
  X, Coins, LayoutDashboard, Scan, Wallet, PiggyBank, 
  LogOut, Plus, FastForward, Save, CheckSquare, Square, Trash2,
  User as UserIcon
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "./components/ui/ThemeToggle";
import { createClient } from "@/lib/supabase/client";
import LoginButton from "@/app/components/LoginButton";
import { CATEGORIES } from "@/lib/constants";
import { useToast } from "./components/ui/Toast";


// Import Refactored Components
import { SlipRow } from "@/app/components/SlipRow";
import { SplitSettingsModal } from "@/app/components/SplitSettingsModal";
import { BulkSaveModal } from "@/app/components/BulkSaveModal";
import { DashboardSidebar } from "./dashboard/components/DashboardSidebar";
import { BottomNav } from "./dashboard/components/BottomNav";

import { useAuth } from "./contexts/AuthContext";
import { useSlips } from "./contexts/SlipContext";
import { SlipProvider } from "./contexts/SlipContext";

export default function Home() {
  return (
    <SlipProvider>
      <HomeContent />
    </SlipProvider>
  );
}

function HomeContent() {
  const { toast } = useToast();
  const { user, loading, dashboards, selectedDashboardId, setSelectedDashboardId, signOut } = useAuth();
  const { 
    slips, setSlips, isProcessingAll, isSavingAll,
    addManualSlip, handleFileUpload, updateSlip,
    selectAll, removeSelected, processAll, 
    saveAll 
  } = useSlips();

  const [showSaveToast, setShowSaveToast] = useState(false);
  const [members, setMembers] = useState<{ user_id: string }[]>([]);
  const [splitModalOpen, setSplitModalOpen] = useState<string | null>(null); // slip ID
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkCategory, setBulkCategory] = useState("อื่นๆ");
  const [bulkSplit, setBulkSplit] = useState(false);
  const [bulkSplitBetween, setBulkSplitBetween] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = useMemo(() => createClient(), []);

  const fetchMembers = useCallback(async (dashboardId: string) => {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      const tokenStr = localStorage.getItem('sb-vjbzujwtwshhrisazoyx-auth-token');
      let accessToken = anonKey;
      if (tokenStr) {
         try { accessToken = JSON.parse(tokenStr).access_token || anonKey; } catch (e) {}
      }

      const response = await fetch(`${supabaseUrl}/rest/v1/dashboard_users?dashboard_id=eq.${dashboardId}&select=user_id`, {
        headers: {
          'apikey': anonKey!,
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      setMembers(data || []);
    } catch (err) {
      console.error("Error fetching members:", err);
    }
  }, []);

  useEffect(() => {
    if (selectedDashboardId) {
      fetchMembers(selectedDashboardId);

      // Real-time for members list during scanning
      const memberChannel = supabase
        .channel(`scan-members-${selectedDashboardId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'dashboard_users',
            filter: `dashboard_id=eq.${selectedDashboardId}`
          },
          () => {
            console.log('👥 [Home] Members changed, refetching...');
            fetchMembers(selectedDashboardId);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(memberChannel);
      };
    }
  }, [selectedDashboardId, fetchMembers, supabase]);

  // Stats
  const stats = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    let todayTotal = 0;

    slips.forEach((slip) => {
      const date = slip.result.date;
      const amount = Number(slip.result.amount) || 0;
      if (date === today) {
        todayTotal += amount;
      }
    });

    return { todayTotal };
  }, [slips]);

  const handleProcessAll = async () => {
    if (slips.some(s => s.status === "error")) {
      toast("กรุณาลบรายการที่สแกนไม่สำเร็จออกก่อนสแกนใหม่", "info");
    }
    await processAll();
    if (slips.some(s => s.status === 'done' || s.status === 'pending')) {
        setShowSaveToast(true);
    }
  };

  const handleSaveAll = async () => {
    if (dashboards.length > 0 && !selectedDashboardId) {
      toast("กรุณาเลือกแดชบอร์ดที่จะบันทึก", "info");
      return;
    }
    await saveAll(bulkModalOpen ? bulkCategory : undefined, bulkModalOpen ? bulkSplit : undefined, bulkModalOpen ? bulkSplitBetween : undefined);
    setBulkModalOpen(false);
  };

  // Auto-enable split when opening modal for a split_bill dashboard
  const openBulkModal = () => {
    const activeDash = dashboards.find(d => d.id === selectedDashboardId);
    if (activeDash?.type === 'split_bill') {
      setBulkSplit(true);
      // Default to split between everyone in the dashboard (including user)
      setBulkSplitBetween(members.map(m => m.user_id));
    } else {
      setBulkSplit(false);
      setBulkSplitBetween([]);
    }
    setBulkModalOpen(true);
  };

  const selectedCount = slips.filter(s => s.selected).length;
  const doneSlips = useMemo(() => slips.filter(s => s.status === 'done'), [slips]);
  const totalAmount = useMemo(() => doneSlips.reduce((acc, s) => acc + s.result.amount, 0), [doneSlips]);
  const uniqueDates = useMemo(() => {
    const dates = doneSlips.map(s => s.result.date);
    return Array.from(new Set(dates)).sort();
  }, [doneSlips]);

  const bulkUpdateCategory = (category: string) => {
    setSlips(prev => prev.map(s => s.selected ? { ...s, result: { ...s.result, category } } : s));
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background items-center justify-center">
        <Loader2 className="w-12 h-12 text-accent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen mesh-gradient text-foreground transition-colors items-center justify-center p-4 md:p-6 overflow-hidden relative">
        {/* Decorative Blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/20 dark:bg-accent/10 rounded-full blur-[120px] animate-pulse-soft" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/20 dark:bg-purple-500/10 rounded-full blur-[120px] animate-pulse-soft" style={{ animationDelay: '2s' }} />
        
        <div className="max-w-md w-full glass-card rounded-[3rem] p-8 md:p-12 flex flex-col items-center text-center gap-10 shadow-2xl relative z-10 animate-float">
          <div className="relative">
             <div className="absolute inset-0 bg-accent/20 blur-2xl rounded-full" />
             <div className="w-24 h-24 rounded-[2rem] gradient-bg flex items-center justify-center text-white shadow-2xl relative">
               <Wallet className="w-12 h-12" />
             </div>
          </div>
          
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-black tracking-tight uppercase gradient-text">FINANCE.AI</h1>
            <div className="space-y-2">
              <p className="text-foreground font-bold text-lg">Smart Slip Management</p>
              <p className="text-muted text-sm leading-relaxed max-w-[280px] mx-auto">
                จัดการทุกสลิปการโอนของคุณด้วย AI อัจฉริยะ <br />
                บันทึก สรุป และวิเคราะห์ในที่เดียว
              </p>
            </div>
          </div>
          
          <div className="w-full space-y-6">
            <LoginButton />
            
            <div className="flex items-center gap-4 py-2">
              <div className="h-[1px] flex-1 bg-border" />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted">Customize Theme</span>
              <div className="h-[1px] flex-1 bg-border" />
            </div>
            
            <div className="flex justify-center">
              <ThemeToggle />
            </div>
          </div>

          <div className="pt-2 text-[10px] font-black text-muted uppercase tracking-widest">
            Trusted by modern spenders
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground transition-colors">
      <DashboardSidebar 
        user={user} 
        dashboards={dashboards} 
        activeDashboard={dashboards.find(d => d.id === selectedDashboardId) || null} 
        setActiveDashboard={(d) => setSelectedDashboardId(d.id)} 
        setSetupMode={() => {}} // Home page doesn't need setup mode logic here
        handleDeleteDashboard={() => {}} 
        handleLeaveDashboard={() => {}} 
      />

      <BottomNav 
        user={user} 
        dashboards={dashboards} 
        activeDashboard={dashboards.find(d => d.id === selectedDashboardId) || null} 
        setActiveDashboard={(d) => setSelectedDashboardId(d.id)} 
        setSetupMode={() => {}} 
      />

      <main className="flex-1 overflow-y-auto pt-16 pb-24 md:pt-0 md:pb-0 relative">
        <header className="sticky top-0 md:top-auto z-40 bg-background/60 md:bg-transparent backdrop-blur-md px-6 md:px-12 py-6 md:py-12">
          <div className="max-w-[1400px] mx-auto">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
              <div className="space-y-2">
                <h1 className="text-3xl md:text-5xl font-black gradient-text tracking-tighter uppercase leading-none">ระบบสแกนสลิป</h1>
                <div className="flex flex-wrap items-center gap-4 text-sm font-bold text-muted">
                  {dashboards.length > 0 && (
                    <div className="flex items-center gap-2 bg-card/50 border border-border/50 rounded-xl px-3 py-1.5 shadow-sm group hover:border-accent/50 transition-colors">
                      <LayoutDashboard className="w-4 h-4 text-accent" />
                      <select 
                        value={selectedDashboardId} 
                        onChange={(e) => setSelectedDashboardId(e.target.value)}
                        className="bg-transparent text-[11px] font-black uppercase tracking-wider outline-none cursor-pointer text-foreground pr-2"
                      >
                        {dashboards.map(d => (
                          <option key={d.id} value={d.id} className="bg-card text-foreground">
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="flex items-center gap-4">
                     <span className="flex items-center gap-2 py-1 px-3 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                       <Coins className="w-4 h-4" /> 
                       ฿{stats.todayTotal.toLocaleString()}
                     </span>
                     <span className="flex items-center gap-2 py-1 px-3 rounded-lg bg-accent/10 text-accent border border-accent/20">
                       <FileText className="w-4 h-4" /> 
                       {slips.length} ใบ
                     </span>
                  </div>
                </div>
              </div>
            
              <div className="flex items-center gap-3 w-full lg:w-auto">
                 <button onClick={addManualSlip} className="flex-1 md:flex-none flex items-center justify-center gap-2 p-3 rounded-2xl bg-card border border-border/50 hover:border-accent/50 transition-all text-foreground font-black text-xs px-6 uppercase tracking-wider shadow-sm">
                    <Plus className="w-4 h-4 text-accent" /> เพิ่มเอง
                 </button>
                 <button onClick={() => fileInputRef.current?.click()} className="p-3 rounded-2xl bg-card border border-border/50 hover:border-accent/50 transition-all text-foreground shadow-sm">
                    <Upload className="w-5 h-5" />
                 </button>
                 <div className="h-10 w-[1px] bg-border/50 mx-1 hidden md:block" />
                 <button onClick={handleProcessAll} disabled={isProcessingAll || slips.length === 0} className="flex-1 md:flex-none flex justify-center items-center gap-2 bg-accent hover:bg-accent/90 text-white disabled:opacity-30 px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-accent/20 active:scale-95">
                    {isProcessingAll ? <Loader2 className="w-5 h-5 animate-spin" /> : <FastForward className="w-5 h-5" />}
                    สแกนทั้งหมด
                 </button>
                 {slips.some(s => s.status === 'done') && (
                   <button onClick={openBulkModal} disabled={isSavingAll} className="flex-1 md:flex-none flex justify-center items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-30 px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/20 active:scale-95">
                      {isSavingAll ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                      บันทึก
                   </button>
                 )}
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-[1400px] mx-auto p-4 md:p-8 lg:p-12 xl:p-16 space-y-6 md:space-y-10 pb-32">
          {slips.length > 0 && (
            <div className="flex items-center justify-between bg-card p-3 rounded-2xl border border-border">
              <button onClick={selectAll} className="flex items-center gap-2 text-sm font-medium hover:text-indigo-500 transition-colors px-3 text-foreground">
                {slips.every(s => s.selected) ? <CheckSquare className="w-5 h-5 text-indigo-500" /> : <Square className="w-5 h-5 text-muted" />}
                เลือกทั้งหมด
              </button>
              {selectedCount > 0 && (
                <div className="flex items-center gap-4">
                   <span className="text-sm font-bold text-indigo-500">เลือกแล้ว {selectedCount} ใบ</span>
                   <button onClick={removeSelected} className="text-red-500 hover:text-red-400 p-2"><Trash2 className="w-5 h-5" /></button>
                </div>
              )}
            </div>
          )}

          {slips.length === 0 ? (
            <div 
              onClick={() => fileInputRef.current?.click()} 
              className="group mt-12 cursor-pointer glass-card rounded-[3rem] p-12 md:p-32 border-2 border-dashed border-accent/20 flex flex-col items-center gap-8 text-center hover:border-accent/50 hover:bg-accent/5 transition-all duration-500 relative overflow-hidden"
            >
               {/* Background Decorative Element */}
               <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-accent/10 transition-colors" />
               <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full -ml-32 -mb-32 blur-3xl group-hover:bg-purple-500/10 transition-colors" />

               <div className="w-24 h-24 rounded-3xl bg-accent/10 flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-inner">
                  <Upload className="w-12 h-12 text-accent" />
                </div>
                <div className="space-y-4 relative z-10">
                  <h2 className="text-2xl md:text-4xl font-black text-foreground tracking-tight">อัปโหลดสลิปเพื่อเริ่มบันทึก</h2>
                  <p className="text-muted text-sm md:text-lg max-w-md mx-auto leading-relaxed">
                    ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกรูปภาพสลิป <br />
                    <span className="text-accent/60 font-bold">(รองรับสูงสุด 20 รูปต่อครั้ง)</span>
                  </p>
                </div>
                
                <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-accent text-white font-black text-sm shadow-xl shadow-accent/30 group-hover:shadow-accent/50 transition-all">
                  <Plus className="w-5 h-5" /> เลือกไฟล์สลิป
                </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6 md:gap-8">
              {slips.map((slip, index) => (
                <SlipRow 
                  key={slip.id} 
                  slip={slip} 
                  index={index}
                  onOpenSplit={() => setSplitModalOpen(slip.id)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {(slips.some(s => s.status === 'done') || showSaveToast) && (
        <div className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-12 duration-500 w-full max-w-lg px-4">
           <div className="glass rounded-[2rem] p-4 md:p-6 flex items-center justify-between gap-4 border border-emerald-500/40 shadow-2xl shadow-emerald-500/20 bg-card/95 backdrop-blur-2xl">
              <div className="flex items-center gap-3">
                 <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                    <CheckCircle2 className="w-7 h-7" />
                 </div>
                 <div>
                    <p className="text-sm font-black text-foreground">สแกนเสร็จเรียบร้อย!</p>
                    <p className="text-[10px] text-muted font-bold uppercase tracking-tight">พร้อมบันทึก {slips.filter(s => s.status === 'done').length} รายการ</p>
                 </div>
              </div>
              <div className="flex items-center gap-2">
                 <button onClick={() => setShowSaveToast(false)} className="p-3 text-muted hover:text-foreground transition-colors"><X className="w-5 h-5" /></button>
                 <button onClick={openBulkModal} disabled={isSavingAll} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-2xl font-black text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2">
                    {isSavingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    บันทึกตอนนี้
                 </button>
              </div>
           </div>
        </div>
      )}

      {selectedCount > 0 && (
        <div className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-12 duration-500">
           <div className="glass rounded-2xl p-3 md:p-4 flex flex-col items-center gap-3 border border-indigo-500/40 shadow-2xl shadow-indigo-500/20 bg-card/90 backdrop-blur-xl">
              <div className="flex gap-2 overflow-x-auto max-w-[90vw] pb-1">
                {CATEGORIES.map(cat => (
                  <button key={cat.id} onClick={() => bulkUpdateCategory(cat.id)} className="p-2 md:p-3 rounded-xl bg-background hover:bg-indigo-500/10 border border-border hover:border-indigo-500/50 transition-all flex flex-col items-center gap-1 min-w-[56px] md:min-w-[64px]">
                    <span className="text-lg md:text-xl">{cat.icon}</span>
                    <span className="text-[9px] md:text-[10px] font-bold text-foreground">{cat.label}</span>
                  </button>
                ))}
              </div>
           </div>
        </div>
      )}

      <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" multiple />
      
      <SplitSettingsModal 
        isOpen={!!splitModalOpen}
        onClose={() => setSplitModalOpen(null)}
        slip={slips.find(s => s.id === splitModalOpen) || null}
        onUpdate={(updates) => splitModalOpen && updateSlip(splitModalOpen, updates)}
        members={members}
        guestMembers={dashboards.find(d => d.id === selectedDashboardId)?.metadata?.guest_members || []}
        user={user}
      />

      <BulkSaveModal 
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        onSave={handleSaveAll}
        doneSlips={doneSlips}
        totalAmount={totalAmount}
        uniqueDates={uniqueDates}
        dashboards={dashboards}
        selectedDashboardId={selectedDashboardId}
        setSelectedDashboardId={setSelectedDashboardId}
        bulkCategory={bulkCategory}
        setBulkCategory={setBulkCategory}
        bulkSplit={bulkSplit}
        setBulkSplit={setBulkSplit}
        bulkSplitBetween={bulkSplitBetween}
        setBulkSplitBetween={setBulkSplitBetween}
        members={members}
        guestMembers={dashboards.find(d => d.id === selectedDashboardId)?.metadata?.guest_members || []}
        user={user}
        isSavingAll={isSavingAll}
      />
    </div>
  );
}
