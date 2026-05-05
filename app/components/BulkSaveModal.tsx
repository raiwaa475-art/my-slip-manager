"use client";

import { useMemo } from "react";
import { X, Loader2, Save, LayoutDashboard, Users, Calendar, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORIES } from "@/lib/constants";
import type { SlipItem, User, Dashboard } from "../../types";

interface BulkSaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  doneSlips: SlipItem[];
  totalAmount: number;
  uniqueDates: string[];
  dashboards: Dashboard[];
  selectedDashboardId: string;
  setSelectedDashboardId: (id: string) => void;
  bulkCategory: string;
  setBulkCategory: (cat: string) => void;
  bulkSplit: boolean;
  setBulkSplit: (split: boolean) => void;
  bulkSplitBetween: string[];
  setBulkSplitBetween: (ids: string[]) => void;
  members: { user_id: string }[];
  guestMembers: string[];
  user: User | null;
  isSavingAll?: boolean;
}

export function BulkSaveModal({
  isOpen,
  onClose,
  onSave,
  doneSlips,
  totalAmount,
  uniqueDates,
  dashboards,
  selectedDashboardId,
  setSelectedDashboardId,
  bulkCategory,
  setBulkCategory,
  bulkSplit,
  setBulkSplit,
  bulkSplitBetween,
  setBulkSplitBetween,
  members,
  guestMembers,
  user,
  isSavingAll = false
}: BulkSaveModalProps) {
  const frozenSummary = useMemo(() => {
    if (!isOpen) return null;
    return {
      count: doneSlips.length,
      total: totalAmount,
      dates: uniqueDates
    };
  }, [isOpen, doneSlips.length, totalAmount, uniqueDates]);

  if (!isOpen || !frozenSummary) return null;

  const toggleMember = (id: string) => {
    if (bulkSplitBetween.includes(id)) {
      if (bulkSplitBetween.length > 1) {
        setBulkSplitBetween(bulkSplitBetween.filter(i => i !== id));
      }
    } else {
      setBulkSplitBetween([...bulkSplitBetween, id]);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-card text-card-foreground w-full max-w-xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border border-border transition-colors duration-300">
        
        {/* Header */}
        <div className="px-8 py-7 border-b border-border flex justify-between items-center bg-muted/5">
          <div className="space-y-1">
            <h2 className="text-2xl font-black uppercase tracking-tight gradient-text">สรุปรายการสแกน</h2>
            <div className="flex items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
               <p className="text-[10px] text-muted font-black uppercase tracking-[0.2em]">Summary Overview</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2.5 hover:bg-muted/10 rounded-2xl transition-all text-muted hover:text-foreground"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
          
          {/* Simplified Total Amount Section */}
          <div className="text-center space-y-2 py-4">
             <p className="text-[10px] font-black text-muted uppercase tracking-[0.3em]">ยอดเงินรวมทั้งหมด</p>
             <div className="flex flex-col items-center">
                <div className="flex items-baseline gap-2">
                   <span className="text-2xl font-black text-accent/60">฿</span>
                   <span className="text-6xl font-black tracking-tighter text-foreground tabular-nums">
                     {frozenSummary.total.toLocaleString()}
                   </span>
                </div>
                <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 bg-accent/5 dark:bg-accent/10 rounded-full border border-accent/10">
                   <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                   <span className="text-[10px] font-black text-accent uppercase tracking-widest">
                     {frozenSummary.count} รายการที่สแกนสำเร็จ
                   </span>
                </div>
             </div>
          </div>

          {/* Dates Section */}
          <div className="space-y-4">
             <div className="flex items-center gap-2 text-[10px] font-black text-muted uppercase tracking-[0.2em]">
                <Calendar className="w-4 h-4 text-accent" />
                Transaction Dates
             </div>
             <div className="flex flex-wrap gap-2.5">
                {frozenSummary.dates.map(date => (
                  <span key={date} className="px-4 py-2 bg-accent/5 text-accent rounded-xl text-[11px] font-black border border-accent/10 shadow-sm transition-all hover:scale-105">
                    {date}
                  </span>
                ))}
             </div>
          </div>

          <div className="h-px bg-border/50" />

          {/* Settings Grid */}
          <div className="space-y-8">
             {/* Category Selection */}
             <div className="space-y-4">
                <label className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Bulk Category Mapping</label>
                <div className="grid grid-cols-4 gap-3">
                   {CATEGORIES.map(cat => (
                     <button
                       key={cat.id}
                       onClick={() => setBulkCategory(cat.id)}
                       className={cn(
                         "flex flex-col items-center gap-2 p-3.5 rounded-2xl border-2 transition-all duration-300",
                         bulkCategory === cat.id 
                           ? "bg-accent border-accent text-white shadow-xl shadow-accent/20 scale-105" 
                           : "bg-muted/5 dark:bg-white/5 border-border hover:border-accent/40 text-muted hover:text-foreground"
                       )}
                     >
                       <span className="text-2xl group-hover:scale-110 transition-transform">{cat.icon}</span>
                       <span className="text-[8px] font-black uppercase truncate w-full text-center tracking-tighter">{cat.label}</span>
                     </button>
                   ))}
                </div>
             </div>

             {/* Dashboard Selection */}
             <div className="space-y-4">
                <label className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">บันทึกลงแดชบอร์ด (DASHBOARD)</label>
                <div className="relative group">
                  <select 
                    value={selectedDashboardId} 
                    onChange={(e) => setSelectedDashboardId(e.target.value)}
                    className="w-full bg-muted/5 border-2 border-border group-hover:border-accent/40 rounded-[1.25rem] px-6 py-4.5 font-black text-foreground outline-none focus:border-accent focus:ring-4 focus:ring-accent/5 transition-all text-sm appearance-none"
                  >
                    {dashboards.map(d => (
                      <option key={d.id} value={d.id} className="bg-card text-foreground font-bold">
                        {d.type === 'split_bill' ? '👥 ' : '👤 '}{d.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-muted group-hover:text-accent transition-colors">
                     <LayoutDashboard className="w-5 h-5" />
                  </div>
                </div>
             </div>

             {/* Split Settings */}
             <div className="space-y-5 pt-2">
                <div className="flex justify-between items-center p-4 rounded-2xl bg-muted/5 border border-border/50">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                         <Users className="w-5 h-5" />
                      </div>
                      <div className="space-y-0.5">
                         <label className="text-[11px] font-black text-foreground uppercase tracking-tight">หารบิลทุกใบอัตโนมัติ</label>
                         <p className="text-[9px] text-muted font-bold uppercase tracking-widest">Smart Split All</p>
                      </div>
                   </div>
                   <button 
                     onClick={() => setBulkSplit(!bulkSplit)}
                     className={cn(
                       "w-14 h-7 rounded-full transition-all relative p-1.5 shadow-inner",
                       bulkSplit ? "bg-accent" : "bg-muted"
                     )}
                   >
                     <div className={cn(
                       "w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-md",
                       bulkSplit ? "translate-x-7" : "translate-x-0"
                     )} />
                   </button>
                </div>

                {bulkSplit && (
                   <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-4 duration-500">
                      {members.map((m) => (
                        <button 
                          key={m.user_id}
                          onClick={() => toggleMember(m.user_id)}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-2xl border-2 transition-all duration-300 text-left relative overflow-hidden group",
                            bulkSplitBetween.includes(m.user_id) 
                              ? "bg-accent/5 border-accent text-accent shadow-lg shadow-accent/5" 
                              : "bg-muted/5 dark:bg-white/5 border-border text-muted hover:border-accent/40"
                          )}
                        >
                          <div className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black border transition-all",
                            bulkSplitBetween.includes(m.user_id) 
                              ? "bg-accent border-accent text-white scale-110" 
                              : "bg-muted/20 border-border group-hover:border-accent/40"
                          )}>
                            {m.user_id.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="text-[10px] font-black truncate tracking-tight">
                            {m.user_id === user?.id ? "คุณ (YOU)" : `เพื่อน...${m.user_id.substring(0, 4)}`}
                          </span>
                          {bulkSplitBetween.includes(m.user_id) && (
                            <div className="absolute top-0 right-0 p-1">
                               <CheckCircle2 className="w-3 h-3 text-accent" />
                            </div>
                          )}
                        </button>
                      ))}
                      {guestMembers.map((name) => (
                        <button 
                          key={`guest-${name}`}
                          onClick={() => toggleMember(`guest:${name}`)}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-2xl border-2 transition-all duration-300 text-left relative overflow-hidden group",
                            bulkSplitBetween.includes(`guest:${name}`) 
                              ? "bg-amber-500/5 border-amber-500 text-amber-600 shadow-lg shadow-amber-500/5" 
                              : "bg-muted/5 dark:bg-white/5 border-border text-muted hover:border-amber-500/40"
                          )}
                        >
                          <div className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black border transition-all",
                            bulkSplitBetween.includes(`guest:${name}`) 
                              ? "bg-amber-500 border-amber-500 text-white scale-110" 
                              : "bg-muted/20 border-border group-hover:border-accent/40"
                          )}>
                            {name[0].toUpperCase()}
                          </div>
                          <span className="text-[10px] font-black truncate tracking-tight">{name}</span>
                          {bulkSplitBetween.includes(`guest:${name}`) && (
                            <div className="absolute top-0 right-0 p-1">
                               <CheckCircle2 className="w-3 h-3 text-amber-500" />
                            </div>
                          )}
                        </button>
                      ))}
                   </div>
                )}
             </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 bg-muted/5 border-t border-border flex flex-col gap-3">
           <button 
             onClick={onSave}
             disabled={(bulkSplit && bulkSplitBetween.length === 0) || isSavingAll}
             className="w-full bg-accent hover:opacity-90 text-white font-black py-5 rounded-[1.5rem] shadow-2xl shadow-accent/30 transition-all active:scale-[0.98] disabled:opacity-30 flex items-center justify-center gap-3 text-sm uppercase tracking-[0.2em]"
           >
             {isSavingAll ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
             ยืนยันและบันทึก {frozenSummary.count} รายการ
           </button>
           <button 
             onClick={onClose}
             className="w-full py-3 text-muted hover:text-foreground font-black text-[10px] uppercase tracking-[0.3em] transition-colors"
           >
             ยกเลิกการสแกนนี้
           </button>
        </div>
      </div>
    </div>
  );
}
