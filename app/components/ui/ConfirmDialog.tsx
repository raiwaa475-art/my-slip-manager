"use client";

import { useState, createContext, useContext, useCallback, ReactNode } from "react";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      setResolvePromise(() => resolve);
    });
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    if (resolvePromise) resolvePromise(false);
  }, [resolvePromise]);

  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    if (resolvePromise) resolvePromise(true);
  }, [resolvePromise]);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {isOpen && options && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass w-full max-w-sm rounded-[2.5rem] p-8 border border-white/20 shadow-2xl bg-card/95 relative animate-in zoom-in-95 duration-200">
            <button onClick={handleClose} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors">
              <X className="w-5 h-5 text-muted" />
            </button>
            
            <div className="text-center mb-6">
              <div className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4",
                options.variant === "danger" ? "bg-red-500/10 text-red-500" : 
                options.variant === "warning" ? "bg-amber-500/10 text-amber-500" : 
                "bg-indigo-500/10 text-indigo-500"
              )}>
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black uppercase mb-2">{options.title || "ยืนยันการดำเนินการ"}</h2>
              <p className="text-sm text-muted leading-relaxed">{options.message}</p>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={handleConfirm}
                className={cn(
                  "w-full py-4 text-white font-black rounded-2xl shadow-lg transition-all active:scale-95",
                  options.variant === "danger" ? "bg-red-600 hover:bg-red-500 shadow-red-500/20" : 
                  options.variant === "warning" ? "bg-amber-600 hover:bg-amber-500 shadow-amber-500/20" : 
                  "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20"
                )}
              >
                {options.confirmText || "ยืนยัน"}
              </button>
              <button 
                onClick={handleClose}
                className="w-full py-4 bg-card border border-border text-foreground font-bold rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition-all"
              >
                {options.cancelText || "ยกเลิก"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error("useConfirm must be used within ConfirmProvider");
  return context;
}
