"use client";

import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area 
} from "recharts";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay } from "date-fns";
import { Transaction } from "../../../types";
import { cn } from "@/lib/utils";

export function CalendarView({ activeMonth, transactions }: { activeMonth: Date, transactions: Transaction[] }) {
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
      const dayTransactions = transactions.filter((t: Transaction) => t.date === dateStr);
      const dayIncome = dayTransactions.filter((t: Transaction) => t.amount > 0).reduce((acc: number, curr: Transaction) => acc + curr.amount, 0);
      const dayExpense = Math.abs(dayTransactions.filter((t: Transaction) => t.amount < 0).reduce((acc: number, curr: Transaction) => acc + curr.amount, 0));
      days.push(
        <div key={day.toString()} className={cn("p-1 md:p-2 min-h-[60px] md:min-h-[80px] border border-border/50 flex flex-col justify-between", !isSameMonth(day, monthStart) ? "text-muted opacity-50 bg-black/5 dark:bg-white/5" : isSameDay(day, new Date()) ? "bg-accent/10 border-accent/30" : "bg-card")}>
          <span className={cn("text-xs md:text-sm font-medium self-end", isSameDay(day, new Date()) ? "text-accent font-bold" : "")}>{format(day, "d")}</span>
          <div className="flex flex-col gap-0.5 mt-1">
            {dayIncome > 0 && <span className="text-[9px] md:text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-1 py-0.5 rounded truncate">+{dayIncome}</span>}
            {dayExpense > 0 && <span className="text-[9px] md:text-[10px] text-pink-600 dark:text-pink-400 font-bold bg-pink-500/10 px-1 py-0.5 rounded truncate">-{dayExpense}</span>}
          </div>
        </div>
      );
      day = addDays(day, 1);
    }
    rows.push(<div className="grid grid-cols-7" key={day.toString()}>{days}</div>);
    days = [];
  }

  return (
    <div className="w-full overflow-hidden">
      <div className="flex justify-between items-center mb-6 px-1">
        <h3 className="font-bold text-lg">ปฏิทินรายรับ-รายจ่าย</h3>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[10px] md:text-xs text-muted"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> รายรับ</span>
          <span className="flex items-center gap-1 text-[10px] md:text-xs text-muted"><div className="w-2 h-2 rounded-full bg-pink-500"></div> รายจ่าย</span>
        </div>
      </div>
      
      <div className="overflow-x-auto pb-2 custom-scrollbar">
        <div className="min-w-[300px]">
          <div className="grid grid-cols-7 mb-2 border-b border-border/30">
            {["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."].map((d, i) => (
              <div key={i} className="text-center text-[10px] md:text-sm font-black text-muted/60 py-2 uppercase tracking-tighter">{d}</div>
            ))}
          </div>
          <div className="border-l border-t border-border/50 rounded-xl overflow-hidden bg-card/30">
            {rows}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CategoryPieChart({ isMounted, data, totalExpense }: { isMounted: boolean, data: { name: string, value: number, color: string }[], totalExpense: number }) {
  return (
    <div className="glass rounded-3xl p-5 md:p-8 border border-border bg-card/50 flex flex-col">
       <h3 className="font-bold text-lg mb-6">สัดส่วนค่าใช้จ่าย</h3>
       <div style={{ width: '100%', height: 250 }} className="relative">
          {isMounted && data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">{data.map((entry: { color: string }, index: number) => <Cell key={`cell-${index}`} fill={entry.color} />)}</Pie><RechartsTooltip contentStyle={{ background: 'var(--card)', borderColor: 'var(--border)', borderRadius: '12px', color: 'var(--foreground)' }} itemStyle={{ color: 'var(--foreground)' }} /></PieChart></ResponsiveContainer>
          ) : <div className="w-full h-full flex items-center justify-center text-muted text-sm italic">ไม่มีข้อมูล</div>}
          <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none"><span className="text-xs text-muted font-bold">รวมรายจ่าย</span><span className="text-xl font-black text-foreground">฿{totalExpense.toLocaleString()}</span></div>
       </div>
        <div className="mt-6 space-y-4 flex-1">
          {data.slice(0, 5).map((cat: { name: string, color: string, value: number }) => (
            <div key={cat.name} className="flex justify-between items-center text-sm"><div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full" style={{ background: cat.color }} /><span className="text-muted font-medium">{cat.name}</span></div><span className="font-bold">฿{cat.value.toLocaleString()}</span></div>
          ))}
        </div>
    </div>
  );
}

export function GroupContributionChart({ isMounted, members, transactions, userId }: { isMounted: boolean, members: { user_id: string }[], transactions: Transaction[], userId: string }) {
  const data = members.map((m) => ({
    name: m.user_id === userId ? "คุณ" : `เพื่อน ${m.user_id.substring(0, 4)}`,
    amount: Math.abs(transactions.filter((t) => t.user_id === m.user_id && t.amount < 0).reduce((acc, t) => acc + t.amount, 0))
  }));
  return (
    <>
      <div className="flex justify-between items-center mb-8"><div><h3 className="font-bold text-lg">สัดส่วนการออกเงินในกลุ่ม</h3><p className="text-xs text-muted">ดูว่าใครเป็นคนออกเงินกองกลางไปเท่าไหร่แล้ว</p></div><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-indigo-500" /><span className="text-xs font-bold">ยอดจ่ายรวม</span></div></div>
      <div style={{ width: '100%', height: 300 }} className="min-w-0 min-h-0">
        {isMounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} tickFormatter={(v) => `฿${v}`} />
              <RechartsTooltip cursor={{ fill: 'var(--accent)', opacity: 0.1 }} contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px' }} />
              <Bar dataKey="amount" fill="var(--accent)" radius={[10, 10, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        ) : <div className="w-full h-full flex items-center justify-center text-muted text-sm italic">กำลังโหลด...</div>}
      </div>
    </>
  );
}

export function MonthlyTrendChart({ isMounted, data }: { isMounted: boolean, data: { name: string, income: number, spent: number }[] }) {
  return (
    <div className="glass rounded-3xl p-5 md:p-8 border border-border bg-card/50">
       <div className="flex justify-between items-center mb-8"><h3 className="font-bold text-lg">แนวโน้มรายเดือน</h3><div className="flex gap-4"><div className="flex items-center gap-2 text-xs text-muted font-medium"><div className="w-2 h-2 rounded-full bg-indigo-500" /> รายรับ</div><div className="flex items-center gap-2 text-xs text-muted font-medium"><div className="w-2 h-2 rounded-full bg-pink-500" /> รายจ่าย</div></div></div>
       <div style={{ width: '100%', height: 250 }}>{isMounted && <ResponsiveContainer width="100%" height="100%"><AreaChart data={data}><defs><linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" vertical={false} /><XAxis dataKey="name" stroke="currentColor" className="opacity-50 text-xs" tickLine={false} axisLine={false} /><YAxis stroke="currentColor" className="opacity-50 text-[10px] md:text-xs" tickLine={false} axisLine={false} width={45} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} /><RechartsTooltip contentStyle={{ background: 'var(--card)', borderColor: 'var(--border)', borderRadius: '12px', color: 'var(--foreground)' }} /><Area type="monotone" dataKey="income" stroke="#6366f1" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={3} /><Area type="monotone" dataKey="spent" stroke="#ec4899" fillOpacity={0} strokeWidth={3} /></AreaChart></ResponsiveContainer>}</div>
    </div>
  );
}
