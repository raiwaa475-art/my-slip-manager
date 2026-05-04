"use client";

import { useMemo } from "react";
import { X, Loader2, Save } from "lucide-react";
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
  // 1. "Freeze" the summary when the modal is opened so it doesn't flick to 0 during saving
  const frozenSummary = useMemo(() => {
    if (!isOpen) return null;
    return {
      count: doneSlips.length,
      total: totalAmount,
      dates: uniqueDates
    };
  }, [isOpen]); // Only re-calculate when the modal is opened

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="glass w-full max-w-2xl rounded-[2.5rem] overflow-hidden border border-white/20 shadow-2xl bg-card/95">
        <div className="p-8 pb-4 flex justify-between items-center border-b border-border/50">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight">สรุปรายการสแกน</h2>
            <p className="text-xs text-muted font-bold">ตรวจสอบและตั้งค่าก่อนบันทึกลงฐานข้อมูล</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-5 h-5 text-muted" /></button>
        </div>

        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 overflow-y-auto max-h-[70vh] custom-scrollbar">
          <div className="space-y-6">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-muted uppercase tracking-widest px-2">ข้อมูลสรุป (SUMMARY)</label>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
                  <p className="text-[10px] font-bold text-muted uppercase mb-1">จำนวนบิล</p>
                  <p className="text-2xl font-black text-foreground">{frozenSummary.count} <span className="text-sm">ใบ</span></p>
                </div>
                <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                  <p className="text-[10px] font-bold text-muted uppercase mb-1">ยอดรวม</p>
                  <p className="text-2xl font-black text-emerald-600">฿{frozenSummary.total.toLocaleString()}</p>
                </div>
              </div>
              <div className="p-4 bg-card border border-border rounded-2xl">
                <p className="text-[10px] font-bold text-muted uppercase mb-2">วันที่พบในสลิป</p>
                <div className="flex flex-wrap gap-2">
                  {frozenSummary.dates.map(date => (
                    <span key={date} className="px-2 py-1 bg-muted rounded-lg text-xs font-bold text-foreground">
                      {date}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-muted uppercase tracking-widest px-2">หมวดหมู่ทั้งหมด (BULK CATEGORY)</label>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setBulkCategory(cat.id)}
                    className={cn(
                      "flex flex-col items-center gap-1 p-3 rounded-xl border transition-all text-center",
                      bulkCategory === cat.id 
                        ? "bg-indigo-600 border-indigo-600 text-white" 
                        : "bg-background border-border text-muted hover:border-indigo-500/50"
                    )}
                  >
                    <span className="text-xl">{cat.icon}</span>
                    <span className="text-[10px] font-bold truncate w-full">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-muted uppercase tracking-widest px-2">แดชบอร์ดปลายทาง</label>
              <select 
                value={selectedDashboardId} 
                onChange={(e) => setSelectedDashboardId(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 font-bold text-foreground focus:ring-2 focus:ring-indigo-500 transition-all"
              >
                {dashboards.map(d => (
                  <option key={d.id} value={d.id}>{d.name} {d.type === 'split_bill' ? '(กลุ่ม)' : '(ส่วนตัว)'}</option>
                ))}
              </select>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center px-2">
                <label className="text-[10px] font-black text-muted uppercase tracking-widest">การหารบิล (SPLIT ALL)</label>
                <button 
                  onClick={() => setBulkSplit(!bulkSplit)}
                  className={cn(
                    "w-12 h-6 rounded-full transition-all relative p-1",
                    bulkSplit ? "bg-indigo-600" : "bg-muted"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 bg-white rounded-full transition-all",
                    bulkSplit ? "translate-x-6" : "translate-x-0"
                  )} />
                </button>
              </div>

              {bulkSplit && (
                <div className="space-y-3 animate-in slide-in-from-top-4 duration-300">
                  <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                    {members.map((m) => (
                      <button 
                        key={m.user_id}
                        onClick={() => toggleMember(m.user_id)}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-xl border transition-all text-left",
                          bulkSplitBetween.includes(m.user_id) 
                            ? "bg-indigo-600 border-indigo-600 text-white" 
                            : "bg-background border-border text-muted hover:border-indigo-500/50"
                        )}
                      >
                        <div className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black border",
                          bulkSplitBetween.includes(m.user_id) ? "bg-white/20 border-white/20" : "bg-card border-border"
                        )}>
                          {m.user_id.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="text-xs font-bold truncate">
                          {m.user_id === user?.id ? "คุณ" : `เพื่อน...${m.user_id.substring(0, 4)}`}
                        </span>
                      </button>
                    ))}
                    {guestMembers.map((name) => (
                      <button 
                        key={`guest-${name}`}
                        onClick={() => toggleMember(`guest:${name}`)}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-xl border transition-all text-left",
                          bulkSplitBetween.includes(`guest:${name}`) 
                            ? "bg-amber-600 border-amber-600 text-white" 
                            : "bg-background border-border text-muted hover:border-amber-500/50"
                        )}
                      >
                        <div className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black border",
                          bulkSplitBetween.includes(`guest:${name}`) ? "bg-white/20 border-white/20" : "bg-amber-500/10 border-amber-500/20"
                        )}>
                          {name[0].toUpperCase()}
                        </div>
                        <span className="text-xs font-bold truncate">{name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-8 bg-muted/30 border-t border-border flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 px-6 py-4 rounded-2xl font-black text-muted hover:text-foreground transition-all border border-border"
          >
            ยกเลิก
          </button>
          <button 
            onClick={onSave}
            disabled={(bulkSplit && bulkSplitBetween.length === 0) || isSavingAll}
            className="flex-[2] bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSavingAll ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            ยืนยันและบันทึก {frozenSummary.count} รายการ
          </button>
        </div>
      </div>
    </div>
  );
}
