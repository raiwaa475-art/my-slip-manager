export interface User {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
}

export interface Dashboard {
  id: string;
  name: string;
  type: 'personal' | 'split_bill';
  created_by: string;
  metadata?: {
    guest_members?: string[];
    promptpay_id?: string;
    payment_type?: 'promptpay' | 'bank';
    bank_account_number?: string;
    bank_name?: string;
  };
}

export interface Transaction {
  id: string;
  user_id: string;
  dashboard_id?: string;
  name: string;
  amount: number;
  date: string;
  category: string;
  receiver?: string;
  metadata?: {
    split_between?: string[];
  };
}

export interface DebtItem {
  userId: string;
  amount: number;
  isGuest?: boolean;
}

export interface DebtSummary {
  owes: DebtItem[];
  owed: DebtItem[];
}

export interface AnalysisResult {
  date: string;
  amount: number;
  receiver: string;
  category: string;
  confidence: number;
  bank?: string;
  qr_raw?: string;
  isSplit?: boolean;
  splitBetween?: string[];
}

export interface SlipItem {
  id: string;
  file: File;
  preview: string;
  status: "pending" | "analyzing" | "done" | "error" | "saving" | "saved";
  result: AnalysisResult;
  error?: string;
  selected: boolean;
}
