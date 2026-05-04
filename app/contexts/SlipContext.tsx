"use client";

import { createContext, useContext, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/app/components/ui/Toast";
import { useAuth } from "./AuthContext";
import type { SlipItem, AnalysisResult, Transaction } from "@/types";

interface SlipContextType {
  slips: SlipItem[];
  setSlips: React.Dispatch<React.SetStateAction<SlipItem[]>>;
  isProcessingAll: boolean;
  isSavingAll: boolean;
  addManualSlip: () => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  updateSlip: (id: string, updates: Omit<Partial<SlipItem>, 'result'> & { result?: Partial<AnalysisResult> }) => void;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  removeSelected: () => void;
  analyzeSingleSlip: (id: string) => Promise<void>;
  processAll: () => Promise<void>;
  saveSingleSlip: (id: string) => Promise<void>;
  saveAll: (bulkCategory?: string, bulkSplit?: boolean, bulkSplitBetween?: string[]) => Promise<void>;
}

const SlipContext = createContext<SlipContextType | undefined>(undefined);

export function SlipProvider({ children }: { children: React.ReactNode }) {
  const { user, selectedDashboardId } = useAuth();
  const { toast } = useToast();
  const [slips, setSlips] = useState<SlipItem[]>([]);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  const updateSlip = useCallback((id: string, updates: Omit<Partial<SlipItem>, 'result'> & { result?: Partial<AnalysisResult> }) => {
    setSlips((prev) => prev.map((s) => {
      if (s.id !== id) return s;
      
      const newSlip = { ...s };
      if (updates.result) {
        newSlip.result = { ...s.result, ...updates.result };
      }
      
      Object.entries(updates).forEach(([key, value]) => {
        if (key !== 'result') {
          (newSlip as unknown as Record<string, unknown>)[key] = value;
        }
      });
      
      return newSlip;
    }));
  }, []);

  const addManualSlip = useCallback(() => {
    const newSlip: SlipItem = {
      id: Math.random().toString(36).substr(2, 9),
      file: new File([], "manual"),
      preview: "",
      status: "done",
      selected: false,
      result: {
        date: new Date().toISOString().split("T")[0],
        amount: 0,
        receiver: "รายการใหม่",
        category: "อื่นๆ",
        confidence: 1
      }
    };
    setSlips((prev) => [newSlip, ...prev]);
  }, []);

  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new window.Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 2000;
          const MAX_HEIGHT = 2000;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.9));
        };
      };
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = 20 - slips.length;
    const filesToProcess = files.slice(0, remainingSlots);

    for (const file of filesToProcess) {
      try {
        const resizedBase64 = await resizeImage(file);
        const newSlip: SlipItem = {
          id: Math.random().toString(36).substr(2, 9),
          file: file,
          preview: resizedBase64,
          status: "pending",
          selected: false,
          result: {
            date: new Date().toISOString().split("T")[0],
            amount: 0,
            receiver: "รอกดสแกน...",
            category: "อื่นๆ",
            confidence: 0
          }
        };
        setSlips((prev) => [...prev, newSlip]);
      } catch (err) {
        console.error("Error processing file:", file.name, err);
      }
    }
    if (e.target) e.target.value = "";
  };

  const toggleSelect = (id: string) => {
    setSlips(prev => prev.map(s => s.id === id ? { ...s, selected: !s.selected } : s));
  };

  const selectAll = () => {
    const allSelected = slips.every(s => s.selected);
    setSlips(prev => prev.map(s => ({ ...s, selected: !allSelected })));
  };

  const removeSelected = () => {
    setSlips(prev => prev.filter(s => !s.selected));
  };

  // OCR via Server API route — no client-side Tesseract/jsQR needed
  const analyzeSingleSlip = async (id: string) => {
    const slip = slips.find((s) => s.id === id);
    if (!slip || slip.status === "analyzing") return;

    updateSlip(id, { status: "analyzing", error: undefined });

    try {
      const res = await fetch("/api/analyze-slip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: slip.preview }),
      });

      if (res.status === 429) {
        const data = await res.json();
        toast(data.error || "กรุณารอสักครู่ก่อนส่งสลิปถัดไป", "info");
        updateSlip(id, { status: "pending" });
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Server error: ${res.status}`);
      }

      const result = await res.json();

      if (!result.amount || result.amount === 0) {
        toast("สแกนไม่ได้: ไม่พบข้อมูลจำนวนเงินหรืออาจไม่ใช่รูปสลิป", "error");
        updateSlip(id, {
          status: "error",
          error: "สแกนไม่ได้ (ไม่พบข้อมูลสลิป)",
          result: {
            date: new Date().toISOString().split("T")[0],
            amount: 0,
            receiver: "สแกนไม่สำเร็จ",
            category: "อื่นๆ",
            confidence: 0
          }
        });
        return;
      }

      updateSlip(id, {
        status: "done",
        result: {
          date: result.date,
          amount: result.amount,
          receiver: result.receiver,
          category: result.category || "อื่นๆ",
          confidence: result.confidence || 0.8,
          qr_raw: result.qr_raw
        }
      });
    } catch (err) {
      const error = err as Error;
      console.error("OCR API Error:", error);
      updateSlip(id, { status: "error", error: error.message });
    }
  };

  const processAll = async () => {
    setIsProcessingAll(true);
    const pendingSlips = slips.filter((s) => s.status === "pending");
    for (const slip of pendingSlips) {
      await analyzeSingleSlip(slip.id);
    }
    setIsProcessingAll(false);
  };

  const saveSingleSlip = async (id: string) => {
    if (!user) return;
    const slip = slips.find(s => s.id === id);
    if (!slip || slip.status !== 'done') return;

    updateSlip(id, { status: "saving" });
    try {
      const insertData: Partial<Transaction> = {
        user_id: user.id,
        name: slip.result.receiver || "ไม่ระบุ",
        amount: -Math.abs(slip.result.amount),
        date: slip.result.date,
        category: slip.result.category,
        receiver: slip.result.receiver
      };

      if (slip.result.isSplit && slip.result.splitBetween) {
        insertData.metadata = { split_between: slip.result.splitBetween };
        insertData.name = `${slip.result.receiver || "ไม่ระบุ"} (หาร ${slip.result.splitBetween.length} คน)`;
      }

      if (selectedDashboardId) {
        insertData.dashboard_id = selectedDashboardId;
      }

      const { error } = await supabase.from('transactions').insert(insertData);
      if (error) throw error;
      
      updateSlip(id, { status: "saved" });
      setTimeout(() => {
        setSlips(prev => prev.filter(s => s.id !== id));
      }, 2000);
    } catch (err) {
      const error = err as Error;
      updateSlip(id, { status: "error", error: "บันทึกล้มเหลว: " + error.message });
    }
  };

  const saveAll = async (bulkCategory?: string, bulkSplit?: boolean, bulkSplitBetween?: string[]) => {
    if (!user) return;
    setIsSavingAll(true);
    const slipsToSave = slips.filter(s => s.status === 'done');
    
    for (const slip of slipsToSave) {
      updateSlip(slip.id, { status: "saving" });
      try {
        const insertData: Partial<Transaction> = {
          user_id: user.id,
          name: slip.result.receiver || "ไม่ระบุ",
          amount: -Math.abs(slip.result.amount),
          date: slip.result.date,
          category: bulkCategory || slip.result.category,
          receiver: slip.result.receiver
        };

        if (bulkSplit && bulkSplitBetween && bulkSplitBetween.length > 0) {
          insertData.metadata = { split_between: bulkSplitBetween };
          insertData.name = `${slip.result.receiver || "ไม่ระบุ"} (หาร ${bulkSplitBetween.length} คน)`;
        } else if (slip.result.isSplit && slip.result.splitBetween) {
          insertData.metadata = { split_between: slip.result.splitBetween };
          insertData.name = `${slip.result.receiver || "ไม่ระบุ"} (หาร ${slip.result.splitBetween.length} คน)`;
        }

        if (selectedDashboardId) {
          insertData.dashboard_id = selectedDashboardId;
        }

        const { error } = await supabase.from('transactions').insert(insertData);
        if (error) throw error;
        updateSlip(slip.id, { status: "saved" });
      } catch (err) {
        const error = err as Error;
        updateSlip(slip.id, { status: "error", error: "บันทึกล้มเหลว: " + error.message });
      }
    }
    
    setIsSavingAll(false);
    setTimeout(() => {
      setSlips(prev => prev.filter(s => s.status !== 'saved'));
    }, 2000);
  };

  const value = {
    slips,
    setSlips,
    isProcessingAll,
    isSavingAll,
    addManualSlip,
    handleFileUpload,
    updateSlip,
    toggleSelect,
    selectAll,
    removeSelected,
    analyzeSingleSlip,
    processAll,
    saveSingleSlip,
    saveAll
  };

  return <SlipContext.Provider value={value}>{children}</SlipContext.Provider>;
}

export const useSlips = () => {
  const context = useContext(SlipContext);
  if (context === undefined) {
    throw new Error("useSlips must be used within a SlipProvider");
  }
  return context;
};
