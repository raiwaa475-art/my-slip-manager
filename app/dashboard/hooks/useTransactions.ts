"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { format, subMonths } from "date-fns";
import { useAuth } from "@/app/contexts/AuthContext";
import type { Transaction, User, DebtItem } from "../../../types";
import { useToast } from "@/app/components/ui/Toast";
import { useConfirm } from "@/app/components/ui/ConfirmDialog";

import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

export function useTransactions(user: User | null, activeDashboardId: string | null) {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form State
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newDate, setNewDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [newCategory, setNewCategory] = useState("อาหาร");
  const [isSplit, setIsSplit] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  const { supabase } = useAuth();

  const fetchTransactions = useCallback(async (dashboardId: string) => {
    setLoading(true);
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      const tokenStr = localStorage.getItem('sb-vjbzujwtwshhrisazoyx-auth-token');
      let accessToken = anonKey;
      if (tokenStr) {
         try { accessToken = JSON.parse(tokenStr).access_token || anonKey; } catch (e) {}
      }

      const response = await fetch(
        `${supabaseUrl}/rest/v1/transactions?dashboard_id=eq.${dashboardId}&select=*&order=date.desc`,
        {
          headers: {
            'apikey': anonKey!,
            'Authorization': `Bearer ${accessToken}`,
            'Cache-Control': 'no-cache'
          },
          cache: 'no-store'
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      const data = await response.json();
      console.log(`✅ [fetchTransactions] Loaded ${data?.length ?? 0} transactions via Raw Fetch`);
      setTransactions(data || []);
    } catch (err) {
      console.error("Error fetching transactions:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 🔔 Realtime Subscription
  useEffect(() => {
    if (!activeDashboardId) return;

    fetchTransactions(activeDashboardId);

    const channel = supabase
      .channel(`transactions-db-changes-${activeDashboardId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'transactions',
          filter: `dashboard_id=eq.${activeDashboardId}`
        },
        () => {
          console.log('✨ [Realtime] Transactions changed, refetching...');
          setTimeout(() => fetchTransactions(activeDashboardId), 500);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeDashboardId, fetchTransactions, supabase]);





  const resetForm = (members: { user_id: string }[] = [], guestMembers: string[] = []) => {
    setNewName("");
    setNewAmount("");
    setNewDate(format(new Date(), "yyyy-MM-dd"));
    setNewCategory("อาหาร");
    setIsSplit(false);
    
    // Include both real members and guest members in default split
    const realIds = members.map(m => m.user_id);
    const guestIds = guestMembers.map(name => `guest:${name}`);
    setSelectedMemberIds([...realIds, ...guestIds]);
    
    setEditingTransaction(null);
  };

  const handleEdit = (tx: Transaction) => {
    setEditingTransaction(tx);
    setNewName(tx.receiver || tx.name.replace(/\s*\(หาร\s*\d+\s*คน\)$/, ''));
    setNewAmount(Math.abs(tx.amount).toString());
    setNewDate(tx.date);
    setNewCategory(tx.category);
    
    // Handle split metadata if exists
    if (tx.metadata?.split_between) {
      setIsSplit(true);
      setSelectedMemberIds(tx.metadata.split_between);
    } else {
      setIsSplit(false);
    }
    
    setIsModalOpen(true);
  };

  const addTransaction = async () => {
    if (!newName || !newAmount || !user) return;
    
    setIsSaving(true);
    const amount = parseFloat(newAmount);

    if (isNaN(amount) || amount <= 0) {
      toast("กรุณาระบุจำนวนเงินที่ถูกต้อง", "error");
      setIsSaving(false);
      return;
    }

    const txData: Partial<Transaction> = {
      user_id: user.id,
      name: isSplit ? `${newName} (หาร ${selectedMemberIds.length} คน)` : newName,
      date: newDate,
      amount: newCategory === "รายรับ" ? Math.abs(amount) : -Math.abs(amount),
      category: newCategory,
      receiver: newName,
      metadata: isSplit ? { split_between: selectedMemberIds } : undefined,
      dashboard_id: activeDashboardId || undefined
    };

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      const tokenStr = localStorage.getItem('sb-vjbzujwtwshhrisazoyx-auth-token');
      let accessToken = anonKey;
      if (tokenStr) {
         try { accessToken = JSON.parse(tokenStr).access_token || anonKey; } catch (e) {}
      }

      if (editingTransaction) {
        const response = await fetch(`${supabaseUrl}/rest/v1/transactions?id=eq.${editingTransaction.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': anonKey!,
            'Authorization': `Bearer ${accessToken}`,
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(txData)
        });
        if (!response.ok) throw new Error(await response.text());
        const data = await response.json();
        setTransactions(transactions.map(t => t.id === editingTransaction.id ? data[0] : t));
      } else {
        const response = await fetch(`${supabaseUrl}/rest/v1/transactions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': anonKey!,
            'Authorization': `Bearer ${accessToken}`,
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(txData)
        });
        if (!response.ok) throw new Error(await response.text());
        const data = await response.json();
        setTransactions([data[0], ...transactions]);
      }
      
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error("Error saving transaction:", err);
      toast("เกิดข้อผิดพลาดในการบันทึก", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteTransaction = async (id: string) => {
    const isConfirmed = await confirm({
      title: "ยืนยันการลบ",
      message: "ยืนยันการลบรายการนี้? การดำเนินการนี้ไม่สามารถย้อนกลับได้",
      variant: "danger",
      confirmText: "ลบรายการ",
      cancelText: "ยกเลิก"
    });
    
    if (!isConfirmed) return;
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      const tokenStr = localStorage.getItem('sb-vjbzujwtwshhrisazoyx-auth-token');
      let accessToken = anonKey;
      if (tokenStr) {
         try { accessToken = JSON.parse(tokenStr).access_token || anonKey; } catch (e) {}
      }

      const response = await fetch(`${supabaseUrl}/rest/v1/transactions?id=eq.${id}`, {
        method: 'DELETE',
        headers: {
          'apikey': anonKey!,
          'Authorization': `Bearer ${accessToken}`
        }
      });
      if (!response.ok) throw new Error(await response.text());
      setTransactions(transactions.filter(t => t.id !== id));
    } catch (err) {
      console.error("Error deleting transaction:", err);
      toast("ลบไม่สำเร็จ", "error");
    }
  };

  const settleDebt = async (debt: DebtItem, isRepay: boolean) => {
    if (!user || !activeDashboardId) return;
    
    setIsSaving(true);
    const amount = debt.amount;
    const name = isRepay ? `ชำระคืนให้ ${debt.userId.startsWith('guest:') ? debt.userId.replace('guest:', '') : 'เพื่อน'}` : `รับชำระจาก ${debt.userId.startsWith('guest:') ? debt.userId.replace('guest:', '') : 'เพื่อน'}`;
    
    const txData: Partial<Transaction> = {
      user_id: user.id,
      dashboard_id: activeDashboardId,
      name,
      amount: isRepay ? -amount : amount,
      date: format(new Date(), "yyyy-MM-dd"),
      category: "อื่นๆ",
      metadata: {
        settlement: true,
        debtor_id: isRepay ? user.id : debt.userId,
        creditor_id: isRepay ? debt.userId : user.id
      }
    };

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      const tokenStr = localStorage.getItem('sb-vjbzujwtwshhrisazoyx-auth-token');
      let accessToken = anonKey;
      if (tokenStr) {
         try { accessToken = JSON.parse(tokenStr).access_token || anonKey; } catch (e) {}
      }

      const response = await fetch(`${supabaseUrl}/rest/v1/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey!,
          'Authorization': `Bearer ${accessToken}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(txData)
      });
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      setTransactions([data[0], ...transactions]);
      toast("บันทึกการชำระเงินเรียบร้อย", "success");
      setIsModalOpen(false);
    } catch (err) {
      console.error("Error settling debt:", err);
      toast("เกิดข้อผิดพลาดในการบันทึก", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return {
    transactions,
    setTransactions,
    loading,
    isModalOpen,
    setIsModalOpen,
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
    resetForm,
    handleEdit,
    addTransaction,
    deleteTransaction,
    settleDebt
  };
}
