"use client";

import { X, Download, Check, QrCode, TrendingUp } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { DebtItem } from "../../../types";
import { useToast } from "@/app/components/ui/Toast";
import { THAI_BANKS } from "@/lib/constants";

interface PaymentQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDebt: DebtItem | null;
  promptPayId: string;
  paymentType: 'promptpay' | 'bank';
  bankAccountNumber: string;
  bankName: string;
  getTransactionBreakdown: (id: string) => { name: string, amount: number, date: string }[];
  setIsSettingsOpen: (val: boolean) => void;
  onSettle?: (debt: DebtItem) => void;
  isRepay?: boolean;
}

export function PaymentQRModal({
  isOpen,
  onClose,
  selectedDebt,
  promptPayId,
  paymentType,
  bankAccountNumber,
  bankName,
  getTransactionBreakdown,
  setIsSettingsOpen,
  onSettle,
  isRepay = false
}: PaymentQRModalProps) {
  const { toast } = useToast();
  if (!isOpen || !selectedDebt) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
       <div className="glass w-full max-w-md rounded-[2.5rem] p-8 border border-white/20 shadow-2xl bg-card/95 relative">
          <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-6 h-6 text-muted" /></button>
          
          <div className="text-center mb-6">
            <h2 className="text-2xl font-black uppercase mb-1">{isRepay ? "ชำระเงินคืน" : "เรียกเก็บเงิน"}</h2>
            <p className="text-sm text-muted">{isRepay ? "ให้" : "จาก"} {selectedDebt.userId.startsWith('guest:') ? selectedDebt.userId.replace('guest:', '') : `เพื่อน (${selectedDebt.userId.substring(0, 4)})`}</p>
          </div>

          <div className="bg-white p-6 rounded-[2.5rem] flex flex-col items-center gap-4 shadow-xl mb-6 border border-zinc-100 relative overflow-hidden group">
             {paymentType === 'promptpay' && promptPayId ? (
               <>
                 <div className="relative w-48 h-48 animate-in zoom-in-95 duration-500">
                   <Image 
                     src={`https://promptpay.io/${promptPayId}/${selectedDebt.amount}.png`} 
                     alt="PromptPay QR" 
                     fill
                     unoptimized
                     className="rounded-xl"
                   />
                 </div>
                 <div className="text-center">
                   <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Scan with Banking App</p>
                   <p className="text-2xl font-black text-zinc-800">฿{selectedDebt.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                   <p className="text-[9px] font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded-full mt-2 uppercase tracking-tighter">Verified PromptPay QR</p>
                 </div>
               </>
             ) : paymentType === 'bank' && bankAccountNumber ? (
                <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className={cn(
                    "w-full aspect-[1.6/1] rounded-3xl p-6 relative overflow-hidden text-white shadow-2xl",
                    bankName.includes("กสิกร") ? "bg-gradient-to-br from-emerald-600 to-emerald-800" :
                    bankName.includes("ไทยพาณิชย์") ? "bg-gradient-to-br from-purple-600 to-purple-800" :
                    bankName.includes("กรุงไทย") ? "bg-gradient-to-br from-sky-500 to-sky-700" :
                    bankName.includes("กรุงเทพ") ? "bg-gradient-to-br from-blue-700 to-blue-900" :
                    "bg-gradient-to-br from-zinc-700 to-zinc-900"
                  )}>
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                      <QrCode className="w-32 h-32" />
                    </div>
                    <div className="flex justify-between items-start mb-10">
                      <div className="bg-white p-2 rounded-xl shadow-lg">
                        {THAI_BANKS.find(b => b.name === bankName)?.logo ? (
                          <img src={THAI_BANKS.find(b => b.name === bankName)?.logo} alt={bankName} className="w-8 h-8 object-contain" />
                        ) : (
                          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-[10px] font-black">BK</div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Bank Transfer</p>
                        <p className="text-xs font-black uppercase tracking-tighter">{bankName}</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Account Number</p>
                      <p className="text-2xl md:text-3xl font-black tracking-[0.1em]">{bankAccountNumber.replace(/(\d{3})(\d{1})(\d{5})(\d{1})/, "$1-$2-$3-$4")}</p>
                    </div>
                  </div>

                  <div className="text-center space-y-4">
                     <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3 text-left">
                        <div className="bg-amber-500 text-white p-1 rounded-lg mt-0.5"><TrendingUp className="w-3 h-3" /></div>
                        <div>
                          <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest">💡 Tip สำหรับคุณ</p>
                          <p className="text-[9px] font-medium text-amber-700 leading-relaxed">แนะนำให้ใช้ <span className="font-bold underline">PromptPay</span> เพื่อสร้าง QR ที่สแกนจ่ายได้ทันที ทุกแอปธนาคาร!</p>
                        </div>
                     </div>
                     <div className="pt-2">
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">ยอดที่ต้องโอน</p>
                        <p className="text-2xl font-black text-zinc-800">฿{selectedDebt.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                     </div>
                  </div>
                </div>
             ) : (
               <div className="py-12 px-6 text-center text-zinc-400 italic text-sm">
                  <p>ยังไม่ได้ตั้งค่าข้อมูลการรับเงิน</p>
                  <button onClick={() => { onClose(); setIsSettingsOpen(true); }} className="mt-4 text-indigo-500 font-bold underline">ตั้งค่าตอนนี้</button>
               </div>
             )}
          </div>

          <div className="space-y-4 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar mb-8">
             <p className="text-[10px] font-black text-muted uppercase tracking-widest px-2">รายละเอียดรายการ ({getTransactionBreakdown(selectedDebt.userId).length} รายการ)</p>
             {getTransactionBreakdown(selectedDebt.userId).map((item, idx) => (
               <div key={idx} className="flex justify-between items-center p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-border/50">
                  <div className="flex flex-col">
                     <span className="text-xs font-bold">{item.name}</span>
                     <span className="text-[9px] text-muted">{item.date}</span>
                  </div>
                  <span className="text-xs font-black">฿{item.amount.toLocaleString()}</span>
               </div>
             ))}
          </div>

          <div className="flex flex-col gap-3">
            <button 
              onClick={() => {
                const toCopy = paymentType === 'promptpay' ? promptPayId : bankAccountNumber;
                if (!toCopy) return;
                navigator.clipboard.writeText(toCopy);
                toast(paymentType === 'promptpay' ? "คัดลอกเลข PromptPay แล้ว" : "คัดลอกเลขบัญชีแล้ว", "success");
              }}
              className={cn(
                "w-full py-5 font-black rounded-[1.5rem] transition-all active:scale-95 flex items-center justify-center gap-3 shadow-xl",
                paymentType === 'bank' ? "bg-indigo-600 text-white hover:bg-indigo-500" : "bg-black/5 dark:bg-white/5 text-foreground border border-border/50 hover:bg-black/10"
              )}
            >
              <Download className="w-6 h-6" /> {paymentType === 'promptpay' ? "คัดลอกเลขพร้อมเพย์" : "คัดลอกเลขบัญชี"}
            </button>

            {onSettle && (
              <button 
                onClick={() => onSettle(selectedDebt)}
                className={cn(
                  "w-full py-5 font-black rounded-[1.5rem] transition-all active:scale-95 flex items-center justify-center gap-3",
                  paymentType === 'bank' ? "bg-black/5 dark:bg-white/5 text-foreground border border-border/50" : "bg-indigo-600 text-white shadow-xl hover:bg-indigo-500"
                )}
              >
                <Check className="w-6 h-6" /> {isRepay ? "ฉันชำระเงินแล้ว" : "ยืนยันการรับเงิน"}
              </button>
            )}
          </div>
       </div>
    </div>
  );
}
