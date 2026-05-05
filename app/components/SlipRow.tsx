"use client";

import { 
  X, Play, Loader2, CheckCircle2, Calendar, 
  Square, CheckSquare, Save, Users, AlertCircle, Wallet 
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

  const onUpdate = (updates: Parameters<typeof updateSlip>[1]) => updateSlip(slip.id, updates);
  const onToggleSelect = () => toggleSelect(slip.id);
  const onAnalyze = () => analyzeSingleSlip(slip.id);
  const handleRowSave = () => saveSingleSlip(slip.id);
  const onRemove = () => setSlips(prev => prev.filter(s => s.id !== slip.id));

  return (
    <div className={cn(
      "group relative flex flex-col md:flex-row glass-card rounded-[2.5rem] overflow-hidden border transition-all duration-500",
      slip.selected ? "border-accent/60 bg-accent/[0.03] shadow-2xl shadow-accent/10 -translate-y-1" : 
      slip.status === 'saved' ? "border-emerald-500/40 bg-emerald-500/[0.02]" : 
      slip.status === 'error' ? "border-red-500/40 bg-red-500/[0.02]" : "border-border/50 hover:border-accent/30 hover:shadow-xl"
    )}>
      {/* Selection Overlay for easier clicking */}
      <div 
        onClick={onToggleSelect}
        className="absolute top-6 left-6 z-30 cursor-pointer p-1 rounded-lg hover:bg-accent/10 transition-colors"
      >
        {slip.selected ? (
          <div className="w-6 h-6 rounded-lg bg-accent flex items-center justify-center text-white shadow-lg shadow-accent/30 animate-in zoom-in-50">
            <CheckSquare className="w-4 h-4" />
          </div>
        ) : (
          <div className="w-6 h-6 rounded-lg border-muted/60 group-hover:border-accent/50 transition-colors" />
        )}
      </div>

      {/* Image Section */}
      <div className="relative w-full md:w-64 h-56 md:h-auto overflow-hidden bg-muted/10 border-b md:border-b-0 md:border-r border-border/50">
        <div className="w-full h-full cursor-zoom-in transition-all duration-700 hover:scale-110 flex items-center justify-center group/img">
          {slip.preview ? (
            <Image 
              src={slip.preview} 
              alt="Slip" 
              fill
              unoptimized
              className="object-cover opacity-90 group-hover:opacity-100 transition-opacity" 
            />
          ) : (
            <div className="flex flex-col items-center gap-3 text-muted/60">
               <Wallet className="w-12 h-12" />
               <span className="text-[10px] font-black uppercase tracking-[0.2em]">No Data</span>
            </div>
          )}
          
          {/* Overlay Actions */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-4 backdrop-blur-[2px]">
            {slip.status === 'pending' && (
              <button 
                onClick={(e) => { e.stopPropagation(); onAnalyze(); }}
                className="w-12 h-12 rounded-full bg-white text-accent flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-transform"
              >
                <Play className="w-6 h-6 fill-current" />
              </button>
            )}
            <button onClick={onRemove} className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-red-500 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Overlays */}
        {['analyzing', 'saving'].includes(slip.status) && (
           <div className={cn(
             "absolute inset-0 backdrop-blur-md flex flex-col items-center justify-center gap-3 z-20",
             slip.status === 'analyzing' ? "bg-accent/20" : "bg-emerald-500/20"
           )}>
              <div className="w-12 h-12 rounded-2xl bg-white/90 flex items-center justify-center shadow-xl">
                <Loader2 className={cn("w-6 h-6 animate-spin", slip.status === 'analyzing' ? "text-accent" : "text-emerald-500")} />
              </div>
              <span className="text-[10px] font-black tracking-[0.2em] text-white uppercase drop-shadow-md">
                {slip.status === 'analyzing' ? "Analyzing..." : "Saving..."}
              </span>
           </div>
        )}
        
        {slip.status === 'saved' && (
           <div className="absolute inset-0 bg-emerald-500/40 backdrop-blur-md flex flex-col items-center justify-center gap-3 z-20">
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-2xl animate-in zoom-in-50 duration-500">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
              <span className="text-xs font-black tracking-[0.3em] text-white uppercase drop-shadow-md">Stored</span>
           </div>
        )}
      </div>

      {/* Content Section */}
      <div className="flex-1 p-6 md:p-10 flex flex-col gap-8">
         <div className="flex justify-between items-start">
            <div className="space-y-2 flex-1">
               <span className="text-[10px] font-black text-accent uppercase tracking-widest">Receiver Name</span>
               <input 
                  type="text"
                  value={slip.result.receiver}
                  onChange={(e) => onUpdate({ result: { receiver: e.target.value } })}
                  className="w-full bg-transparent border-none p-0 text-xl font-black text-foreground outline-none focus:ring-0 placeholder:text-muted/60"
                  placeholder="Who received this?"
               />
            </div>
            <div className="hidden md:block">
              <button onClick={onRemove} className="p-2 text-muted/60 hover:text-red-500 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
         </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
           <div className="space-y-2">
              <label className="text-[10px] font-black text-muted uppercase tracking-widest">Amount (THB)</label>
              <div className="relative group/input">
                 <input 
                    type="number"
                    value={slip.result.amount || ""}
                    onChange={(e) => onUpdate({ result: { amount: parseFloat(e.target.value) || 0 } })}
                    placeholder="0.00"
                    className="w-full bg-muted/10 border-2 border-border focus:border-accent focus:bg-background dark:focus:bg-card rounded-2xl px-5 py-4 text-3xl font-black text-foreground outline-none transition-all"
                    tabIndex={index * 2 + 1}
                 />
                 <div className="absolute right-5 top-1/2 -translate-y-1/2 text-muted/80 text-xl font-black">฿</div>
              </div>
           </div>

           <div className="space-y-2">
              <label className="text-[10px] font-black text-muted uppercase tracking-widest">Transaction Date</label>
              <div className="relative">
                 <input 
                    type="date"
                    value={slip.result.date}
                    onChange={(e) => onUpdate({ result: { date: e.target.value } })}
                    className="w-full bg-muted/10 border-2 border-border focus:border-accent focus:bg-background dark:focus:bg-card rounded-2xl px-5 py-4 text-lg font-bold text-foreground outline-none transition-all appearance-none"
                    tabIndex={index * 2 + 2}
                 />
                 <Calendar className="absolute right-5 top-1/2 -translate-y-1/2 w-6 h-6 text-muted/80 pointer-events-none" />
              </div>
           </div>
        </div>

        <div className="space-y-4">
           <label className="text-[10px] font-black text-muted uppercase tracking-widest">Category</label>
           <div className="flex flex-wrap gap-3">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => onUpdate({ result: { category: cat.id } })}
                  className={cn(
                    "flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-black transition-all border-2",
                    slip.result.category === cat.id 
                      ? "bg-accent border-accent text-white shadow-xl shadow-accent/30 scale-105" 
                      : "bg-transparent border-border/50 hover:border-accent/30 text-muted hover:text-foreground"
                  )}
                >
                  <span className="text-lg">{cat.icon}</span>
                  <span className="uppercase tracking-tighter">{cat.label}</span>
                </button>
              ))}
           </div>
        </div>
        
        {slip.error && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-xs text-red-500 font-black uppercase tracking-wider">{slip.error}</p>
          </div>
        )}

        {slip.status === 'done' && (
           <div className="pt-8 border-t border-border/50 flex flex-col sm:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button 
                  onClick={() => onUpdate({ result: { isSplit: !slip.result.isSplit, splitBetween: !slip.result.isSplit ? [user?.id || ""] : [] } })}
                  className={cn(
                    "flex-1 sm:flex-none flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border-2",
                    slip.result.isSplit 
                      ? "bg-accent/10 border-accent/30 text-accent" 
                      : "bg-transparent border-border/50 text-muted hover:border-accent/30"
                  )}
                >
                  <Users className="w-5 h-5" /> 
                  {slip.result.isSplit ? `Split with ${slip.result.splitBetween?.length || 0}` : "Split bill"}
                </button>

                {slip.result.isSplit && (
                  <button 
                    onClick={onOpenSplit}
                    className="w-12 h-12 flex items-center justify-center bg-accent text-white rounded-2xl shadow-lg shadow-accent/20 hover:scale-110 active:scale-95 transition-all"
                  >
                    <Users className="w-6 h-6" />
                  </button>
                )}
              </div>

              <button 
                onClick={handleRowSave}
                className="w-full sm:w-auto flex items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-emerald-500/20 active:scale-95"
              >
                <Save className="w-5 h-5" /> บันทึกรายการนี้
              </button>
           </div>
        )}
      </div>

      {/* Decorative indicator */}
      <div className={cn(
        "absolute top-8 right-8 w-3 h-3 rounded-full",
        slip.status === 'done' || slip.status === 'saved' ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)]" : 
        slip.status === 'error' ? "bg-red-500 shadow-[0_0_15px_rgba(239,44,44,0.8)]" : "bg-muted/30"
      )} />
    </div>
  );
}
