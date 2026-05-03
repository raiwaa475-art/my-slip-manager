"use client";

import { useState, useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { format, subMonths } from "date-fns";
import { createClient } from "@/lib/supabase/client";

// Hooks
import { useDashboard } from "./hooks/useDashboard";
import { useTransactions } from "./hooks/useTransactions";
import { useDebts } from "./hooks/useDebts";
import { useGuestMembers } from "./hooks/useGuestMembers";

// Components
import { DashboardSidebar } from "./components/DashboardSidebar";
import { BottomNav } from "./components/BottomNav";
import { TransactionModal } from "./components/TransactionModal";
import { PaymentQRModal } from "./components/PaymentQRModal";
import { MembersList } from "./components/MembersList";
import { DashboardHeader, PersonalStats, SplitStats } from "./components/DashboardUI";
import { CalendarView, CategoryPieChart, GroupContributionChart, MonthlyTrendChart } from "./components/DashboardCharts";
import { TransactionList, DebtSummary } from "./components/TransactionList";
import { SettingsModal, SplitBillAlert, LoginRequiredView, SetupDashboardView } from "./components/DashboardModals";
import { User, DebtItem } from "../../types";
import { CATEGORIES } from "@/lib/constants";

const scrollbarStyles = `.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(155, 155, 155, 0.1); border-radius: 10px; } .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(155, 155, 155, 0.2); }`;

import { useAuth } from "../contexts/AuthContext";

export default function Dashboard() {
  const { user, loading: authLoading, dashboards, selectedDashboardId, setSelectedDashboardId } = useAuth();
  const [activeMonth] = useState(new Date());
  const [isMounted, setIsMounted] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<DebtItem | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const dash = useDashboard(user);
  const tx = useTransactions(user, dash.activeDashboard?.id || null);
  const guests = useGuestMembers(dash.activeDashboard, dash.setActiveDashboard);
  const debt = useDebts(user, tx.transactions, guests.members, guests.guestMembers, dash.activeDashboard?.type || null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (dash.loading || authLoading) return <div className="flex min-h-screen bg-background items-center justify-center"><Loader2 className="w-12 h-12 text-accent animate-spin" /></div>;
  if (!user) return <LoginRequiredView />;
  if (dash.setupMode) return <SetupDashboardView dash={dash} />;

  const totalIncome = tx.transactions.filter(t => t.amount > 0).reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = Math.abs(tx.transactions.filter(t => t.amount < 0).reduce((acc, t) => acc + t.amount, 0));
  
  const categoryData = CATEGORIES.filter(c => c.id !== "รายรับ").map(cat => ({
    name: cat.label, 
    value: Math.abs(tx.transactions.filter(t => t.category === cat.id && t.amount < 0).reduce((acc, t) => acc + t.amount, 0)), 
    color: cat.color 
  })).filter(c => c.value > 0);

  const trendData = Array.from({ length: 5 }).map((_, i) => {
    const d = subMonths(new Date(), 4 - i);
    const mStr = format(d, "yyyy-MM");
    return { 
      name: format(d, "MMM"), 
      income: tx.transactions.filter(t => t.date.startsWith(mStr) && t.amount > 0).reduce((acc, t) => acc + t.amount, 0),
      spent: Math.abs(tx.transactions.filter(t => t.date.startsWith(mStr) && t.amount < 0).reduce((acc, t) => acc + t.amount, 0))
    };
  });

  return (
    <div className="flex min-h-screen bg-background text-foreground transition-colors">
      <style>{scrollbarStyles}</style>
      <DashboardSidebar user={user} dashboards={dash.dashboards} activeDashboard={dash.activeDashboard} setActiveDashboard={dash.setActiveDashboard} setSetupMode={dash.setSetupMode} handleDeleteDashboard={dash.handleDeleteDashboard} handleLeaveDashboard={dash.handleLeaveDashboard} />

      <main className="flex-1 overflow-y-auto p-4 pt-24 pb-32 md:p-8 lg:p-10 xl:p-14 md:pt-8">
        <div className="max-w-[1600px] mx-auto space-y-6 md:space-y-10">
          <DashboardHeader dash={dash} tx={tx} user={user} guests={guests} />
          {dash.activeDashboard?.type === "split_bill" && guests.members.length <= 1 && <SplitBillAlert dashboardId={dash.activeDashboard.id} />}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {dash.activeDashboard?.type === "split_bill" ? <SplitStats debt={debt} totalExpense={totalExpense} /> : <PersonalStats balance={totalIncome - totalExpense} totalIncome={totalIncome} totalExpense={totalExpense} txCount={tx.transactions.length} />}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
            <div className="lg:col-span-2 xl:col-span-3 glass rounded-3xl p-5 md:p-8 border border-border bg-card/50">
              {dash.activeDashboard?.type !== "split_bill" ? <CalendarView activeMonth={activeMonth} transactions={tx.transactions} /> : <GroupContributionChart isMounted={isMounted} members={guests.members} transactions={tx.transactions} userId={user.id} />}
            </div>
            <CategoryPieChart isMounted={isMounted} data={categoryData} totalExpense={totalExpense} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {dash.activeDashboard?.type !== "split_bill" ? <MonthlyTrendChart isMounted={isMounted} data={trendData} /> : (debt.debts.owes.length > 0 || debt.debts.owed.length > 0) && <DebtSummary debts={debt.debts} onCollect={(d: DebtItem) => { setSelectedDebt(d); setIsPaymentModalOpen(true); }} />}
            {dash.activeDashboard?.type === "split_bill" && <MembersList {...guests} user={user} activeDashboard={dash.activeDashboard} />}
            <TransactionList transactions={tx.transactions} onEdit={tx.handleEdit} onDelete={tx.deleteTransaction} />
          </div>
        </div>
      </main>

      <TransactionModal isOpen={tx.isModalOpen} onClose={() => tx.setIsModalOpen(false)} {...tx} members={guests.members} guestMembers={guests.guestMembers} user={user} categories={CATEGORIES} />
      <PaymentQRModal 
        isOpen={isPaymentModalOpen} 
        onClose={() => setIsPaymentModalOpen(false)} 
        selectedDebt={selectedDebt} 
        promptPayId={guests.promptPayId} 
        paymentType={guests.paymentType}
        bankAccountNumber={guests.bankAccountNumber}
        bankName={guests.bankName}
        getTransactionBreakdown={debt.getTransactionBreakdown} 
        setIsSettingsOpen={guests.setIsSettingsOpen} 
      />
      <SettingsModal 
        isOpen={guests.isSettingsOpen} 
        onClose={() => guests.setIsSettingsOpen(false)} 
        promptPayId={guests.promptPayId} 
        setPromptPayId={guests.setPromptPayId} 
        paymentType={guests.paymentType}
        setPaymentType={guests.setPaymentType}
        bankAccountNumber={guests.bankAccountNumber}
        setBankAccountNumber={guests.setBankAccountNumber}
        bankName={guests.bankName}
        setBankName={guests.setBankName}
        onSave={guests.savePaymentSettings} 
      />
      <BottomNav user={user} dashboards={dash.dashboards} activeDashboard={dash.activeDashboard} setActiveDashboard={dash.setActiveDashboard} setSetupMode={dash.setSetupMode} />
    </div>
  );
}
