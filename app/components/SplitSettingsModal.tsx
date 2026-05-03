"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SlipItem, User, AnalysisResult } from "../../types";

interface SplitSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  slip: SlipItem | null;
  onUpdate: (updates: { result: Partial<AnalysisResult> }) => void;
  members: { user_id: string }[];
  guestMembers: string[];
  user: User | null;
}

export function SplitSettingsModal({ 
  isOpen, 
  onClose, 
  slip, 
  onUpdate, 
  members, 
  guestMembers, 
  user 
}: SplitSettingsModalProps) {
  if (!isOpen || !slip) return null;

  const selectedIds = slip.result.splitBetween || [];

  const toggleMember = (id: string) => {
    if (selectedIds.includes(id)) {
      if (selectedIds.length > 1) {
        onUpdate({ result: { splitBetween: selectedIds.filter(i => i !== id) } });
      }
    } else {
      onUpdate({ result: { splitBetween: [...selectedIds, id] } });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="glass w-full max-w-md rounded-[2.5rem] p-8 border border-white/20 shadow-2xl bg-card/95">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black uppercase tracking-tight">ตั้งค่าการหารบิล</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-5 h-5 text-muted" /></button>
        </div>

        <div className="space-y-6">
           <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-center">
              <p className="text-xs font-bold text-muted uppercase tracking-widest mb-1">ยอดเงินทั้งหมด</p>
              <p className="text-2xl font-black text-indigo-600">฿{slip.result.amount.toLocaleString()}</p>
              <p className="text-[10px] font-bold text-muted mt-2">หาร {selectedIds.length} คน = <span className="text-indigo-600">฿{(slip.result.amount / (selectedIds.length || 1)).toLocaleString()} / คน</span></p>
           </div>

           <div className="space-y-3">
              <label className="text-[10px] font-black text-muted uppercase tracking-widest px-2">เลือกคนที่จะหาร</label>
              <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                 {members.map((m) => (
                    <button 
                      key={m.user_id}
                      onClick={() => toggleMember(m.user_id)}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-xl border transition-all text-left",
                        selectedIds.includes(m.user_id) 
                          ? "bg-indigo-600 border-indigo-600 text-white" 
                          : "bg-background border-border text-muted hover:border-indigo-500/50"
                      )}
                    >
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border",
                        selectedIds.includes(m.user_id) ? "bg-white/20 border-white/20" : "bg-card border-border"
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
                        selectedIds.includes(`guest:${name}`) 
                          ? "bg-amber-600 border-amber-600 text-white" 
                          : "bg-background border-border text-muted hover:border-amber-500/50"
                      )}
                    >
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border",
                        selectedIds.includes(`guest:${name}`) ? "bg-white/20 border-white/20" : "bg-amber-500/10 border-amber-500/20"
                      )}>
                        {name[0].toUpperCase()}
                      </div>
                      <span className="text-xs font-bold truncate">{name}</span>
                    </button>
                 ))}
              </div>
           </div>

           <button 
              onClick={onClose}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
           >
              ตกลง
           </button>
        </div>
      </div>
    </div>
  );
}
