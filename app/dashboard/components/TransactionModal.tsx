"use client";

import { X, Plus, Save, Loader2, Users, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { User, Transaction } from "../../../types";

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingTransaction: Transaction | null;
  isSaving: boolean;
  newName: string;
  setNewName: (val: string) => void;
  newAmount: string;
  setNewAmount: (val: string) => void;
  newDate: string;
  setNewDate: (val: string) => void;
  newCategory: string;
  setNewCategory: (val: string) => void;
  isSplit: boolean;
  setIsSplit: (val: boolean) => void;
  selectedMemberIds: string[];
  setSelectedMemberIds: (val: string[]) => void;
  members: { user_id: string }[];
  guestMembers: string[];
  user: User | null;
  addTransaction: () => void;
  categories: { id: string, label: string, icon: string }[];
}

export function TransactionModal({
  isOpen,
  onClose,
  editingTransaction,
  isSaving,
  newName,
  setNewName,
  newAmount,
  setNewAmount,
  newDate,
  setNewDate,
  newCategory,
  setNewCategory,
  isSplit,
  setIsSplit,
  selectedMemberIds,
  setSelectedMemberIds,
  members,
  guestMembers,
  user,
  addTransaction,
  categories
}: TransactionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
       <div className="glass w-full max-w-lg rounded-t-[2.5rem] md:rounded-[2.5rem] p-6 md:p-10 border-t md:border border-white/20 shadow-2xl bg-card/95 relative overflow-y-auto max-h-[95vh] md:max-h-[90vh]">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 md:top-6 md:right-6 p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-muted" />
          </button>

          <div className="flex flex-col items-center text-center gap-4 mb-8">
             <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-500">
                <Plus className="w-8 h-8" />
             </div>
             <div>
                <h2 className="text-2xl font-black text-foreground uppercase tracking-tight">
                   {editingTransaction ? "แก้ไขรายการ" : "เพิ่มรายการใหม่"}
                </h2>
                <p className="text-sm text-muted">
                   {editingTransaction ? "ปรับปรุงข้อมูลรายการของคุณ" : "บันทึกรายรับหรือรายจ่ายของคุณ"}
                </p>
             </div>
          </div>

          <div className="space-y-6">
             <div className="flex p-1 bg-black/5 dark:bg-white/5 rounded-2xl">
                <button 
                  onClick={() => setNewCategory("อาหาร")}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl text-sm font-bold transition-all",
                    newCategory !== "รายรับ" ? "bg-white dark:bg-zinc-800 shadow-sm text-indigo-600" : "text-muted"
                  )}
                >
                  รายจ่าย
                </button>
                <button 
                  onClick={() => setNewCategory("รายรับ")}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl text-sm font-bold transition-all",
                    newCategory === "รายรับ" ? "bg-white dark:bg-zinc-800 shadow-sm text-emerald-600" : "text-muted"
                  )}
                >
                  รายรับ
                </button>
             </div>

             <div className="space-y-4">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-muted uppercase tracking-widest px-2">ชื่อรายการ</label>
                   <input 
                      type="text" 
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="เช่น GrabFood, เงินเดือน..."
                      className="w-full bg-background border border-border focus:border-indigo-500 rounded-2xl px-4 py-3 outline-none transition-all"
                   />
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted uppercase tracking-widest px-2">จำนวนเงิน</label>
                      <input 
                         type="number" 
                         value={newAmount}
                         onChange={(e) => setNewAmount(e.target.value)}
                         placeholder="0.00"
                         className="w-full bg-background border border-border focus:border-indigo-500 rounded-2xl px-4 py-3 outline-none transition-all font-bold text-lg"
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted uppercase tracking-widest px-2">วันที่</label>
                      <input 
                         type="date" 
                         value={newDate}
                         onChange={(e) => setNewDate(e.target.value)}
                         className="w-full bg-background border border-border focus:border-indigo-500 rounded-2xl px-4 py-3 outline-none transition-all"
                      />
                   </div>
                </div>

                {newCategory !== "รายรับ" && (
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted uppercase tracking-widest px-2">หมวดหมู่</label>
                      <div className="flex flex-wrap gap-2">
                         {categories.filter(c => c.id !== "รายรับ").map(cat => (
                           <button 
                             key={cat.id}
                             onClick={() => setNewCategory(cat.id)}
                             className={cn(
                               "px-4 py-2 rounded-xl text-xs font-bold border transition-all",
                               newCategory === cat.id ? "bg-indigo-600 border-indigo-600 text-white" : "bg-card border-border text-muted"
                             )}
                           >
                             {cat.icon} {cat.label}
                           </button>
                         ))}
                      </div>
                   </div>
                )}
             </div>

             {newCategory !== "รายรับ" && (
                <div className="pt-4 border-t border-border">
                   <button 
                      onClick={() => setIsSplit(!isSplit)}
                      className={cn(
                        "w-full flex items-center justify-between p-4 rounded-2xl border transition-all",
                        isSplit ? "bg-indigo-500/10 border-indigo-500/50 text-indigo-600" : "bg-card border-border text-muted"
                      )}
                   >
                      <div className="flex items-center gap-3">
                         <Users className="w-5 h-5" />
                         <span className="font-bold">หารบิลกับเพื่อน</span>
                      </div>
                      {isSplit ? <Check className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                   </button>

                   {isSplit && (
                      <div className="mt-4 p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/20 space-y-4 animate-in slide-in-from-top-2 duration-300">
                         <div className="space-y-3">
                            <label className="text-[10px] font-black text-muted uppercase tracking-widest">เลือกคนที่จะหาร ({selectedMemberIds.length} คน)</label>
                            <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                               {members.map((m, i) => (
                                 <button 
                                   key={`real-sel-${i}`}
                                   onClick={() => {
                                     if (selectedMemberIds.includes(m.user_id)) {
                                       if (selectedMemberIds.length > 1) {
                                         setSelectedMemberIds(selectedMemberIds.filter(id => id !== m.user_id));
                                       }
                                     } else {
                                       setSelectedMemberIds([...selectedMemberIds, m.user_id]);
                                     }
                                   }}
                                   className={cn(
                                     "flex items-center gap-2 p-2 rounded-xl border transition-all text-left",
                                     selectedMemberIds.includes(m.user_id) 
                                       ? "bg-indigo-600 border-indigo-600 text-white" 
                                       : "bg-background border-border text-muted hover:border-indigo-500/50"
                                   )}
                                 >
                                   <div className={cn(
                                     "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border",
                                     selectedMemberIds.includes(m.user_id) ? "bg-white/20 border-white/20" : "bg-card border-border"
                                   )}>
                                     {m.user_id.substring(0, 2).toUpperCase()}
                                   </div>
                                   <span className="text-xs font-bold truncate">
                                     {m.user_id === user?.id ? "คุณ" : `เพื่อน...${m.user_id.substring(0, 4)}`}
                                   </span>
                                 </button>
                               ))}
                               
                               {guestMembers.map((name, i) => (
                                 <button 
                                   key={`guest-sel-${i}`}
                                   onClick={() => {
                                     const guestId = `guest:${name}`;
                                     if (selectedMemberIds.includes(guestId)) {
                                       if (selectedMemberIds.length > 1) {
                                         setSelectedMemberIds(selectedMemberIds.filter(id => id !== guestId));
                                       }
                                     } else {
                                       setSelectedMemberIds([...selectedMemberIds, guestId]);
                                     }
                                   }}
                                   className={cn(
                                     "flex items-center gap-2 p-2 rounded-xl border transition-all text-left",
                                     selectedMemberIds.includes(`guest:${name}`) 
                                       ? "bg-amber-600 border-amber-600 text-white" 
                                       : "bg-background border-border text-muted hover:border-amber-500/50"
                                   )}
                                 >
                                   <div className={cn(
                                     "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border",
                                     selectedMemberIds.includes(`guest:${name}`) ? "bg-white/20 border-white/20" : "bg-amber-500/10 border-amber-500/20"
                                   )}>
                                     {name[0].toUpperCase()}
                                   </div>
                                   <span className="text-xs font-bold truncate">{name}</span>
                                 </button>
                               ))}
                            </div>
                         </div>
                         
                         <div className="flex justify-between items-center pt-2 border-t border-indigo-500/10">
                            <span className="text-sm text-muted font-medium">ยอดหารต่อคน:</span>
                            <span className="text-lg font-black text-indigo-600">
                               ฿{(parseFloat(newAmount || "0") / (selectedMemberIds.length || 1)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                         </div>
                      </div>
                   )}
                </div>
             )}

             <button 
                onClick={addTransaction}
                disabled={isSaving}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
             >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingTransaction ? <Save className="w-5 h-5" /> : <Plus className="w-5 h-5" />)}
                {editingTransaction ? "บันทึกการแก้ไข" : "เพิ่มรายการ"}
             </button>
          </div>
       </div>
    </div>
  );
}
