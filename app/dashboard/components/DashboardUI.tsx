"use client";

import { Wallet, TrendingUp, TrendingDown, Receipt, Users, Plus, PiggyBank } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatCard } from "./StatCard";
import { User } from "../../../types";

export function DashboardHeader({ dash, tx, user, guests }: { 
  dash: { 
    activeDashboard: { id: string, name: string, type: "personal" | "split_bill" } | null, 
    setSetupMode: (m: "choose" | "create" | "join" | null) => void 
  }, 
  tx: { 
    resetForm: (m: { user_id: string }[]) => void, 
    setIsModalOpen: (o: boolean) => void 
  }, 
  user: User, 
  guests: { 
    members: { user_id: string }[], 
    setIsSettingsOpen: (o: boolean) => void 
  } 
}) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-2">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tight text-foreground">
            {dash.activeDashboard ? dash.activeDashboard.name : "วิเคราะห์การเงิน"}
          </h1>
          {dash.activeDashboard && (
            <span className={cn(
              "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm",
              dash.activeDashboard.type === "split_bill" ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
            )}>
              {dash.activeDashboard.type === "split_bill" ? "Split Bill" : "Personal"}
            </span>
          )}
        </div>
        <p className="text-muted text-sm md:text-lg font-medium">
          ยินดีต้อนรับกลับมา, <span className="text-foreground font-black underline decoration-accent/30 decoration-4 underline-offset-4">{user.user_metadata?.full_name?.split(' ')[0] || 'User'}</span>
        </p>
      </div>
      
      <div className="flex items-center gap-3 w-full md:w-auto">
        <div className="flex-1 md:flex-none flex items-center gap-2">
          <button 
            onClick={() => { tx.resetForm(guests.members); tx.setIsModalOpen(true); }} 
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20 active:scale-95"
          >
            <Plus className="w-5 h-5" /> เพิ่มรายการ
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => dash.setSetupMode("join")} className="p-3.5 bg-card border border-border rounded-2xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors shadow-sm"><Users className="w-5 h-5 text-muted" /></button>
          {dash.activeDashboard?.type === "split_bill" && <button onClick={() => guests.setIsSettingsOpen(true)} className="p-3.5 bg-card border border-border rounded-2xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-muted hover:text-indigo-500 shadow-sm"><PiggyBank className="w-5 h-5" /></button>}
        </div>
      </div>
    </div>
  );
}

export function PersonalStats({ balance, totalIncome, totalExpense, txCount }: { balance: number, totalIncome: number, totalExpense: number, txCount: number }) {
  return (
    <>
      <StatCard title="ยอดเงินคงเหลือ" value={`฿${balance.toLocaleString()}`} trend="ยอดรวมทั้งหมด" icon={<Wallet className="w-5 h-5" />} color="indigo" />
      <StatCard title="รายรับรวม" value={`฿${totalIncome.toLocaleString()}`} trend="จากทุกรายการ" icon={<TrendingUp className="w-5 h-5" />} color="emerald" />
      <StatCard title="รายจ่ายรวม" value={`฿${totalExpense.toLocaleString()}`} trend="จากทุกรายการ" icon={<TrendingDown className="w-5 h-5" />} color="pink" isNegative />
      <StatCard title="รายการทั้งหมด" value={txCount} trend="ใบเสร็จ/สลิป" icon={<Receipt className="w-5 h-5" />} color="indigo" />
    </>
  );
}

export function SplitStats({ debt, totalExpense }: { debt: { debts: { owed: { amount: number }[], owes: { amount: number }[] } }, totalExpense: number }) {
  const owed = debt.debts.owed.reduce((a: number, b: { amount: number }) => a + b.amount, 0);
  const owes = debt.debts.owes.reduce((a: number, b: { amount: number }) => a + b.amount, 0);
  return (
    <>
      <StatCard title="ยอดสุทธิในกลุ่ม" value={`฿${(owed - owes).toLocaleString()}`} trend={owed >= owes ? "คุณจะได้เงินคืน" : "คุณต้องจ่ายคืน"} icon={<Users className="w-5 h-5" />} color="indigo" className="col-span-2 lg:col-span-1" />
      <StatCard title="เพื่อนติดค้างคุณ" value={`฿${owed.toLocaleString()}`} trend={`${debt.debts.owed.length} คนที่ต้องคืนคุณ`} icon={<ArrowDownRight className="w-5 h-5 rotate-180" />} color="emerald" />
      <StatCard title="คุณติดค้างเพื่อน" value={`฿${owes.toLocaleString()}`} trend={`${debt.debts.owes.length} คนที่คุณต้องจ่าย`} icon={<ArrowUpRight className="w-5 h-5" />} color="pink" isNegative />
      <StatCard title="ค่าใช้จ่ายกลุ่ม" value={`฿${totalExpense.toLocaleString()}`} trend="ยอดรวมทั้งกลุ่ม" icon={<Receipt className="w-5 h-5" />} color="indigo" className="col-span-2 lg:col-span-1" />
    </>
  );
}

function ArrowUpRight({ className }: { className?: string }) {
  return <TrendingUp className={className} />;
}

function ArrowDownRight({ className }: { className?: string }) {
  return <TrendingDown className={className} />;
}
