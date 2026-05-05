"use client";

import { X, Download, Check } from "lucide-react";
import Image from "next/image";
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

          <div className="bg-white p-6 rounded-3xl flex flex-col items-center gap-4 shadow-inner mb-6">
             {paymentType === 'promptpay' && promptPayId ? (
               <>
                 <div className="relative w-48 h-48">
                   <Image 
                     src={`https://promptpay.io/${promptPayId}/${selectedDebt.amount}.png`} 
                     alt="PromptPay QR" 
                     fill
                     unoptimized
                   />
                 </div>
                 <div className="text-center">
                   <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Scan with Banking App</p>
                   <p className="text-lg font-black text-zinc-800">฿{selectedDebt.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                 </div>
               </>
             ) : paymentType === 'bank' && bankAccountNumber ? (
                <>
                  <div className="relative w-48 h-48 bg-white p-3 rounded-2xl shadow-sm border border-zinc-100 flex items-center justify-center">
                    <Image 
                      src={`https://api.qrserver.com/v1/create-qr-code/?data=${bankAccountNumber}&size=300x300`} 
                      alt="Bank QR" 
                      width={180}
                      height={180}
                      unoptimized
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="bg-white p-0.5 rounded-lg shadow-sm border border-zinc-50">
                        {THAI_BANKS.find(b => b.name === bankName)?.logo ? (
                          <img src={THAI_BANKS.find(b => b.name === bankName)?.logo} alt={bankName} className="w-6 h-6 rounded-md object-contain" />
                        ) : (
                          <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center text-white text-[8px] font-black uppercase">BK</div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-center w-full space-y-3">
                    <div className="flex flex-col items-center gap-1">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">โอนเข้าบัญชีธนาคาร</p>
                      <p className="text-sm font-black text-zinc-800">{bankName}</p>
                    </div>
                    <p className="text-2xl font-black text-indigo-600 tracking-wider bg-indigo-50 px-6 py-2 rounded-2xl w-full text-center">{bankAccountNumber}</p>
                    <div className="pt-2">
                       <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">ยอดที่ต้องโอน</p>
                       <p className="text-xl font-black text-zinc-800">฿{selectedDebt.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                </>
             ) : (
               <div className="py-12 px-6 text-center text-zinc-400 italic text-sm">
                  <p>ยังไม่ได้ตั้งค่าข้อมูลการรับเงิน</p>
                  <button onClick={() => { onClose(); setIsSettingsOpen(true); }} className="mt-4 text-indigo-500 font-bold underline">ตั้งค่าตอนนี้</button>
               </div>
             )}
          </div>

          <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar mb-6">
             <p className="text-[10px] font-black text-muted uppercase tracking-widest px-2">รายการที่หาร ({getTransactionBreakdown(selectedDebt.userId).length} รายการ)</p>
             {getTransactionBreakdown(selectedDebt.userId).map((item, idx) => (
               <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-border/50">
                  <div className="flex flex-col">
                     <span className="text-xs font-bold">{item.name}</span>
                     <span className="text-[9px] text-muted">{item.date}</span>
                  </div>
                  <span className="text-xs font-black">฿{item.amount.toLocaleString()}</span>
               </div>
             ))}
          </div>

          <button 
            onClick={() => {
              const toCopy = paymentType === 'promptpay' ? promptPayId : bankAccountNumber;
              if (!toCopy) return;
              navigator.clipboard.writeText(toCopy);
              toast(paymentType === 'promptpay' ? "คัดลอกเลข PromptPay แล้ว" : "คัดลอกเลขบัญชีแล้ว", "success");
            }}
            className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg hover:bg-indigo-500 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" /> {paymentType === 'promptpay' ? "คัดลอกเลขพร้อมเพย์" : "คัดลอกเลขบัญชี"}
          </button>
       </div>
    </div>
  );
}
