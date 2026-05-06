"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { 
  Upload, Plus, Loader2, Scan, 
  LayoutDashboard, Square, CheckSquare, Trash2,
  Save, Trash, Calendar, AlertCircle
} from "lucide-react";
import { SlipProvider, useSlips } from "./contexts/SlipContext";
import { useAuth } from "./contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/app/components/ui/Toast";
import { SlipRow } from "./components/SlipRow";
import { BulkSaveModal } from "./components/BulkSaveModal";
import { SplitSettingsModal } from "./components/SplitSettingsModal";
import { BottomNav } from "./dashboard/components/BottomNav";
import { DashboardSidebar } from "./dashboard/components/DashboardSidebar";
import Link from "next/link";
import LoginPage from "./auth/login/page";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <SlipProvider>
      <HomeContent />
    </SlipProvider>
  );
}

function HomeContent() {
  const { toast } = useToast();
  const { 
    user, loading, dashboards, selectedDashboardId, setSelectedDashboardId, signOut,
    deleteDashboard, leaveDashboard 
  } = useAuth();
  const { 
    slips, setSlips, isProcessingAll, processingProgress, estimatedSecondsLeft, isSavingAll,
    addManualSlip, handleFileUpload, updateSlip,
    selectAll, removeSelected, processAll, 
    saveAll 
  } = useSlips();

  const [members, setMembers] = useState<{ user_id: string }[]>([]);
  const [splitModalOpen, setSplitModalOpen] = useState<string | null>(null); // slip ID
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkCategory, setBulkCategory] = useState("อื่นๆ");
  const [bulkSplit, setBulkSplit] = useState(false);
  const [bulkSplitBetween, setBulkSplitBetween] = useState<string[]>([]);
  const [setupMode, setSetupMode] = useState<"choose" | "create" | "join" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = useMemo(() => createClient(), []);

  // Use a ref for slips to avoid stale closures
  const slipsRef = useRef(slips);
  useEffect(() => {
    slipsRef.current = slips;
  }, [slips]);

  const fetchMembers = useCallback(async (dashboardId: string) => {
    try {
      const { data, error } = await supabase
        .from('dashboard_users')
        .select('user_id')
        .eq('dashboard_id', dashboardId);

      if (error) throw error;
      setMembers(data || []);
      
      // Auto-select current user in split list
      if (user) {
        setBulkSplitBetween([user.id]);
      }
    } catch (err: any) {
      console.error("Error fetching members:", err?.message || err);
    }
  }, [supabase, user]);

  const activeDashboard = useMemo(() => 
    dashboards.find(d => d.id === selectedDashboardId) || null
  , [dashboards, selectedDashboardId]);

  const guestMembers = useMemo(() => 
    activeDashboard?.metadata?.guest_members || []
  , [activeDashboard]);

  useEffect(() => {
    if (selectedDashboardId) {
      fetchMembers(selectedDashboardId);
    }
  }, [selectedDashboardId, fetchMembers]);

  useEffect(() => {
    if (setupMode) {
      window.location.href = "/dashboard";
    }
  }, [setupMode]);

  const handleProcessAll = async () => {
    await processAll();
    // After scanning is done, auto-open summary modal
    const doneCount = slipsRef.current.filter(s => s.status === 'done').length;
    if (doneCount > 0) {
      setBulkModalOpen(true);
    }
  };

  const handleBulkSave = async () => {
    const doneSlips = slips.filter(s => s.status === 'done');
    const updatePayload = {
      result: {
        category: bulkCategory,
        isSplit: bulkSplit,
        splitBetween: bulkSplit ? bulkSplitBetween : []
      }
    };

    // Update all done slips with bulk settings
    doneSlips.forEach(s => {
      updateSlip(s.id, updatePayload);
    });

    await saveAll();
    setBulkModalOpen(false);
  };

  const selectedCount = slips.filter(s => s.selected).length;
  const doneSlips = slips.filter(s => s.status === 'done');
  const totalAmount = doneSlips.reduce((sum, s) => sum + (s.result?.amount || 0), 0);
  const uniqueDates = Array.from(new Set(doneSlips.map(s => s.result?.date).filter(Boolean)));

  const openBulkModal = () => {
    if (doneSlips.length === 0) {
      toast("กรุณาสแกนสลิปให้สำเร็จอย่างน้อย 1 ใบ", "info");
      return;
    }
    setBulkModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background items-center justify-center">
        <Loader2 className="w-12 h-12 text-accent animate-spin" />
      </div>
    );
  }

  // 🛡️ [Auth Guard] หากยังไม่ล็อกอิน ให้แสดงหน้า Login
  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground transition-colors">
      {user && (
        <DashboardSidebar 
          user={user} 
          dashboards={dashboards} 
          activeDashboard={activeDashboard} 
          setActiveDashboard={(d) => setSelectedDashboardId(d.id)} 
          setSetupMode={setSetupMode}
          handleDeleteDashboard={deleteDashboard}
          handleLeaveDashboard={leaveDashboard}
        />
      )}

      <div className="flex-1 min-h-screen">
      {/* Full-screen Processing Overlay */}
      {isProcessingAll && (
        <div className="fixed inset-0 z-[1000000] flex flex-col items-center justify-center bg-background/80 backdrop-blur-xl animate-in fade-in duration-500">
           <div className="w-full max-w-md p-8 space-y-8 text-center">
              <div className="relative inline-block">
                 <div className="w-24 h-24 rounded-full border-4 border-accent/20 border-t-accent animate-spin shadow-[0_0_30px_rgba(79,70,229,0.2)]" />
                 <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-black text-accent">{processingProgress}%</span>
                 </div>
              </div>
              
              <div className="space-y-2">
                 <h2 className="text-3xl font-black uppercase tracking-tight text-foreground">กำลังสแกนสลิป...</h2>
                 <p className="text-sm text-muted font-bold">โปรดรอสักครู่ ระบบกำลังประมวลผลด้วย AI</p>
              </div>

              <div className="w-full h-4 bg-muted/20 rounded-full overflow-hidden border border-border shadow-inner">
                 <div 
                   className="h-full bg-accent transition-all duration-500 ease-out shadow-[0_0_20px_rgba(79,70,229,0.5)]"
                   style={{ width: `${processingProgress}%` }}
                 />
              </div>

              <div className="p-4 rounded-2xl bg-accent/5 border border-accent/10 animate-pulse min-h-[60px] flex items-center justify-center">
                 <p className="text-xs font-black text-accent uppercase tracking-widest">
                    {estimatedSecondsLeft > 0 
                       ? `ประมาณการเวลาที่เหลือ: ${estimatedSecondsLeft > 60 
                          ? `${Math.floor(estimatedSecondsLeft / 60)} นาที ${estimatedSecondsLeft % 60} วินาที` 
                          : `${estimatedSecondsLeft} วินาที`}`
                       : "กำลังคำนวณเวลาที่เหลือ..."}
                 </p>
              </div>

              <div className="pt-4 space-y-3">
                 <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 rounded-full border border-red-500/20">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <p className="text-[10px] text-red-500 font-black uppercase tracking-[0.2em]">
                       ห้ามปิดหน้าต่างหรือออกจากแอป
                    </p>
                 </div>
                 <p className="text-[9px] text-muted font-bold uppercase tracking-widest opacity-50">
                    เพื่อป้องกันการประมวลผลล้มเหลว
                 </p>
              </div>
           </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-8 pb-32">
        <header className="mb-12 space-y-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase text-foreground">
                Slip <span className="gradient-text">Scanner</span>
              </h1>
              <p className="text-muted font-bold text-sm tracking-tight uppercase">จัดการสลิปจำนวนมากในครั้งเดียวด้วย AI</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <input 
                type="file" 
                multiple 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full sm:w-auto flex justify-center items-center gap-2 bg-card hover:bg-muted/10 text-foreground border border-border px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95"
              >
                <Plus className="w-5 h-5" /> เพิ่มสลิป
              </button>
              <div className="h-10 w-[1px] bg-border/50 mx-1 hidden lg:block" />
              <button 
                onClick={handleProcessAll} 
                disabled={isProcessingAll || slips.length === 0} 
                className="w-full sm:w-auto flex justify-center items-center gap-2 bg-accent hover:bg-accent/90 text-white disabled:opacity-30 px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-accent/20 active:scale-95"
              >
                {isProcessingAll ? <Loader2 className="w-5 h-5 animate-spin" /> : <Scan className="w-5 h-5" />}
                สแกนทั้งหมด
              </button>
              {slips.some(s => s.status === 'done') && (
                <button 
                  onClick={openBulkModal} 
                  disabled={isSavingAll} 
                  className="w-full sm:w-auto flex justify-center items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-30 px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/20 active:scale-95"
                >
                  {isSavingAll ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  บันทึกสรุป
                </button>
              )}
              {!user && (
                <Link 
                  href="/auth/login" 
                  className="w-full sm:w-auto flex justify-center items-center gap-2 bg-white hover:bg-muted/10 text-accent border border-accent/20 px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95"
                >
                  <LayoutDashboard className="w-5 h-5" />
                  เข้าสู่ระบบ
                </Link>
              )}
            </div>
          </div>
        </header>

        <div className="max-w-[1400px] mx-auto space-y-6 md:space-y-10">
          {slips.length > 0 && (
            <div className="flex items-center justify-between bg-card p-3 rounded-2xl border border-border shadow-sm">
              <button onClick={selectAll} className="flex items-center gap-2 text-sm font-bold hover:text-accent transition-colors px-3 text-foreground">
                {slips.every(s => s.selected) ? <CheckSquare className="w-5 h-5 text-accent" /> : <Square className="w-5 h-5 text-muted" />}
                เลือกทั้งหมด
              </button>
              {selectedCount > 0 && (
                <div className="flex items-center gap-4">
                   <span className="text-sm font-black text-accent uppercase tracking-tight">เลือกแล้ว {selectedCount} ใบ</span>
                   <button onClick={removeSelected} className="text-red-500 hover:bg-red-500/10 p-2 rounded-xl transition-all"><Trash2 className="w-5 h-5" /></button>
                </div>
              )}
            </div>
          )}

          {slips.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 bg-card rounded-[3rem] border border-dashed border-border/50 text-center space-y-6 group cursor-pointer hover:border-accent/30 transition-all" onClick={() => fileInputRef.current?.click()}>
                <div className="w-24 h-24 bg-muted/5 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                  <Upload className="w-10 h-10 text-muted group-hover:text-accent transition-colors" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black uppercase tracking-tight">ยังไม่มีสลิป</h3>
                  <p className="text-muted font-bold text-sm uppercase tracking-widest">คลิกเพื่ออัปโหลด หรือลากสลิปมาวางที่นี่</p>
                </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
              {slips.map((slip, index) => (
                <SlipRow 
                  key={slip.id} 
                  slip={slip} 
                  index={index}
                  onRemove={() => setSlips(prev => prev.filter(s => s.id !== slip.id))}
                  onOpenSplit={() => setSplitModalOpen(slip.id)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <BulkSaveModal 
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        onSave={handleBulkSave}
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
        guestMembers={guestMembers}
        user={user}
        isSavingAll={isSavingAll}
      />

      {splitModalOpen && (
        <SplitSettingsModal 
          isOpen={!!splitModalOpen}
          onClose={() => setSplitModalOpen(null)}
          slip={slips.find(s => s.id === splitModalOpen)!}
          onUpdate={(updates) => updateSlip(splitModalOpen, updates)}
          members={members}
          guestMembers={guestMembers}
          user={user}
        />
      )}

      {user && (
        <BottomNav 
          user={user} 
          dashboards={dashboards} 
          activeDashboard={activeDashboard} 
          setActiveDashboard={(d) => setSelectedDashboardId(d.id)} 
          setSetupMode={setSetupMode} 
        />
      )}
      </div>
    </div>
  );
}
