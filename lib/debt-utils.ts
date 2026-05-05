import { Transaction, DebtSummary, DebtItem } from "@/types";

export function calculateGroupDebts(transactions: Transaction[]): DebtSummary {
  const splitTxs = transactions.filter(t => t.metadata?.split_between && t.metadata.split_between.length > 0);
  const balances: Record<string, number> = {};

  // 1. Calculate Net Balances for everyone
  splitTxs.forEach(t => {
    const splitWith = t.metadata!.split_between!;
    const totalAmount = Math.abs(t.amount);
    const share = totalAmount / splitWith.length;
    
    // Give the payer full credit
    balances[t.user_id] = (balances[t.user_id] || 0) + totalAmount;
    
    // Subtract share from everyone
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
  const debtorsCopy = debtors.map(d => ({ ...d }));
  const creditorsCopy = creditors.map(c => ({ ...c }));
  
  let i = 0, j = 0;
  while (i < debtorsCopy.length && j < creditorsCopy.length) {
    const amount = Math.min(debtorsCopy[i].balance, creditorsCopy[j].balance);
    allTransfers.push({
      from: debtorsCopy[i].id,
      to: creditorsCopy[j].id,
      amount
    });

    debtorsCopy[i].balance -= amount;
    creditorsCopy[j].balance -= amount;

    if (debtorsCopy[i].balance < 0.01) i++;
    if (creditorsCopy[j].balance < 0.01) j++;
  }

  return { 
    owes: [], // Not used for group-wide
    owed: [], // Not used for group-wide
    allTransfers 
  };
}
