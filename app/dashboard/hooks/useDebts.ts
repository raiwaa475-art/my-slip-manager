"use client";

import { useState, useEffect, useCallback } from "react";
import { User, Transaction, DebtSummary, DebtItem } from "@/types";

export function useDebts(user: User | null, transactions: Transaction[], members: { user_id: string }[], guestMembers: string[], dashboardType: string | null) {
  const [debts, setDebts] = useState<DebtSummary>({ owes: [], owed: [] });

  const calculateDebts = useCallback(() => {
    if (!user || !dashboardType || dashboardType !== "split_bill") return;

    const splitTxs = transactions.filter(t => t.metadata?.split_between && t.metadata.split_between.length > 0);
    const balances: Record<string, number> = {};

    // 1. Calculate Net Balances for everyone (members + guests)
    splitTxs.forEach(t => {
      const splitWith = t.metadata!.split_between!;
      const totalAmount = Math.abs(t.amount);
      const share = totalAmount / splitWith.length;
      
      // 1. Give the payer full credit for the total amount they paid
      balances[t.user_id] = (balances[t.user_id] || 0) + totalAmount;
      
      // 2. Subtract the share from everyone included in the split
      splitWith.forEach(id => {
        balances[id] = (balances[id] || 0) - share;
      });
    });

    // 2. Separate into Debtors and Creditors
    const debtors = Object.entries(balances)
      .filter(([, bal]) => bal < -0.01)
      .map(([id, bal]) => ({ id, balance: Math.abs(bal) }))
      .sort((a, b) => b.balance - a.balance);

    const creditors = Object.entries(balances)
      .filter(([, bal]) => bal > 0.01)
      .map(([id, bal]) => ({ id, balance: bal }))
      .sort((a, b) => b.balance - a.balance);

    // 3. Match them (Greedy)
    const allTransfers: { from: string, to: string, amount: number }[] = [];
    let i = 0, j = 0;
    
    while (i < debtors.length && j < creditors.length) {
      const amount = Math.min(debtors[i].balance, creditors[j].balance);
      allTransfers.push({
        from: debtors[i].id,
        to: creditors[j].id,
        amount
      });

      debtors[i].balance -= amount;
      creditors[j].balance -= amount;

      if (debtors[i].balance < 0.01) i++;
      if (creditors[j].balance < 0.01) j++;
    }

    // 4. Filter for current user
    const owes: DebtItem[] = allTransfers
      .filter(t => t.from === user.id)
      .map(t => ({ userId: t.to, amount: t.amount, isGuest: t.to.startsWith('guest:') }));

    const owed: DebtItem[] = allTransfers
      .filter(t => t.to === user.id)
      .map(t => ({ userId: t.from, amount: t.amount, isGuest: t.from.startsWith('guest:') }));

    setDebts({ owes, owed });
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
