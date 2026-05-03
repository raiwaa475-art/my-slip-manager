"use client";

import { X, PiggyBank, Users, Wallet, LayoutDashboard, Plus, Loader2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useToast } from "@/app/components/ui/Toast";
import { useDashboard } from "../hooks/useDashboard";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  promptPayId: string;
  setPromptPayId: (v: string) => void;
  paymentType: 'promptpay' | 'bank';
  setPaymentType: (v: 'promptpay' | 'bank') => void;
  bankAccountNumber: string;
  setBankAccountNumber: (v: string) => void;
  bankName: string;
  setBankName: (v: string) => void;
  onSave: () => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  promptPayId,
  setPromptPayId,
  paymentType,
  setPaymentType,
  bankAccountNumber,
  setBankAccountNumber,
  bankName,
  setBankName,
  onSave
}: SettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="glass w-full max-w-sm rounded-[2.5rem] p-8 border border-white/20 shadow-2xl bg-card/95 relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <X className="w-6 h-6 text-muted" />
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 mx-auto mb-4">
            <PiggyBank className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black uppercase">ตั้งค่าการรับเงิน</h2>
          <p className="text-sm text-muted">กรอกข้อมูลเพื่อให้เพื่อนโอนคืนได้สะดวก</p>
        </div>

        <div className="space-y-6 mb-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted uppercase tracking-widest px-2">
              ช่องทางการรับเงิน
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPaymentType('promptpay')}
                className={cn(
                  "py-3 rounded-xl text-xs font-bold border transition-all",
                  paymentType === 'promptpay' ? "bg-indigo-600 border-indigo-600 text-white" : "bg-background border-border text-muted"
                )}
              >
                พร้อมเพย์
              </button>
              <button
                onClick={() => setPaymentType('bank')}
                className={cn(
                  "py-3 rounded-xl text-xs font-bold border transition-all",
                  paymentType === 'bank' ? "bg-indigo-600 border-indigo-600 text-white" : "bg-background border-border text-muted"
                )}
              >
                บัญชีธนาคาร
              </button>
            </div>
          </div>

          {paymentType === 'promptpay' ? (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-[10px] font-black text-muted uppercase tracking-widest px-2">
                เลขพร้อมเพย์ / เบอร์โทร
              </label>
              <input
                type="text"
                value={promptPayId}
                onChange={e => setPromptPayId(e.target.value)}
                placeholder="08X-XXX-XXXX"
                className="w-full bg-background border border-border rounded-xl px-4 py-3 outline-none text-center font-bold"
              />
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted uppercase tracking-widest px-2">
                  ธนาคาร
                </label>
                <input
                  type="text"
                  value={bankName}
                  onChange={e => setBankName(e.target.value)}
                  placeholder="เช่น กสิกรไทย, ไทยพาณิชย์"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 outline-none text-center font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted uppercase tracking-widest px-2">
                  เลขบัญชีธนาคาร
                </label>
                <input
                  type="text"
                  value={bankAccountNumber}
                  onChange={e => setBankAccountNumber(e.target.value)}
                  placeholder="XXX-X-XXXXX-X"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 outline-none text-center font-bold"
                />
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onSave}
          className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg"
        >
          บันทึกข้อมูล
        </button>
      </div>
    </div>
  );
}

export function SplitBillAlert({ dashboardId }: { dashboardId: string }) {
  const { toast } = useToast();
  return (
    <div className="p-6 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-4">
      <div className="flex items-center gap-4 text-center md:text-left">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-600">
          <Users className="w-6 h-6" />
        </div>
        <div>
          <h4 className="font-bold text-amber-600">ชวนเพื่อนเข้ากลุ่มหรือยัง?</h4>
          <p className="text-sm text-muted">แชร์รหัสกลุ่มให้เพื่อนเพื่อเริ่มหารกันได้เลย!</p>
        </div>
      </div>
      <button
        onClick={() => {
          navigator.clipboard.writeText(dashboardId);
          toast("คัดลอกรหัสแล้ว!", "success");
        }}
        className="bg-amber-600 hover:bg-amber-500 text-white px-6 py-2 rounded-xl font-bold transition-all shrink-0"
      >
        คัดลอกรหัสกลุ่ม
      </button>
    </div>
  );
}

export function LoginRequiredView() {
  return (
    <div className="flex min-h-screen bg-background items-center justify-center p-6">
      <div className="max-w-md w-full glass rounded-[2.5rem] p-10 border border-border bg-card/50 flex flex-col items-center text-center gap-8">
        <div className="w-20 h-20 rounded-3xl bg-accent flex items-center justify-center text-white">
          <Wallet className="w-10 h-10" />
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-black tracking-tight uppercase">FINANCE.AI</h1>
          <p className="text-muted text-sm">เข้าสู่ระบบเพื่อดูแดชบอร์ดสรุปรายรับ-รายจ่ายของคุณ</p>
        </div>
        <Link
          href="/auth/login"
          className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center"
        >
          เข้าสู่ระบบ
        </Link>
        <div className="pt-4 border-t border-border w-full">
          <Link href="/" className="text-sm text-accent font-bold hover:underline">
            กลับไปหน้าสแกนสลิป
          </Link>
        </div>
      </div>
    </div>
  );
}

export function SetupDashboardView({ dash }: { dash: ReturnType<typeof useDashboard> }) {
  return (
    <div className="flex min-h-screen bg-background items-center justify-center p-6">
      <div className="max-w-md w-full glass rounded-[2.5rem] p-8 border border-border bg-card/50 flex flex-col items-center text-center gap-8 shadow-2xl">
        <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
          <LayoutDashboard className="w-8 h-8" />
        </div>

        {dash.setupMode === "choose" && (
          <>
            <div className="space-y-2 relative w-full">
              {dash.dashboards.length > 0 && (
                <button 
                  onClick={() => dash.setSetupMode(null)}
                  className="absolute -top-12 -right-4 p-2 text-muted hover:text-foreground transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              )}
              <h2 className="text-2xl font-black uppercase">เริ่มต้นใช้งาน</h2>
              <p className="text-sm text-muted">
                {dash.dashboards.length > 0 ? "เลือกการดำเนินการที่คุณต้องการ" : "ดูเหมือนคุณยังไม่มีแดชบอร์ด คุณต้องการสร้างใหม่หรือเข้าร่วมแดชบอร์ดที่มีอยู่แล้ว?"}
              </p>
            </div>
            <div className="flex flex-col gap-3 w-full">
              <button
                onClick={() => dash.setSetupMode("create")}
                className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-2xl"
              >
                สร้างแดชบอร์ดใหม่
              </button>
              <button
                onClick={() => dash.setSetupMode("join")}
                className="w-full bg-card border border-border text-foreground font-bold py-3.5 rounded-2xl"
              >
                เข้าร่วมแดชบอร์ด (ด้วยรหัส)
              </button>
            </div>
          </>
        )}

        {dash.setupMode === "create" && (
          <>
            <div className="space-y-2 w-full text-left">
              <h2 className="text-xl font-black uppercase text-center mb-6">สร้างแดชบอร์ด</h2>
              <label className="text-xs font-bold text-muted uppercase">ชื่อแดชบอร์ด</label>
              <input
                type="text"
                value={dash.newDashboardName}
                onChange={e => dash.setNewDashboardName(e.target.value)}
                placeholder="เช่น บ้าน, ส่วนตัว, ทริปญี่ปุ่น"
                className="w-full bg-background border border-border rounded-xl px-4 py-3 outline-none mb-4"
              />
              <label className="text-xs font-bold text-muted uppercase">ประเภท</label>
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  onClick={() => dash.setNewDashboardType("personal")}
                  className={cn(
                    "py-3 px-2 rounded-xl text-sm font-bold border flex flex-col items-center gap-2",
                    dash.newDashboardType === "personal"
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : "bg-card border-border text-muted"
                  )}
                >
                  <Wallet className="w-5 h-5" /> รายรับรายจ่าย
                </button>
                <button
                  onClick={() => dash.setNewDashboardType("split_bill")}
                  className={cn(
                    "py-3 px-2 rounded-xl text-sm font-bold border flex flex-col items-center gap-2",
                    dash.newDashboardType === "split_bill"
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : "bg-card border-border text-muted"
                  )}
                >
                  <Users className="w-5 h-5" /> หารค่าใช้จ่าย
                </button>
              </div>
            </div>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => (dash.dashboards.length > 0 ? dash.setSetupMode(null) : dash.setSetupMode("choose"))}
                className="flex-1 bg-card border border-border text-foreground font-bold py-3 rounded-xl"
              >
                ยกเลิก
              </button>
              <button
                onClick={dash.handleCreateDashboard}
                disabled={dash.isProcessingSetup || !dash.newDashboardName}
                className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {dash.isProcessingSetup ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} สร้าง
              </button>
            </div>
          </>
        )}

        {dash.setupMode === "join" && (
          <>
            <div className="space-y-2 w-full text-left">
              <h2 className="text-xl font-black uppercase text-center mb-6">เข้าร่วมแดชบอร์ด</h2>
              <label className="text-xs font-bold text-muted uppercase">รหัสแดชบอร์ด (6 หลัก)</label>
              <input
                type="text"
                value={dash.joinCode}
                onChange={e => dash.setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                placeholder="ABC123"
                className="w-full bg-background border border-border rounded-xl px-4 py-3 outline-none text-center font-black tracking-widest text-xl uppercase mb-6"
              />
            </div>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => (dash.dashboards.length > 0 ? dash.setSetupMode(null) : dash.setSetupMode("choose"))}
                className="flex-1 bg-card border border-border text-foreground font-bold py-3 rounded-xl"
              >
                ยกเลิก
              </button>
              <button
                onClick={dash.handleJoinDashboard}
                disabled={dash.isProcessingSetup || dash.joinCode.length < 3}
                className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {dash.isProcessingSetup ? <Loader2 className="w-4 h-4 animate-spin" /> : <LayoutDashboard className="w-4 h-4" />} เข้าร่วม
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
