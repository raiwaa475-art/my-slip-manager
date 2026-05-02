"use client";

import { useState, useEffect } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area 
} from "recharts";
import { 
  TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, 
  Calendar as CalendarIcon, Download, LayoutDashboard, Scan, PiggyBank, Receipt,
  Plus, Users, X, ChevronDown, Check, Save, LogOut, User as UserIcon, Loader2
} from "lucide-react";
import Link from "next/link";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ThemeToggle } from "../components/ui/ThemeToggle";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, parseISO, subMonths } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import LoginButton from "../components/LoginButton";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CATEGORIES = [
  { id: "อาหาร", label: "อาหาร", icon: "🍔", color: "#6366f1" },
  { id: "เดินทาง", label: "เดินทาง", icon: "🚗", color: "#a855f7" },
  { id: "ช้อปปิ้ง", label: "ช้อปปิ้ง", icon: "🛍️", color: "#ec4899" },
  { id: "บันเทิง", label: "บันเทิง", icon: "🎮", color: "#f59e0b" },
  { id: "คงที่", label: "คงที่", icon: "🏠", color: "#3b82f6" },
  { id: "อื่นๆ", label: "อื่นๆ", icon: "📦", color: "#10b981" },
  { id: "รายรับ", label: "รายรับ", icon: "💰", color: "#10b981" },
];

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeMonth, setActiveMonth] = useState(new Date());
  const [isMounted, setIsMounted] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClient();
  
  // Dashboard State
  const [dashboards, setDashboards] = useState<any[]>([]);
  const [activeDashboard, setActiveDashboard] = useState<any>(null);
  const [setupMode, setSetupMode] = useState<"choose" | "create" | "join" | null>(null);
  const [newDashboardName, setNewDashboardName] = useState("");
  const [newDashboardType, setNewDashboardType] = useState<"personal" | "split_bill">("personal");
  const [joinCode, setJoinCode] = useState("");
  const [isProcessingSetup, setIsProcessingSetup] = useState(false);

  // Form State
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newDate, setNewDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [newCategory, setNewCategory] = useState("อาหาร");
  const [isSplit, setIsSplit] = useState(false);
  const [peopleCount, setPeopleCount] = useState(2);

  useEffect(() => {
    setIsMounted(true);
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchDashboards(session.user.id);
      } else {
        setLoading(false);
      }
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchDashboards(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const fetchDashboards = async (userId: string) => {
    try {
      const { data: userDashboards, error: udError } = await supabase
        .from('dashboard_users')
        .select('dashboard_id')
        .eq('user_id', userId);

      if (udError) {
        console.error("Dashboard tables missing or error:", udError);
        // If the table doesn't exist (code 42P01) or there's an RLS error, we still want to show the setup UI
        // so the user knows they need to set up the dashboard.
        setSetupMode("choose");
        setLoading(false);
        return;
      }

      if (userDashboards && userDashboards.length > 0) {
        const dashboardIds = userDashboards.map(d => d.dashboard_id);
        const { data: dashs, error: dError } = await supabase
          .from('dashboards')
          .select('*')
          .in('id', dashboardIds);
        
        if (dError) throw dError;
        setDashboards(dashs || []);
        
        if (dashs && dashs.length > 0) {
           const active = dashs[0]; 
           setActiveDashboard(active);
           fetchTransactions(active.id);
        } else {
           setSetupMode("choose");
           setLoading(false);
        }
      } else {
        setDashboards([]);
        setSetupMode("choose");
        setLoading(false);
      }
    } catch (err) {
      console.error("Error fetching dashboards:", err);
      fetchTransactionsByUserId(userId);
    }
  };

  const fetchTransactions = async (dashboardId: string) => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('dashboard_id', dashboardId)
        .order('date', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (err) {
      console.error("Error fetching transactions:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactionsByUserId = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (err) {
      console.error("Error fetching transactions:", err);
    } finally {
      setLoading(false);
    }
  };

  const generateDashboardId = () => Math.random().toString(36).substring(2, 8).toUpperCase();

  const handleCreateDashboard = async () => {
    if (!newDashboardName.trim() || !user) return;
    setIsProcessingSetup(true);
    const newId = generateDashboardId();
    
    try {
      const { error: insertDashErr } = await supabase.from('dashboards').insert({
        id: newId,
        name: newDashboardName,
        type: newDashboardType,
        created_by: user.id
      });
      if (insertDashErr) throw insertDashErr;

      const { error: insertUserErr } = await supabase.from('dashboard_users').insert({
        dashboard_id: newId,
        user_id: user.id
      });
      if (insertUserErr) throw insertUserErr;

      fetchDashboards(user.id);
      setSetupMode(null);
    } catch (err) {
      console.error("Error creating dashboard:", err);
      alert("เกิดข้อผิดพลาดในการสร้างแดชบอร์ด โปรดตรวจสอบว่าสร้างตารางในฐานข้อมูลหรือยัง");
    } finally {
      setIsProcessingSetup(false);
    }
  };

  const handleJoinDashboard = async () => {
    if (!joinCode.trim() || !user) return;
    setIsProcessingSetup(true);
    const code = joinCode.toUpperCase();
    
    try {
      const { data: dash, error: dashErr } = await supabase.from('dashboards').select('*').eq('id', code).single();
      if (dashErr || !dash) {
        alert("ไม่พบแดชบอร์ดนี้ โปรดตรวจสอบรหัสอีกครั้ง");
        setIsProcessingSetup(false);
        return;
      }

      const { error: insertUserErr } = await supabase.from('dashboard_users').insert({
        dashboard_id: code,
        user_id: user.id
      });
      
      // Ignore "duplicate key" error (code 23505) - user is already a member
      if (insertUserErr && (insertUserErr as any).code !== '23505') {
        throw insertUserErr;
      }

      // Refresh dashboards list
      await fetchDashboards(user.id);
      
      // Explicitly set the joined dashboard as active
      setActiveDashboard(dash);
      fetchTransactions(dash.id);
      
      setSetupMode(null);
      setJoinCode("");
    } catch (err) {
      console.error("Error joining dashboard:", err);
      alert("เกิดข้อผิดพลาดในการเข้าร่วม");
    } finally {
      setIsProcessingSetup(false);
    }
  };

  const addTransaction = async () => {
    if (!newName || !newAmount || !user) return;
    
    setIsSaving(true);
    const amount = parseFloat(newAmount);
    const finalAmount = isSplit ? amount / peopleCount : amount;
    
    const txData: any = {
      user_id: user.id,
      name: isSplit ? `${newName} (หาร ${peopleCount} คน)` : newName,
      date: newDate,
      amount: newCategory === "รายรับ" ? Math.abs(finalAmount) : -Math.abs(finalAmount),
      category: newCategory,
      receiver: newName
    };

    if (activeDashboard) {
      txData.dashboard_id = activeDashboard.id;
    }

    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert(txData)
        .select()
        .single();

      if (error) throw error;
      
      setTransactions([data, ...transactions]);
      setIsModalOpen(false);
      // Reset
      setNewName("");
      setNewAmount("");
      setIsSplit(false);
      setPeopleCount(2);
    } catch (err) {
      console.error("Error adding transaction:", err);
      alert("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setIsSaving(false);
    }
  };

  // Calculations
  const totalIncome = transactions.filter(t => t.amount > 0).reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = Math.abs(transactions.filter(t => t.amount < 0).reduce((acc, t) => acc + t.amount, 0));
  const balance = totalIncome - totalExpense;

  // Chart Data Calculations
  const categoryChartData = CATEGORIES.filter(c => c.id !== "รายรับ").map(cat => {
    const value = Math.abs(transactions
      .filter(t => t.category === cat.id && t.amount < 0)
      .reduce((acc, t) => acc + t.amount, 0));
    return { name: cat.label, value, color: cat.color };
  }).filter(c => c.value > 0);

  // Monthly Trend (Last 5 months)
  const monthlyTrendData = Array.from({ length: 5 }).map((_, i) => {
    const d = subMonths(new Date(), 4 - i);
    const monthName = format(d, "MMM", { locale: undefined }); // In real app use Thai locale if needed
    const monthStr = format(d, "yyyy-MM");
    
    const income = transactions
      .filter(t => t.date.startsWith(monthStr) && t.amount > 0)
      .reduce((acc, t) => acc + t.amount, 0);
    const spent = Math.abs(transactions
      .filter(t => t.date.startsWith(monthStr) && t.amount < 0)
      .reduce((acc, t) => acc + t.amount, 0));
      
    return { name: monthName, income, spent };
  });

  // Calendar Logic
  const monthStart = startOfMonth(activeMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const rows = [];
  let days = [];
  let day = startDate;

  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      const cloneDay = day;
      const dateStr = format(cloneDay, "yyyy-MM-dd");
      const dayTransactions = transactions.filter(t => t.date === dateStr);
      const dayIncome = dayTransactions.filter(t => t.amount > 0).reduce((acc, curr) => acc + curr.amount, 0);
      const dayExpense = Math.abs(dayTransactions.filter(t => t.amount < 0).reduce((acc, curr) => acc + curr.amount, 0));

      days.push(
        <div
          className={cn(
            "p-1 md:p-2 min-h-[60px] md:min-h-[80px] border border-border/50 flex flex-col justify-between transition-all hover:bg-black/5 dark:hover:bg-white/5",
            !isSameMonth(day, monthStart)
              ? "text-muted opacity-50 bg-black/5 dark:bg-white/5"
              : isSameDay(day, new Date()) ? "bg-accent/10 border-accent/30" : "bg-card"
          )}
          key={day.toString()}
        >
          <span className={cn(
            "text-xs md:text-sm font-medium self-end",
            isSameDay(day, new Date()) ? "text-accent font-bold" : ""
          )}>{format(day, "d")}</span>
          
          <div className="flex flex-col gap-0.5 mt-1">
            {dayIncome > 0 && (
              <span className="text-[9px] md:text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-1 py-0.5 rounded truncate">
                +{dayIncome}
              </span>
            )}
            {dayExpense > 0 && (
              <span className="text-[9px] md:text-[10px] text-pink-600 dark:text-pink-400 font-bold bg-pink-500/10 px-1 py-0.5 rounded truncate">
                -{dayExpense}
              </span>
            )}
          </div>
        </div>
      );
      day = addDays(day, 1);
    }
    rows.push(
      <div className="grid grid-cols-7" key={day.toString()}>
        {days}
      </div>
    );
    days = [];
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background items-center justify-center">
        <Loader2 className="w-12 h-12 text-accent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen bg-background text-foreground transition-colors items-center justify-center p-6">
        <div className="max-w-md w-full glass rounded-[2.5rem] p-10 md:p-12 border border-border bg-card/50 flex flex-col items-center text-center gap-8 shadow-2xl">
          <div className="w-20 h-20 rounded-3xl bg-accent flex items-center justify-center text-white shadow-xl shadow-accent/20">
            <Wallet className="w-10 h-10" />
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-black tracking-tight uppercase">FINANCE.AI</h1>
            <p className="text-muted text-sm leading-relaxed">
              เข้าสู่ระบบเพื่อดูแดชบอร์ดสรุปรายรับ-รายจ่ายของคุณ
            </p>
          </div>
          <LoginButton />
          <div className="pt-4 border-t border-border w-full text-center">
             <Link href="/" className="text-sm text-accent font-bold hover:underline">กลับไปหน้าสแกนสลิป</Link>
          </div>
        </div>
      </div>
    );
  }

  if (setupMode && user) {
    return (
      <div className="flex min-h-screen bg-background text-foreground transition-colors items-center justify-center p-6">
        <div className="max-w-md w-full glass rounded-[2.5rem] p-8 md:p-10 border border-border bg-card/50 flex flex-col items-center text-center gap-8 shadow-2xl">
           <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
             <LayoutDashboard className="w-8 h-8" />
           </div>
           
           {setupMode === "choose" && (
             <>
               <div className="space-y-2">
                 <h2 className="text-2xl font-black uppercase">เริ่มต้นใช้งาน</h2>
                 <p className="text-sm text-muted">ดูเหมือนคุณยังไม่มีแดชบอร์ด คุณต้องการสร้างใหม่หรือเข้าร่วมแดชบอร์ดที่มีอยู่แล้ว?</p>
               </div>
               <div className="flex flex-col gap-3 w-full">
                 <button onClick={() => setSetupMode("create")} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-indigo-500/20 transition-all">สร้างแดชบอร์ดใหม่</button>
                 <button onClick={() => setSetupMode("join")} className="w-full bg-card hover:bg-black/5 dark:hover:bg-white/5 border border-border text-foreground font-bold py-3.5 rounded-2xl transition-all">เข้าร่วมแดชบอร์ด (ด้วยรหัส)</button>
               </div>
             </>
           )}

           {setupMode === "create" && (
             <>
               <div className="space-y-2 w-full text-left">
                 <h2 className="text-xl font-black uppercase text-center mb-6">สร้างแดชบอร์ด</h2>
                 <label className="text-xs font-bold text-muted uppercase">ชื่อแดชบอร์ด</label>
                 <input type="text" value={newDashboardName} onChange={e => setNewDashboardName(e.target.value)} placeholder="เช่น บ้าน, ส่วนตัว, ทริปญี่ปุ่น" className="w-full bg-background border border-border rounded-xl px-4 py-3 outline-none mb-4" />
                 
                 <label className="text-xs font-bold text-muted uppercase">ประเภท</label>
                 <div className="grid grid-cols-2 gap-3 mb-6">
                    <button onClick={() => setNewDashboardType("personal")} className={cn("py-3 px-2 rounded-xl text-sm font-bold border transition-all flex flex-col items-center gap-2", newDashboardType === "personal" ? "bg-indigo-600 border-indigo-600 text-white" : "bg-card border-border text-muted hover:bg-black/5 dark:hover:bg-white/5")}>
                       <Wallet className="w-5 h-5" /> รายรับรายจ่าย
                    </button>
                    <button onClick={() => setNewDashboardType("split_bill")} className={cn("py-3 px-2 rounded-xl text-sm font-bold border transition-all flex flex-col items-center gap-2", newDashboardType === "split_bill" ? "bg-indigo-600 border-indigo-600 text-white" : "bg-card border-border text-muted hover:bg-black/5 dark:hover:bg-white/5")}>
                       <Users className="w-5 h-5" /> หารค่าใช้จ่าย
                    </button>
                 </div>
               </div>
               <div className="flex gap-3 w-full">
                 <button 
  onClick={() => dashboards.length > 0 ? setSetupMode(null) : setSetupMode("choose")} 
  className="flex-1 bg-card hover:bg-black/5 dark:hover:bg-white/5 border border-border text-foreground font-bold py-3 rounded-xl transition-all"
>
  ยกเลิก
</button>
                 <button onClick={handleCreateDashboard} disabled={isProcessingSetup || !newDashboardName} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                   {isProcessingSetup ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} สร้าง
                 </button>
               </div>
             </>
           )}

           {setupMode === "join" && (
             <>
               <div className="space-y-2 w-full text-left">
                 <h2 className="text-xl font-black uppercase text-center mb-6">เข้าร่วมแดชบอร์ด</h2>
                 <label className="text-xs font-bold text-muted uppercase">รหัสแดชบอร์ด (6 หลัก)</label>
                 <input type="text" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} maxLength={6} placeholder="ABC123" className="w-full bg-background border border-border rounded-xl px-4 py-3 outline-none text-center font-black tracking-widest text-xl uppercase mb-6" />
               </div>
               <div className="flex gap-3 w-full">
                 <button 
  onClick={() => dashboards.length > 0 ? setSetupMode(null) : setSetupMode("choose")} 
  className="flex-1 bg-card hover:bg-black/5 dark:hover:bg-white/5 border border-border text-foreground font-bold py-3 rounded-xl transition-all"
>
  ยกเลิก
</button>
                 <button onClick={handleJoinDashboard} disabled={isProcessingSetup || joinCode.length < 3} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                   {isProcessingSetup ? <Loader2 className="w-4 h-4 animate-spin" /> : <LayoutDashboard className="w-4 h-4" />} เข้าร่วม
                 </button>
               </div>
             </>
           )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground transition-colors">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-border flex-col p-6 gap-8 bg-card sticky top-0 h-screen">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-white">
              <Wallet className="w-6 h-6" />
           </div>
           <span className="font-black text-xl tracking-tighter text-foreground">FINANCE.AI</span>
        </div>

        <nav className="flex-1 flex flex-col gap-2 w-full">
           <Link href="/" className="flex items-center gap-4 p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-muted hover:text-foreground transition-all">
              <Scan className="w-6 h-6" />
              <span className="font-medium">สแกนสลิป</span>
           </Link>
           <Link href="/dashboard" className="flex items-center gap-4 p-3 rounded-xl bg-accent/10 text-accent border border-accent/20 transition-all">
              <LayoutDashboard className="w-6 h-6" />
              <span className="font-bold">แดชบอร์ด</span>
           </Link>
        </nav>
        
        <div className="space-y-4 pt-6 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center overflow-hidden border border-indigo-500/20">
              {user.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-4 h-4 text-indigo-500" />
              )}
            </div>
            <div className="flex flex-col truncate">
              <span className="text-xs font-bold truncate">{user.user_metadata?.full_name || user.email}</span>
              <button 
                onClick={() => supabase.auth.signOut()}
                className="text-[10px] text-muted hover:text-red-500 flex items-center gap-1 font-bold"
              >
                <LogOut className="w-3 h-3" /> ออกจากระบบ
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <span className="text-sm font-medium text-muted">เปลี่ยนธีม</span>
          </div>
        </div>
      </aside>

      {/* Mobile Header & Bottom Nav */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white">
              <Wallet className="w-5 h-5" />
           </div>
           <span className="font-black text-lg tracking-tighter">FINANCE</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setSetupMode("join")} className="text-muted hover:text-foreground p-1"><Users className="w-5 h-5" /></button>
          <ThemeToggle />
          <button onClick={() => supabase.auth.signOut()} className="text-red-500 p-1"><LogOut className="w-5 h-5" /></button>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border z-50 flex items-center justify-around px-2 pb-4">
         <Link href="/" className="flex flex-col items-center gap-1 p-2 text-muted hover:text-foreground">
            <Scan className="w-5 h-5" />
            <span className="text-[10px] font-medium">สแกนสลิป</span>
         </Link>
         <div className="flex flex-col items-center gap-1 p-2 text-accent">
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] font-bold">แดชบอร์ด</span>
         </div>
         <button className="flex flex-col items-center gap-1 p-2 text-muted hover:text-foreground">
            <PiggyBank className="w-5 h-5" />
            <span className="text-[10px] font-medium">เป้าหมาย</span>
         </button>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 pt-20 pb-24 md:p-10 lg:p-12">
        <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
               <div className="flex items-center gap-3">
                 <h1 className="text-2xl md:text-3xl font-black uppercase">
                   {activeDashboard ? activeDashboard.name : "วิเคราะห์การเงิน"}
                 </h1>
                 {activeDashboard && (
                   <div className="px-2 py-1 bg-card border border-border rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        onClick={() => {
                          navigator.clipboard.writeText(activeDashboard.id);
                          alert("คัดลอกรหัสแดชบอร์ด: " + activeDashboard.id + " แล้ว นำไปแชร์ให้เพื่อนเข้าร่วมได้เลย!");
                        }}
                        title="คลิกเพื่อคัดลอกรหัส"
                   >
                     รหัส: <span className="text-indigo-500 tracking-widest">{activeDashboard.id}</span>
                   </div>
                 )}
               </div>
               <p className="text-muted text-sm md:text-base mt-1">ยินดีต้อนรับกลับมา, <b>{user.user_metadata?.full_name?.split(' ')[0] || 'User'}</b></p>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
                <button 
                  onClick={() => setSetupMode("join")}
                  className="p-2.5 bg-card border border-border rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  title="เข้าร่วมห้องด้วยรหัส"
                >
                   <Users className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20"
                >
                   <Plus className="w-5 h-5" />
                   เพิ่มรายการ
                </button>
                <button className="p-2.5 bg-card border border-border rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                   <Download className="w-5 h-5" />
                </button>
            </div>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <StatCard 
               title="ยอดเงินคงเหลือ" 
               value={`฿${balance.toLocaleString()}`} 
               trend="ยอดรวมทั้งหมด" 
               icon={<Wallet className="w-5 h-5" />} 
               color="indigo"
               className="col-span-2 lg:col-span-1"
            />
            <StatCard 
               title="รายรับรวม" 
               value={`฿${totalIncome.toLocaleString()}`} 
               trend="จากทุกรายการ" 
               icon={<TrendingUp className="w-5 h-5" />} 
               color="emerald"
               className="col-span-1"
            />
            <StatCard 
               title="รายจ่ายรวม" 
               value={`฿${totalExpense.toLocaleString()}`} 
               trend="จากทุกรายการ" 
               icon={<TrendingDown className="w-5 h-5" />} 
               color="pink"
               isNegative
               className="col-span-1"
            />
            <StatCard 
               title="รายการทั้งหมด" 
               value={transactions.length} 
               trend="ใบเสร็จ/สลิป" 
               icon={<Receipt className="w-5 h-5" />} 
               color="indigo"
               className="col-span-2 lg:col-span-1"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar View */}
            <div className="lg:col-span-2 glass rounded-3xl p-5 md:p-8 border border-border bg-card/50">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-lg">ปฏิทินรายรับ-รายจ่าย</h3>
                  <div className="flex items-center gap-3">
                     <span className="flex items-center gap-1 text-xs text-muted"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> รายรับ</span>
                     <span className="flex items-center gap-1 text-xs text-muted"><div className="w-2 h-2 rounded-full bg-pink-500"></div> รายจ่าย</span>
                  </div>
               </div>
               
               <div className="w-full">
                  <div className="grid grid-cols-7 mb-2">
                     {["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."].map((day, i) => (
                        <div key={i} className="text-center text-xs md:text-sm font-medium text-muted py-2">
                           {day}
                        </div>
                     ))}
                  </div>
                  <div className="border-l border-t border-border/50 rounded-xl overflow-hidden bg-card">
                     {rows}
                  </div>
               </div>
            </div>

            {/* Category Breakdown */}
            <div className="glass rounded-3xl p-5 md:p-8 border border-border bg-card/50 flex flex-col">
               <h3 className="font-bold text-lg mb-6">สัดส่วนค่าใช้จ่าย</h3>
               <div style={{ width: '100%', height: 250 }} className="relative">
                  {isMounted && categoryChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <PieChart>
                        <Pie
                          data={categoryChartData}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          stroke="none"
                        >
                          {categoryChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip 
                          contentStyle={{ background: 'var(--card)', borderColor: 'var(--border)', borderRadius: '12px', color: 'var(--foreground)' }}
                          itemStyle={{ color: 'var(--foreground)' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted text-sm italic">ไม่มีข้อมูลค่าใช้จ่าย</div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                     <span className="text-xs text-muted font-bold">รวมรายจ่าย</span>
                     <span className="text-xl font-black text-foreground">฿{totalExpense.toLocaleString()}</span>
                  </div>
               </div>
               <div className="mt-6 space-y-4 flex-1">
                  {categoryChartData.slice(0, 5).map(cat => (
                    <div key={cat.name} className="flex justify-between items-center text-sm">
                       <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ background: cat.color }} />
                          <span className="text-muted font-medium">{cat.name}</span>
                       </div>
                       <span className="font-bold text-foreground">฿{cat.value.toLocaleString()}</span>
                    </div>
                  ))}
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Trend */}
            <div className="glass rounded-3xl p-5 md:p-8 border border-border bg-card/50">
               <div className="flex justify-between items-center mb-8">
                  <h3 className="font-bold text-lg">แนวโน้มรายเดือน</h3>
                  <div className="flex gap-4">
                     <div className="flex items-center gap-2 text-xs text-muted font-medium">
                        <div className="w-2 h-2 rounded-full bg-indigo-500" /> รายรับ
                     </div>
                     <div className="flex items-center gap-2 text-xs text-muted font-medium">
                        <div className="w-2 h-2 rounded-full bg-pink-500" /> รายจ่าย
                     </div>
                  </div>
               </div>
               <div style={{ width: '100%', height: 250 }}>
                  {isMounted && (
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <AreaChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" vertical={false} />
                        <XAxis dataKey="name" stroke="currentColor" className="opacity-50 text-xs" tickLine={false} axisLine={false} />
                        <YAxis stroke="currentColor" className="opacity-50 text-xs" tickLine={false} axisLine={false} />
                        <RechartsTooltip 
                          contentStyle={{ background: 'var(--card)', borderColor: 'var(--border)', borderRadius: '12px', color: 'var(--foreground)' }}
                        />
                        <Area type="monotone" dataKey="income" stroke="#6366f1" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={3} />
                        <Area type="monotone" dataKey="spent" stroke="#ec4899" fillOpacity={0} strokeWidth={3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
               </div>
            </div>

            {/* Transactions List */}
            <div className="glass rounded-3xl overflow-hidden border border-border bg-card/50 flex flex-col">
               <div className="p-5 md:p-8 border-b border-border flex justify-between items-center bg-card/50">
                  <div className="flex items-center gap-2">
                     <Receipt className="w-5 h-5 text-accent" />
                     <h3 className="font-bold text-lg">รายการล่าสุด</h3>
                  </div>
                  <button className="text-accent text-sm font-bold hover:underline">ดูทั้งหมด</button>
               </div>
               <div className="overflow-x-auto flex-1 max-h-[400px]">
                  <table className="w-full">
                     <thead className="hidden md:table-header-group sticky top-0 bg-card z-10">
                        <tr className="bg-black/5 dark:bg-white/5 text-[10px] uppercase tracking-widest text-muted">
                           <th className="px-6 py-4 text-left font-semibold">รายการ</th>
                           <th className="px-6 py-4 text-left font-semibold">วันที่</th>
                           <th className="px-6 py-4 text-left font-semibold">หมวดหมู่</th>
                           <th className="px-6 py-4 text-right font-semibold">จำนวนเงิน</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-border">
                        {transactions.length > 0 ? transactions.map(tx => (
                          <tr key={tx.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors group block md:table-row">
                             <td className="px-4 md:px-6 py-4 flex justify-between items-center md:table-cell">
                                <div className="flex items-center gap-4">
                                   <div className={cn(
                                     "w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-sm group-hover:scale-110 transition-transform",
                                     tx.amount > 0 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-card border border-border text-foreground"
                                   )}>
                                      {tx.name[0]}
                                   </div>
                                   <div>
                                      <span className="font-bold text-foreground block md:inline">{tx.name}</span>
                                      <span className="text-xs text-muted block md:hidden mt-0.5">{tx.date} • {tx.category}</span>
                                   </div>
                                </div>
                                <div className={cn(
                                  "font-black md:hidden",
                                  tx.amount > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                                )}>
                                  {tx.amount > 0 ? "+" : ""}{tx.amount.toLocaleString()} {"฿"}
                                </div>
                             </td>
                             <td className="px-6 py-4 text-sm text-muted hidden md:table-cell">{tx.date}</td>
                             <td className="px-6 py-4 hidden md:table-cell">
                                <span className="px-3 py-1 rounded-full bg-card border border-border text-xs font-medium text-foreground">{tx.category}</span>
                             </td>
                             <td className={cn(
                               "px-6 py-4 text-right font-black hidden md:table-cell",
                               tx.amount > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                             )}>
                                {tx.amount > 0 ? "+" : ""}{tx.amount.toLocaleString()} {"฿"}
                             </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={4} className="px-6 py-12 text-center text-muted italic">ยังไม่มีรายการบันทึก</td>
                          </tr>
                        )}
                     </tbody>
                  </table>
               </div>
            </div>
          </div>

        </div>
      </main>

      {/* Add Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="glass w-full max-w-lg rounded-[2.5rem] p-8 md:p-10 border border-white/20 shadow-2xl bg-card/95 relative overflow-y-auto max-h-[90vh]">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-muted" />
              </button>

              <div className="flex flex-col items-center text-center gap-4 mb-8">
                 <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-500">
                    <Plus className="w-8 h-8" />
                 </div>
                 <div>
                    <h2 className="text-2xl font-black text-foreground uppercase tracking-tight">เพิ่มรายการใหม่</h2>
                    <p className="text-sm text-muted">บันทึกรายรับหรือรายจ่ายของคุณ</p>
                 </div>
              </div>

              <div className="space-y-6">
                 {/* Type Selector */}
                 <div className="flex p-1 bg-black/5 dark:bg-white/5 rounded-2xl">
                    <button 
                      onClick={() => setNewCategory("อาหาร")}
                      className={cn(
                        "flex-1 py-2.5 rounded-xl text-sm font-bold transition-all",
                        newCategory !== "รายรับ" ? "bg-white dark:bg-zinc-800 shadow-sm text-indigo-600" : "text-muted"
                      )}
                    >
                      รายจ่าย
                    </button>
                    <button 
                      onClick={() => setNewCategory("รายรับ")}
                      className={cn(
                        "flex-1 py-2.5 rounded-xl text-sm font-bold transition-all",
                        newCategory === "รายรับ" ? "bg-white dark:bg-zinc-800 shadow-sm text-emerald-600" : "text-muted"
                      )}
                    >
                      รายรับ
                    </button>
                 </div>

                 <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-muted uppercase tracking-widest px-2">ชื่อรายการ</label>
                       <input 
                          type="text" 
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          placeholder="เช่น GrabFood, เงินเดือน..."
                          className="w-full bg-background border border-border focus:border-indigo-500 rounded-2xl px-4 py-3 outline-none transition-all"
                       />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-muted uppercase tracking-widest px-2">จำนวนเงิน</label>
                          <input 
                             type="number" 
                             value={newAmount}
                             onChange={(e) => setNewAmount(e.target.value)}
                             placeholder="0.00"
                             className="w-full bg-background border border-border focus:border-indigo-500 rounded-2xl px-4 py-3 outline-none transition-all font-bold text-lg"
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-muted uppercase tracking-widest px-2">วันที่</label>
                          <input 
                             type="date" 
                             value={newDate}
                             onChange={(e) => setNewDate(e.target.value)}
                             className="w-full bg-background border border-border focus:border-indigo-500 rounded-2xl px-4 py-3 outline-none transition-all"
                          />
                       </div>
                    </div>

                    {newCategory !== "รายรับ" && (
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-muted uppercase tracking-widest px-2">หมวดหมู่</label>
                          <div className="flex flex-wrap gap-2">
                             {CATEGORIES.filter(c => c.id !== "รายรับ").map(cat => (
                               <button 
                                 key={cat.id}
                                 onClick={() => setNewCategory(cat.id)}
                                 className={cn(
                                   "px-4 py-2 rounded-xl text-xs font-bold border transition-all",
                                   newCategory === cat.id ? "bg-indigo-600 border-indigo-600 text-white" : "bg-card border-border text-muted"
                                 )}
                               >
                                 {cat.icon} {cat.label}
                               </button>
                             ))}
                          </div>
                       </div>
                    )}
                 </div>

                 {/* Split Bill Section */}
                 {newCategory !== "รายรับ" && (
                    <div className="pt-4 border-t border-border">
                       <button 
                          onClick={() => setIsSplit(!isSplit)}
                          className={cn(
                            "w-full flex items-center justify-between p-4 rounded-2xl border transition-all",
                            isSplit ? "bg-indigo-500/10 border-indigo-500/50 text-indigo-600" : "bg-card border-border text-muted"
                          )}
                       >
                          <div className="flex items-center gap-3">
                             <Users className="w-5 h-5" />
                             <span className="font-bold">หารบิลกับเพื่อน</span>
                          </div>
                          {isSplit ? <Check className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                       </button>

                       {isSplit && (
                          <div className="mt-4 p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/20 space-y-4 animate-in slide-in-from-top-2 duration-300">
                             <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">จำนวนคนหาร</span>
                                <div className="flex items-center gap-3">
                                   <button 
                                      onClick={() => setPeopleCount(Math.max(2, peopleCount - 1))}
                                      className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center font-bold"
                                   >
                                      -
                                   </button>
                                   <span className="font-bold w-8 text-center">{peopleCount}</span>
                                   <button 
                                      onClick={() => setPeopleCount(peopleCount + 1)}
                                      className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center font-bold"
                                   >
                                      +
                                   </button>
                                </div>
                             </div>
                             <div className="flex justify-between items-center pt-2 border-t border-indigo-500/10">
                                <span className="text-sm text-muted">จ่ายคนละ:</span>
                                <span className="text-lg font-black text-indigo-600">
                                   ฿{(parseFloat(newAmount || "0") / peopleCount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                             </div>
                          </div>
                       )}
                    </div>
                 )}

                 <button 
                    onClick={addTransaction}
                    disabled={isSaving}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                 >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    บันทึกรายการ
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, trend, icon, color, isNegative = false, className }: any) {
  const colorMap: any = {
    indigo: "from-indigo-600/10 to-indigo-600/5 dark:from-indigo-600/20 dark:to-indigo-600/5 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    pink: "from-pink-600/10 to-pink-600/5 dark:from-pink-600/20 dark:to-pink-600/5 text-pink-600 dark:text-pink-400 border-pink-500/20",
    emerald: "from-emerald-600/10 to-emerald-600/5 dark:from-emerald-600/20 dark:to-emerald-600/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  };

  return (
    <div className={cn("glass rounded-3xl p-5 md:p-6 lg:p-8 bg-gradient-to-br border", colorMap[color], className)}>
       <div className="flex justify-between items-start mb-4 md:mb-6">
          <div className="p-2.5 md:p-3 rounded-xl bg-white/50 dark:bg-black/20 shadow-sm backdrop-blur-md">{icon}</div>
          <div className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter",
            isNegative ? "bg-pink-500/20 text-pink-600 dark:text-pink-400" : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
          )}>
             {isNegative ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
             {isNegative ? "รายจ่าย" : "รายรับ"}
          </div>
       </div>
       <div className="space-y-1">
          <p className="text-xs md:text-sm font-medium text-muted">{title}</p>
          <p className="text-2xl md:text-3xl lg:text-4xl font-black text-foreground">{value}</p>
       </div>
       <p className="mt-3 md:mt-4 text-[10px] md:text-xs text-muted font-medium">{trend}</p>
    </div>
  );
}
