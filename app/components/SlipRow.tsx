"use client";

import { 
  X, Play, Loader2, CheckCircle2, Calendar, 
  Square, CheckSquare, Save, Users, AlertCircle 
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { CATEGORIES } from "@/lib/constants";
import type { SlipItem } from "../../types";
import { useSlips } from "../contexts/SlipContext";
import { useAuth } from "../contexts/AuthContext";

interface SlipRowProps {
  slip: SlipItem;
  index: number;
  onOpenSplit: () => void;
}

export function SlipRow({ 
  slip, 
  index,
  onOpenSplit
}: SlipRowProps) {
  const { user } = useAuth();
  const { updateSlip, toggleSelect, analyzeSingleSlip, saveSingleSlip, setSlips } = useSlips();

  const onUpdate = (updates: any) => updateSlip(slip.id, updates);
  const onToggleSelect = () => toggleSelect(slip.id);
  const onAnalyze = () => analyzeSingleSlip(slip.id);
  const handleRowSave = () => saveSingleSlip(slip.id);
  const onRemove = () => setSlips(prev => prev.filter(s => s.id !== slip.id));
  return (
    <div className={cn(
      "group relative flex flex-col md:flex-row glass rounded-3xl overflow-hidden border transition-all duration-300 bg-card",
      slip.selected ? "border-indigo-500/50 bg-indigo-500/5 shadow-lg shadow-indigo-500/10" : 
      slip.status === 'saved' ? "border-emerald-500/50 bg-emerald-500/5" : 
      slip.status === 'error' ? "border-red-500/50 bg-red-500/5" : "border-border hover:border-muted"
    )}>
      <div 
        onClick={onToggleSelect}
        className="absolute top-4 left-4 z-20 cursor-pointer"
      >
        {slip.selected ? <CheckSquare className="w-6 h-6 text-indigo-500" /> : <Square className="w-6 h-6 text-muted group-hover:text-foreground transition-colors" />}
      </div>

      <div className="relative w-full md:w-56 h-48 md:h-auto overflow-hidden bg-black/10 border-b md:border-b-0 md:border-r border-border">
        <div className="w-full h-full cursor-zoom-in transition-transform duration-500 hover:scale-150 origin-center flex items-center justify-center">
          {slip.preview ? (
            <Image 
              src={slip.preview} 
              alt="Slip" 
              fill
              unoptimized
              className="object-cover opacity-90 group-hover:opacity-100 transition-opacity" 
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted">
               <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">No Image</span>
            </div>
          )}
        </div>
        {slip.status === 'pending' && (
           <div className="absolute inset-0 bg-black/20 dark:bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={(e) => { e.stopPropagation(); onAnalyze(); }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-full shadow-xl"
              >
                <Play className="w-6 h-6" />
              </button>
           </div>
        )}
        {slip.status === 'analyzing' && (
           <div className="absolute inset-0 bg-indigo-500/20 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
              <span className="text-[10px] font-bold tracking-tighter text-indigo-600 dark:text-indigo-400">SCANNING...</span>
           </div>
        )}
        {slip.status === 'saving' && (
           <div className="absolute inset-0 bg-emerald-500/20 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 animate-spin" />
              <span className="text-[10px] font-bold tracking-tighter text-emerald-600 dark:text-emerald-400">SAVING...</span>
           </div>
        )}
        {slip.status === 'saved' && (
           <div className="absolute inset-0 bg-emerald-500/40 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
              <CheckCircle2 className="w-10 h-10 text-white animate-bounce" />
              <span className="text-xs font-black tracking-tighter text-white">SAVED!</span>
           </div>
        )}
      </div>

      <div className="flex-1 p-5 md:p-8 flex flex-col gap-5 md:gap-6">
         <div className="flex justify-between items-start">
            <div className="space-y-1 flex-1">
               <span className="text-[10px] font-black text-indigo-500/80 tracking-widest uppercase">ผู้รับเงิน / ข้อมูล (แก้ไขได้)</span>
               <input 
                  type="text"
                  value={slip.result.receiver}
                  onChange={(e) => onUpdate({ result: { receiver: e.target.value } })}
                  className="w-full bg-transparent border-none p-0 text-sm font-medium text-foreground outline-none focus:ring-0 placeholder:text-muted"
                  placeholder="ระบุผู้รับเงิน..."
               />
            </div>
            <button onClick={onRemove} className="text-muted hover:text-red-500 transition-colors ml-4"><X className="w-5 h-5" /></button>
         </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
           <div className="space-y-2">
              <label className="text-[10px] font-black text-muted tracking-widest uppercase">ยอดเงิน (BAHT)</label>
              <div className="relative group/input">
                 <input 
                    type="number"
                    value={slip.result.amount || ""}
                    onChange={(e) => onUpdate({ result: { amount: parseFloat(e.target.value) || 0 } })}
                    placeholder="0.00"
                    className="w-full bg-background border border-border focus:border-indigo-500/50 rounded-xl px-4 py-3 text-xl md:text-2xl font-bold text-foreground outline-none transition-all"
                    tabIndex={index * 2 + 1}
                 />
                 <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted font-bold">฿</div>
              </div>
           </div>

           <div className="space-y-2">
              <label className="text-[10px] font-black text-muted tracking-widest uppercase">วันที่ (DATE)</label>
              <div className="relative">
                 <input 
                    type="date"
                    value={slip.result.date}
                    onChange={(e) => onUpdate({ result: { date: e.target.value } })}
                    className="w-full bg-background border border-border focus:border-indigo-500/50 rounded-xl px-4 py-3 text-base md:text-lg font-medium text-foreground outline-none transition-all"
                    tabIndex={index * 2 + 2}
                 />
                 <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
              </div>
           </div>
        </div>

        <div className="space-y-3">
           <label className="text-[10px] font-black text-muted tracking-widest uppercase">หมวดหมู่ (QUICK CATEGORY)</label>
           <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => onUpdate({ result: { category: cat.id } })}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-xs md:text-sm font-medium border transition-all",
                    slip.result.category === cat.id 
                      ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20" 
                      : "bg-background border-border hover:border-muted text-muted hover:text-foreground"
                  )}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
           </div>
        </div>
        
        {slip.error && (
          <p className="text-xs text-red-500 font-bold flex items-center gap-1">
            <AlertCircle className="w-4 h-4" /> {slip.error}
          </p>
        )}

        {slip.status === 'done' && (
           <div className="pt-4 border-t border-border flex justify-between items-center">
              <button 
                onClick={() => onUpdate({ result: { isSplit: !slip.result.isSplit, splitBetween: !slip.result.isSplit ? [user?.id || ""] : [] } })}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all border",
                  slip.result.isSplit 
                    ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-500" 
                    : "bg-background border-border text-muted hover:border-muted"
                )}
              >
                <Users className="w-4 h-4" /> 
                {slip.result.isSplit ? `หาร ${slip.result.splitBetween?.length || 0} คน` : "หารบิล"}
              </button>

              <div className="flex items-center gap-2">
                {slip.result.isSplit && (
                  <button 
                    onClick={onOpenSplit}
                    className="p-2 text-indigo-500 hover:bg-indigo-500/10 rounded-lg transition-colors"
                    title="ตั้งค่าการหาร"
                  >
                    <Users className="w-5 h-5" />
                  </button>
                )}
                <button 
                  onClick={handleRowSave}
                  className="flex items-center gap-2 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-600 hover:text-white px-6 py-2 rounded-xl font-bold text-sm transition-all border border-emerald-600/20"
                >
                  <Save className="w-4 h-4" /> บันทึกรายการนี้
                </button>
              </div>
           </div>
        )}
      </div>

      <div className={cn(
        "absolute bottom-4 right-4 w-2 h-2 rounded-full",
        slip.status === 'done' || slip.status === 'saved' ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : 
        slip.status === 'error' ? "bg-red-500" : "bg-border"
      )} />
    </div>
  );
}
