"use client";

import { useState, useEffect, useCallback } from "react";
import { User, Transaction, DebtSummary, DebtItem } from "../../../types";
import { calculateGroupDebts } from "@/lib/debt-utils";

export function useDebts(user: User | null, transactions: Transaction[], members: { user_id: string }[], guestMembers: string[], dashboardType: string | null) {
  const [debts, setDebts] = useState<DebtSummary>({ owes: [], owed: [] });

  const calculateDebts = useCallback(() => {
    if (!user || !dashboardType || dashboardType !== "split_bill") return;

    const splitTxs = transactions.filter(t => t.metadata?.split_between && t.metadata.split_between.length > 0);
    const balances: Record<string, number> = {};

    const result = calculateGroupDebts(transactions);
    const transfers = result.allTransfers || [];
    
    // 4. Filter for current user
    const owes: DebtItem[] = transfers
      .filter(t => t.from === user.id)
      .map(t => ({ userId: t.to, amount: t.amount, isGuest: t.to.startsWith('guest:') }));

    const owed: DebtItem[] = transfers
      .filter(t => t.to === user.id)
      .map(t => ({ userId: t.from, amount: t.amount, isGuest: t.from.startsWith('guest:') }));

    setDebts({ owes, owed, allTransfers: transfers });
  }, [user, dashboardType, transactions]);

  useEffect(() => {
    if (dashboardType === "split_bill") {
      calculateDebts();
    }
  }, [transactions, members, guestMembers, dashboardType, calculateDebts]);

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

  return { debts, calculateDebts, getTransactionBreakdown };
}
