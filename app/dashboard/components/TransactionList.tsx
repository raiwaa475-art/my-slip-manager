"use client";

import { Receipt, Pencil, Trash2, Users } from "lucide-react";
import { format } from "date-fns";
import { Transaction, DebtItem } from "../../../types";
import type { DebtSummary as DebtSummaryType } from "../../../types";
import { cn } from "@/lib/utils";

export function TransactionList({ transactions, onEdit, onDelete }: { transactions: Transaction[], onEdit: (tx: Transaction) => void, onDelete: (id: string) => void }) {
  return (
    <div id="transaction-list" className="glass rounded-3xl overflow-hidden border border-border bg-card/50 flex flex-col">
       <div className="p-5 md:p-8 border-b border-border flex justify-between items-center bg-card/50">
         <div className="flex items-center gap-2">
           <Receipt className="w-5 h-5 text-accent" />
           <h3 className="font-bold text-lg">รายการล่าสุด</h3>
         </div>
         <button className="text-accent text-sm font-bold hover:underline">ดูทั้งหมด</button>
       </div>
       <div className="overflow-x-auto flex-1 max-h-[400px]">
          <table className="w-full">
             <thead className="hidden md:table-header-group sticky top-0 bg-card z-10">
               <tr className="bg-black/5 dark:bg-white/5 text-[10px] uppercase tracking-widest text-muted">
                 <th className="px-6 py-4 text-left font-semibold">รายการ</th>
                 <th className="px-6 py-4 text-left font-semibold">วันที่</th>
                 <th className="px-6 py-4 text-left font-semibold">หมวดหมู่</th>
                 <th className="px-6 py-4 text-right font-semibold">จำนวนเงิน</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-border">
                {transactions.length > 0 ? transactions.map((tx: Transaction) => (
                  <tr key={tx.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors group block md:table-row border-b border-border/50 md:border-none">
                     <td className="px-4 py-6 md:px-6 md:py-4 flex flex-col md:table-cell">
                        <div className="flex items-center justify-between gap-4 md:hidden mb-4">
                           <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-sm border", 
                                tx.amount > 0 
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                                  : "bg-card border-border text-foreground"
                              )}>
                                {tx.name[0]}
                              </div>
                              <div className="flex flex-col">
                                 <span className="font-black text-base leading-tight">{tx.name}</span>
                                 <span className="text-[10px] font-bold text-muted uppercase tracking-wider mt-1">
                                   {format(new Date(tx.date), "dd MMM yyyy")} • {tx.category}
                                 </span>
                              </div>
                           </div>
                           <div className={cn("font-black text-lg text-right tracking-tighter", tx.amount > 0 ? "text-emerald-600" : "")}>
                              {tx.amount > 0 ? "+" : ""}{tx.amount.toLocaleString()} ฿
                           </div>
                        </div>

                        {/* Desktop Layout (md+) */}
                        <div className="hidden md:flex items-center gap-4">
                           <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-bold", tx.amount > 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-card border border-border")}>
                              {tx.name[0]}
                           </div>
                           <span className="font-bold">{tx.name}</span>
                        </div>

                        {/* Mobile Actions */}
                        <div className="flex md:hidden items-center gap-2 mt-2">
                           <button onClick={() => onEdit(tx)} className="flex-1 py-2.5 bg-black/5 dark:bg-white/5 text-muted hover:text-amber-600 rounded-xl text-xs font-black uppercase tracking-widest transition-colors border border-transparent hover:border-amber-500/20">แก้ไข</button>
                           <button onClick={() => onDelete(tx.id)} className="flex-1 py-2.5 bg-black/5 dark:bg-white/5 text-muted hover:text-red-500 rounded-xl text-xs font-black uppercase tracking-widest transition-colors border border-transparent hover:border-red-500/20">ลบ</button>
                        </div>
                     </td>
                     <td className="px-6 py-4 text-sm text-muted hidden md:table-cell">{tx.date}</td>
                     <td className="px-6 py-4 hidden md:table-cell">
                        <span className="px-3 py-1 rounded-full bg-card border border-border text-xs font-medium">{tx.category}</span>
                     </td>
                     <td className={cn("px-6 py-4 text-right font-black hidden md:table-cell", tx.amount > 0 ? "text-emerald-600" : "")}>
                        <div className="flex items-center justify-end gap-6">
                           <span className="text-lg">{tx.amount > 0 ? "+" : ""}{tx.amount.toLocaleString()} ฿</span>
                           <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                              <button onClick={() => onEdit(tx)} className="p-2 bg-amber-500/10 text-amber-600 rounded-lg transition-colors hover:bg-amber-500/20"><Pencil className="w-4 h-4" /></button>
                              <button onClick={() => onDelete(tx.id)} className="p-2 bg-red-500/10 text-red-500 rounded-lg transition-colors hover:bg-red-500/20"><Trash2 className="w-4 h-4" /></button>
                           </div>
                        </div>
                     </td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} className="p-12 text-center text-muted italic">ไม่มีรายการ</td></tr>
                )}
             </tbody>
          </table>
       </div>
    </div>
  );
}

export function DebtSummary({ debts, onCollect, onRepay }: { debts: DebtSummaryType, onCollect: (d: DebtItem) => void, onRepay: (d: DebtItem) => void }) {
  return (
    <div className="glass rounded-3xl p-5 md:p-8 border border-border bg-card/50">
       <div className="flex items-center gap-2 mb-6"><Users className="w-5 h-5 text-indigo-500" /><h3 className="font-bold text-lg">สรุปยอดหนี้ในกลุ่ม</h3></div>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {debts.owed.map((d, i) => (
            <div key={i} className="flex justify-between items-center p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-600 text-xs font-bold">
                  {d.userId.startsWith('guest:') ? d.userId.replace('guest:', '')[0].toUpperCase() : d.userId.substring(0, 2).toUpperCase()}
                </div>
                <span className="text-sm font-medium">{d.userId.startsWith('guest:') ? d.userId.replace('guest:', '') : `เพื่อนรหัส ${d.userId.substring(0, 6)}`}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-black text-emerald-600">฿{d.amount.toLocaleString()}</span>
                <button onClick={() => onCollect(d)} className="px-3 py-1 bg-emerald-600 text-white text-[10px] font-black rounded-lg">เรียกเก็บ</button>
              </div>
            </div>
          ))}
          {debts.owes.map((d, i) => (
            <div key={i} className="flex justify-between items-center p-4 rounded-2xl bg-pink-500/5 border border-pink-500/10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-600 text-xs font-bold">
                  {d.userId.startsWith('guest:') ? d.userId.replace('guest:', '')[0].toUpperCase() : d.userId.substring(0, 2).toUpperCase()}
                </div>
                <span className="text-sm font-medium">{d.userId.startsWith('guest:') ? d.userId.replace('guest:', '') : `เพื่อนรหัส ${d.userId.substring(0, 6)}`}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-black text-pink-600">฿{d.amount.toLocaleString()}</span>
                <button onClick={() => onRepay(d)} className="px-3 py-1 bg-pink-600 text-white text-[10px] font-black rounded-lg">ชำระคืน</button>
              </div>
            </div>
          ))}
       </div>
    </div>
  );
}
