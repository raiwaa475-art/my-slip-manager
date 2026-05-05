"use client";

import { Wallet, TrendingUp, TrendingDown, Receipt, Users, Plus, PiggyBank, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatCard } from "./StatCard";
import { User } from "../../../types";

export function DashboardHeader({ dash, tx, user, guests }: { 
  dash: { 
    activeDashboard: { id: string, name: string, type: "personal" | "split_bill" } | null, 
    setSetupMode: (m: "choose" | "create" | "join" | null) => void 
  }, 
  tx: { 
    resetForm: (m: { user_id: string }[], gm: string[]) => void, 
    setIsModalOpen: (o: boolean) => void 
  }, 
  user: User, 
  guests: { 
    members: { user_id: string }[], 
    guestMembers: string[],
    setIsSettingsOpen: (o: boolean) => void 
  } 
}) {
  return (
    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10 pb-6 border-b border-border/50">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-foreground leading-none">
            {dash.activeDashboard ? dash.activeDashboard.name : "วิเคราะห์การเงิน"}
          </h1>
          {dash.activeDashboard && (
            <span className={cn(
              "px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border shadow-sm backdrop-blur-md",
              dash.activeDashboard.type === "split_bill" ? "bg-accent/10 text-accent border-accent/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
            )}>
              {dash.activeDashboard.type === "split_bill" ? "Split Bill" : "Personal Mode"}
            </span>
          )}
        </div>
        <p className="text-muted text-lg md:text-xl font-medium tracking-tight">
          Welcome back, <span className="text-foreground font-black underline decoration-accent/30 decoration-8 underline-offset-4">{user.user_metadata?.full_name?.split(' ')[0] || 'User'}</span>. Here's your overview.
        </p>
      </div>
      
      <div className="flex items-center gap-4 w-full lg:w-auto">
        <button 
          onClick={() => { tx.resetForm(guests.members, guests.guestMembers); tx.setIsModalOpen(true); }} 
          className="flex-1 lg:flex-none flex items-center justify-center gap-3 bg-accent hover:bg-accent/90 text-white px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] transition-all shadow-2xl shadow-accent/20 active:scale-95"
        >
          <Plus className="w-6 h-6" /> Add Transaction
        </button>
        <div className="flex items-center gap-3">
          <button onClick={() => dash.setSetupMode("join")} className="p-5 bg-card border border-border/50 rounded-2xl hover:bg-accent/5 hover:border-accent/30 transition-all shadow-sm group">
            <Users className="w-6 h-6 text-muted group-hover:text-accent transition-colors" />
          </button>
          {dash.activeDashboard?.type === "split_bill" && (
            <>
              <button 
                onClick={() => window.open(`/share/${dash.activeDashboard!.id}`, '_blank')}
                className="p-5 bg-card border border-border/50 rounded-2xl hover:bg-accent/5 hover:border-accent/30 transition-all text-muted hover:text-accent shadow-sm group"
                title="แชร์สรุปยอดหนี้"
              >
                <Share2 className="w-6 h-6 group-hover:scale-110 transition-transform" />
              </button>
              <button onClick={() => guests.setIsSettingsOpen(true)} className="p-5 bg-card border border-border/50 rounded-2xl hover:bg-accent/5 hover:border-accent/30 transition-all text-muted hover:text-accent shadow-sm group">
                <PiggyBank className="w-6 h-6 group-hover:scale-110 transition-transform" />
              </button>
            </>
          )}
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
