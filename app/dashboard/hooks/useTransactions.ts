"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { format, subMonths } from "date-fns";
import { useAuth } from "@/app/contexts/AuthContext";
import type { Transaction, User } from "../../../types";
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
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('dashboard_id', dashboardId)
        .order('date', { ascending: false })
        .limit(500);

      if (error) {
        console.error(`❌ [fetchTransactions] Error for dashboard ${dashboardId}:`, {
          message: error.message,
          code: error.code,
          hint: error.hint,
          details: error.details
        });
        throw error;
      }
      console.log(`✅ [fetchTransactions] Loaded ${data?.length ?? 0} transactions for dashboard ${dashboardId}`);
      setTransactions(data || []);
    } catch (err) {
      console.error("Error fetching transactions:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);


  useEffect(() => {
    let isMounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const handleRealtimeChange = async (payload: RealtimePostgresChangesPayload<Transaction>) => {
      if (!isMounted) return;
      console.log('✨ [Realtime] Change received:', payload.eventType, payload);

      // ถ้า INSERT/UPDATE ให้ refetch ทันทีเพื่อความถูกต้อง (Supabase อาจส่ง payload ไม่ครบถ้าไม่ตั้ง REPLICA IDENTITY FULL)
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        if (activeDashboardId) {
          console.log('[Realtime] Refetching transactions after change...');
          await fetchTransactions(activeDashboardId);
        } else if (user) {
          // Personal view refetch
          setLoading(true);
          const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', user.id)
            .order('date', { ascending: false })
            .limit(100);
          if (!error && isMounted) setTransactions(data || []);
          if (isMounted) setLoading(false);
        }
      } else if (payload.eventType === 'DELETE') {
        // DELETE สามารถใช้ optimistic update ได้เพราะมี old.id เสมอ
        setTransactions(prev => prev.filter(t => t.id !== payload.old.id));
      }
    };

    if (activeDashboardId) {
      console.log(`📂 [Dashboard] Switching to Dashboard: ${activeDashboardId}`);
      fetchTransactions(activeDashboardId);

      channel = supabase
        .channel(`transactions-dash-${activeDashboardId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'transactions',
            filter: `dashboard_id=eq.${activeDashboardId}`
          },
          handleRealtimeChange
        )
        .subscribe((status: string) => {
          console.log(`📡 [Realtime] Status for dashboard ${activeDashboardId}:`, status);
        });

    } else if (user) {
      console.log(`👤 [Dashboard] Personal view for user: ${user.id}`);
      const fetchUserTransactions = async () => {
        setLoading(true);
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(100);
        if (error) console.error('❌ [Dashboard] Error fetching personal transactions:', error);
        if (isMounted) {
          setTransactions(data || []);
          setLoading(false);
        }
      };
      fetchUserTransactions();

      channel = supabase
        .channel(`transactions-user-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'transactions',
            filter: `user_id=eq.${user.id}`
          },
          handleRealtimeChange
        )
        .subscribe((status: string) => {
          console.log(`📡 [Realtime] Status for user ${user.id}:`, status);
        });
    }

    return () => {
      isMounted = false;
      if (channel) {
        console.log('[Realtime] Cleaning up channel...');
        supabase.removeChannel(channel);
      }
    };
  }, [activeDashboardId, user, fetchTransactions, supabase]);

  const resetForm = (members: { user_id: string }[] = []) => {
    setNewName("");
    setNewAmount("");
    setNewDate(format(new Date(), "yyyy-MM-dd"));
    setNewCategory("อาหาร");
    setIsSplit(false);
    setSelectedMemberIds(members.map(m => m.user_id));
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

    // Validation
    if (isNaN(amount) || amount <= 0) {
      toast("กรุณาระบุจำนวนเงินที่ถูกต้อง", "error");
      setIsSaving(false);
      return;
    }

    if (amount > 100_000_000) {
      toast("จำนวนเงินสูงเกินไป (สูงสุด 100 ล้าน)", "error");
      setIsSaving(false);
      return;
    }

    const finalAmount = amount;
    
    const txData: Partial<Transaction> = {
      user_id: user.id,
      name: isSplit ? `${newName} (หาร ${selectedMemberIds.length} คน)` : newName,
      date: newDate,
      amount: newCategory === "รายรับ" ? Math.abs(finalAmount) : -Math.abs(finalAmount),
      category: newCategory,
      receiver: newName,
      metadata: isSplit ? { split_between: selectedMemberIds } : undefined,
      dashboard_id: activeDashboardId || undefined
    };

    try {
      if (editingTransaction) {
        const { error } = await supabase
          .from('transactions')
          .update(txData)
          .eq('id', editingTransaction.id);
        if (error) throw error;
        setTransactions(transactions.map(t => t.id === editingTransaction.id ? { ...t, ...txData } : t));
      } else {
        const { data, error } = await supabase
          .from('transactions')
          .insert(txData)
          .select()
          .single();
        if (error) throw error;
        setTransactions([data, ...transactions]);
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
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      setTransactions(transactions.filter(t => t.id !== id));
    } catch (err) {
      console.error("Error deleting transaction:", err);
      toast("ลบไม่สำเร็จ", "error");
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
    deleteTransaction
  };
}
