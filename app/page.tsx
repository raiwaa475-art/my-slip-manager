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
import LoginButton from "./components/LoginButton";
import { CATEGORIES } from "@/lib/constants";
import { useToast } from "./components/ui/Toast";


// Import Refactored Components
import { SlipRow } from "./components/SlipRow";
import { SplitSettingsModal } from "./components/SplitSettingsModal";
import { BulkSaveModal } from "./components/BulkSaveModal";

import { useAuth } from "./contexts/AuthContext";
import { useSlips } from "./contexts/SlipContext";

export default function Home() {
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
      const { data, error } = await supabase
        .from('dashboard_users')
        .select('user_id')
        .eq('dashboard_id', dashboardId);
      if (error) throw error;
      setMembers(data || []);
    } catch (err) {
      console.error("Error fetching members:", err);
    }
  }, [supabase]);

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
      <div className="flex min-h-screen bg-background text-foreground transition-colors items-center justify-center p-6">
        <div className="max-w-md w-full glass rounded-[2.5rem] p-10 md:p-12 border border-border bg-card/50 flex flex-col items-center text-center gap-8 shadow-2xl">
          <div className="w-20 h-20 rounded-3xl bg-accent flex items-center justify-center text-white shadow-xl shadow-accent/20">
            <Wallet className="w-10 h-10" />
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-black tracking-tight uppercase">FINANCE.AI</h1>
            <p className="text-muted text-sm leading-relaxed">
              จัดการทุกสลิปการโอนของคุณด้วย AI อัจฉริยะ <br />
              เข้าสู่ระบบเพื่อเริ่มบันทึกข้อมูลและดูแดชบอร์ด
            </p>
          </div>
          <LoginButton />
          <div className="pt-4 border-t border-border w-full">
            <ThemeToggle />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground transition-colors">
      <aside className="hidden md:flex w-64 border-r border-border flex-col p-6 gap-8 bg-card sticky top-0 h-screen">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center relative">
              <Image src="/logo.png" alt="Logo" fill className="object-cover" sizes="40px" />
           </div>
           <span className="font-black text-xl tracking-tighter text-foreground">FINANCE.AI</span>
        </div>

        <nav className="flex-1 flex flex-col gap-2 w-full">
           <Link href="/" className="flex items-center gap-4 p-3 rounded-xl bg-accent/10 text-accent border border-accent/20 transition-all">
              <Scan className="w-6 h-6" />
              <span className="font-bold">สแกนสลิป</span>
           </Link>
           <Link href="/dashboard" className="flex items-center gap-4 p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-muted hover:text-foreground transition-all">
              <LayoutDashboard className="w-6 h-6" />
              <span className="font-medium">แดชบอร์ด</span>
           </Link>
        </nav>
        
        <div className="space-y-4 pt-6 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center overflow-hidden border border-indigo-500/20 relative">
              {user.user_metadata?.avatar_url ? (
                <Image src={user.user_metadata.avatar_url} alt="avatar" fill className="object-cover" sizes="32px" />
              ) : (
                <UserIcon className="w-4 h-4 text-indigo-500" />
              )}
            </div>
            <div className="flex flex-col truncate">
              <span className="text-xs font-bold truncate">{user.user_metadata?.full_name || user.email}</span>
              <button onClick={signOut} className="text-[10px] text-muted hover:text-red-500 flex items-center gap-1 font-bold">
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

      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
           <Link href="/dashboard" className="p-2 -ml-2 text-muted hover:text-foreground">
              <Plus className="w-6 h-6 rotate-45" />
           </Link>
           <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white">
                 <Wallet className="w-5 h-5" />
              </div>
              <span className="font-black text-lg tracking-tighter">FINANCE</span>
           </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button onClick={signOut} className="text-red-500"><LogOut className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border z-50 flex items-center justify-around px-2 pb-4">
         <div className="flex flex-col items-center gap-1 p-2 text-accent">
            <Scan className="w-5 h-5" />
            <span className="text-[10px] font-bold">สแกนสลิป</span>
         </div>
         <Link href="/dashboard" className="flex flex-col items-center gap-1 p-2 text-muted hover:text-foreground">
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] font-medium">แดชบอร์ด</span>
         </Link>
         <Link href="/dashboard#settings" className="flex flex-col items-center gap-1 p-2 text-muted hover:text-foreground">
            <PiggyBank className="w-5 h-5" />
            <span className="text-[10px] font-medium">ตั้งค่า</span>
         </Link>
      </div>

      <main className="flex-1 overflow-y-auto pt-16 pb-24 md:pt-0 md:pb-0">
        <header className="sticky top-0 md:top-auto z-30 bg-background/80 md:bg-transparent backdrop-blur-xl border-b border-border md:border-none px-4 md:px-8 lg:px-12 py-4 md:py-8 lg:py-10">
          <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                  <h1 className="text-2xl font-black gradient-text uppercase">ระบบสแกนสลิป</h1>
                  <div className="h-6 w-[1px] bg-border hidden md:block" />
                  
                  {dashboards.length > 0 && (
                    <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-1.5 shadow-sm">
                      <LayoutDashboard className="w-4 h-4 text-indigo-500" />
                      <select 
                        value={selectedDashboardId} 
                        onChange={(e) => setSelectedDashboardId(e.target.value)}
                        className="bg-transparent text-xs font-bold outline-none cursor-pointer text-foreground"
                      >
                        {dashboards.map(d => (
                          <option key={d.id} value={d.id} className="bg-card text-foreground">
                            บันทึกลง: {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="h-6 w-[1px] bg-border hidden md:block" />
                  <div className="flex items-center gap-3 text-sm text-muted">
                     <span className="flex items-center gap-1"><Coins className="w-4 h-4" /> รวมวันนี้: <b className="text-foreground">฿{stats.todayTotal.toLocaleString()}</b></span>
                     <span className="flex items-center gap-1"><FileText className="w-4 h-4" /> ทั้งหมด: <b className="text-foreground">{slips.length}</b> ใบ</span>
                  </div>
                </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
               <button onClick={addManualSlip} className="flex-1 md:flex-none flex items-center justify-center gap-2 p-2.5 rounded-xl bg-card border border-border hover:bg-black/5 dark:hover:bg-white/5 transition-all text-foreground font-bold text-sm px-4">
                  <Plus className="w-4 h-4" /> เพิ่มเอง
               </button>
               <button onClick={() => fileInputRef.current?.click()} className="flex-1 md:flex-none flex justify-center p-2.5 rounded-xl bg-card border border-border hover:bg-black/5 dark:hover:bg-white/5 transition-all text-foreground">
                  <Upload className="w-5 h-5" />
               </button>
               <button onClick={handleProcessAll} disabled={isProcessingAll || slips.length === 0} className="flex-1 md:flex-none flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20">
                  {isProcessingAll ? <Loader2 className="w-5 h-5 animate-spin" /> : <FastForward className="w-5 h-5" />}
                  สแกนทั้งหมด
               </button>
               {slips.some(s => s.status === 'done') && (
                 <button onClick={() => setBulkModalOpen(true)} disabled={isSavingAll} className="flex-1 md:flex-none flex justify-center items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20">
                    {isSavingAll ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    บันทึกทั้งหมด
                 </button>
               )}
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
            <div onClick={() => fileInputRef.current?.click()} className="group mt-12 cursor-pointer glass rounded-[2rem] p-12 md:p-24 border-dashed border-2 border-border flex flex-col items-center gap-6 text-center hover:border-indigo-500/50 transition-all bg-card/50">
               <div className="p-6 rounded-full bg-indigo-500/10 group-hover:scale-110 transition-transform">
                  <Upload className="w-12 h-12 text-indigo-500" />
                </div>
                <div className="space-y-2">
                  <p className="text-xl md:text-2xl font-bold text-foreground">อัปโหลดสลิปเพื่อเริ่มบันทึก</p>
                  <p className="text-sm md:text-base text-muted">ลากไฟล์มาวาง หรือคลิกเพื่อเลือกรูปภาพ (สูงสุด 20 รูป)</p>
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
                 <button onClick={() => setBulkModalOpen(true)} disabled={isSavingAll} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-2xl font-black text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2">
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
