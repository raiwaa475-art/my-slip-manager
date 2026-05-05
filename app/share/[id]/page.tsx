"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Share2, ArrowLeft, Users, Receipt, QrCode } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Components
import { DebtSummary } from "@/app/dashboard/components/TransactionList";
import { TransactionList } from "@/app/dashboard/components/TransactionList";
import { PaymentQRModal } from "@/app/dashboard/components/PaymentQRModal";
import { calculateGroupDebts } from "@/lib/debt-utils";
import { Dashboard, Transaction, DebtItem, DebtSummary as DebtSummaryType } from "@/types";
import { CATEGORIES } from "@/lib/constants";

export default function SharePage() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedDebt, setSelectedDebt] = useState<DebtItem | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isRepay, setIsRepay] = useState(false);
  
  const supabase = useMemo(() => createClient(), []);

  const members = useMemo(() => {
    if (!dashboard) return [];
    // Extract unique members from transactions
    const ids = new Set<string>();
    transactions.forEach(tx => {
      ids.add(tx.user_id);
      tx.metadata?.split_between?.forEach((id: string) => ids.add(id));
    });
    return Array.from(ids);
  }, [dashboard, transactions]);

  const handleSettle = async (debt: DebtItem) => {
    if (!id) return;
    
    const amount = debt.amount;
    const name = isRepay ? `ชำระคืนให้ ${debt.userId.startsWith('guest:') ? debt.userId.replace('guest:', '') : 'เพื่อน'}` : `รับชำระจาก ${debt.userId.startsWith('guest:') ? debt.userId.replace('guest:', '') : 'เพื่อน'}`;
    
    const txData = {
      user_id: dashboard?.created_by, // Use owner's ID or a generic one if RLS allows public insert
      dashboard_id: id,
      name,
      amount: isRepay ? -amount : amount,
      date: format(new Date(), "yyyy-MM-dd"),
      category: "อื่นๆ",
      metadata: {
        settlement: true,
        debtor_id: isRepay ? 'public' : debt.userId,
        creditor_id: isRepay ? debt.userId : 'public'
      }
    };

    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert(txData)
        .select()
        .single();
      
      if (error) throw error;
      
      setTransactions([data, ...transactions]);
      setIsPaymentModalOpen(false);
      alert("บันทึกการชำระเงินเรียบร้อย");
    } catch (err) {
      console.error("Error settling debt in share page:", err);
      alert("เกิดข้อผิดพลาด (คุณอาจต้องเข้าสู่ระบบเพื่อดำเนินการนี้)");
    }
  };

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch Dashboard
        const { data: dash, error: dashErr } = await supabase
          .from('dashboards')
          .select('*')
          .eq('id', id)
          .single();
        
        if (dashErr) throw dashErr;
        setDashboard(dash);

        // Fetch Transactions
        const { data: txs, error: txsErr } = await supabase
          .from('transactions')
          .select('*')
          .eq('dashboard_id', id)
          .order('date', { ascending: false });
        
        if (txsErr) throw txsErr;
        setTransactions(txs || []);
      } catch (err) {
        console.error("Error fetching share data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, supabase]);

  const debts = useMemo(() => {
    return calculateGroupDebts(transactions);
  }, [transactions]);

  const getTransactionBreakdown = (debtId: string) => {
    return transactions.filter(tx => {
      if (tx.amount >= 0) return false;
      const splitBetween = tx.metadata?.split_between || [];
      return splitBetween.includes(debtId);
    }).map(tx => ({
      name: tx.name,
      amount: Math.abs(tx.amount) / (tx.metadata?.split_between?.length || 1),
      date: tx.date
    }));
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background items-center justify-center">
        <Loader2 className="w-12 h-12 text-accent animate-spin" />
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center p-6 text-center">
        <h1 className="text-2xl font-black mb-4">ไม่พบข้อมูลกลุ่ม</h1>
        <p className="text-muted mb-8">ลิงก์อาจไม่ถูกต้องหรือกลุ่มถูกลบไปแล้ว</p>
        <Link href="/" className="px-6 py-3 bg-accent text-white rounded-2xl font-bold">กลับหน้าแรก</Link>
      </div>
    );
  }

  const myOwes = (debts.allTransfers || []).filter(t => t.from === selectedMemberId);
  const myTotalOwes = myOwes.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-black text-lg leading-tight uppercase tracking-tight">เรียกเก็บเงินกลุ่ม</h1>
            <p className="text-[10px] font-bold text-accent uppercase tracking-widest">{dashboard.name}</p>
          </div>
        </div>
      </nav>
 
      <main className="max-w-4xl mx-auto px-4 md:px-6 pt-24 md:pt-28 pb-10 space-y-6 md:space-y-8">
        <div className="glass rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-12 border border-border bg-white dark:bg-card/50 relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
          <div className="relative z-10">
            <p className="text-[10px] font-black text-accent uppercase tracking-[0.15em] md:tracking-[0.2em] mb-4">โปรดเลือกชื่อของคุณเพื่อดูยอดที่ต้องจ่าย</p>
            
            <div className="flex flex-wrap gap-2 mb-6 md:mb-8">
               {members.map(id => (
                 <button 
                  key={id}
                  onClick={() => setSelectedMemberId(id === selectedMemberId ? null : id)}
                  className={cn(
                    "px-3 py-2 md:px-4 md:py-2 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest border transition-all",
                    selectedMemberId === id 
                      ? "bg-accent text-white border-accent shadow-lg shadow-accent/20" 
                      : "bg-card text-muted border-border hover:border-accent/50"
                  )}
                 >
                   {id.startsWith('guest:') ? id.replace('guest:', '') : `สมาชิก (${id.substring(0, 4)})`}
                 </button>
               ))}
            </div>
 
            {selectedMemberId ? (
              <div className="space-y-2 animate-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-2xl md:text-6xl font-black tracking-tighter uppercase leading-tight md:leading-none">
                  {myTotalOwes > 0 ? `คุณต้องจ่าย ฿${myTotalOwes.toLocaleString()}` : "คุณไม่มียอดค้างชำระ"}
                </h2>
                <p className="text-muted text-sm md:text-lg font-medium">
                  {myTotalOwes > 0 ? "กดดู QR หรือเลขบัญชีเพื่อโอนเงินคืนเพื่อน" : "ยอดเงินของคุณเรียบร้อยดีแล้ว"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <h2 className="text-2xl md:text-6xl font-black tracking-tighter uppercase leading-tight md:leading-none">สรุปยอดเงินกลุ่ม</h2>
                <p className="text-muted text-sm md:text-lg font-medium">แสดงรายการหนี้ทั้งหมดและรายการโอนเงินล่าสุด</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
           <DebtSummary 
            debts={debts} 
            userId={selectedMemberId || ""} 
            onCollect={(d) => { setSelectedDebt(d); setIsRepay(false); setIsPaymentModalOpen(true); }}
            onRepay={(d) => { setSelectedDebt(d); setIsRepay(true); setIsPaymentModalOpen(true); }}
           />

           <TransactionList 
              transactions={transactions}
              onEdit={() => {}} // Disabled in public view
              onDelete={() => {}} // Disabled in public view
           />
        </div>
      </main>

      <PaymentQRModal 
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        selectedDebt={selectedDebt}
        promptPayId={dashboard.metadata?.promptpay_id || ""}
        paymentType={dashboard.metadata?.payment_type || 'promptpay'}
        bankAccountNumber={dashboard.metadata?.bank_account_number || ""}
        bankName={dashboard.metadata?.bank_name || ""}
        getTransactionBreakdown={getTransactionBreakdown}
        setIsSettingsOpen={() => {}} // Disabled in public view
        onSettle={handleSettle}
        isRepay={isRepay}
      />

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
         <button 
          onClick={() => {
            navigator.share({
              title: `สรุปยอดหนี้กลุ่ม ${dashboard.name}`,
              url: window.location.href
            }).catch(() => {
              navigator.clipboard.writeText(window.location.href);
              alert("คัดลอกลิงก์แล้ว!");
            });
          }}
          className="flex items-center gap-3 bg-foreground text-background px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl active:scale-95 transition-all"
         >
           <Share2 className="w-5 h-5" /> Share this page
         </button>
      </div>
    </div>
  );
}
