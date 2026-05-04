"use client";

import { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/app/components/ui/Toast";
import { useAuth } from "./AuthContext";
import type { SlipItem, AnalysisResult, Transaction } from "@/types";
import { createWorker, type Worker } from "tesseract.js";
import jsQR from "jsqr";


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
  const { user, selectedDashboardId, supabase: authSupabase } = useAuth();
  const { toast } = useToast();
  const [slips, setSlips] = useState<SlipItem[]>([]);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  // Cleanup worker on unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

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
      if (file.size > 10 * 1024 * 1024) {
        toast(`ไฟล์ ${file.name} มีขนาดใหญ่เกินไป (จำกัด 10MB)`, "error");
        continue;
      }
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

  // OCR via Client-side Tesseract — follows the 'Iron Rule' (No Server OCR)
  const analyzeSingleSlip = async (id: string, imagePreview?: string) => {
    const slip = imagePreview ? null : slips.find((s) => s.id === id);
    const preview = imagePreview || slip?.preview;
    
    if (!preview || (slip && slip.status === "analyzing")) return;

    updateSlip(id, { status: "analyzing", error: undefined });

    try {
      console.log(`[OCR] 🚀 Starting analysis for slip: ${id}`);
      console.time(`[OCR] Total Time - ${id}`);
      
      // 1. Start QR Scan and OCR in Parallel for better performance
      const qrScanPromise = (async () => {
        console.time(`[QR] Scan Time - ${id}`);
        let qrData = "Not found";
        try {
          const img = new window.Image();
          img.src = preview;
          await new Promise((resolve, reject) => { 
            img.onload = resolve; 
            img.onerror = reject;
          });
          
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            if (code) {
              qrData = code.data;
              console.log(`[QR] Found data:`, qrData);
            }
          }
        } catch (qrErr) {
          console.error(`[QR] Error:`, qrErr);
        }
        console.timeEnd(`[QR] Scan Time - ${id}`);
        return qrData;
      })();

      const ocrPromise = (async () => {
        console.time(`[Tesseract] Worker Init - ${id}`);
        // Prepare Tesseract Worker (Client Side)
        if (!workerRef.current) {
          console.log(`[Tesseract] Initializing new worker...`);
          // Point to local traineddata in public folder
          workerRef.current = await createWorker("tha+eng", 1, {
            workerPath: `${window.location.origin}/worker.min.js`,
            corePath: `${window.location.origin}/tesseract-core.wasm.js`,
            langPath: window.location.origin,
            gzip: false,
            logger: (m) => {
              if (m.status === 'recognizing text') {
                console.log(`[Tesseract] Progress: ${Math.round(m.progress * 100)}%`);
              } else {
                console.log(`[Tesseract] Status: ${m.status}`);
              }
            }
          });
          console.log(`[Tesseract] Worker ready!`);
        }
        console.timeEnd(`[Tesseract] Worker Init - ${id}`);

        console.time(`[Tesseract] Recognition - ${id}`);
        const currentWorker = workerRef.current;
        const { data } = await currentWorker.recognize(preview);
        console.timeEnd(`[Tesseract] Recognition - ${id}`);
        return data;
      })();

      // Wait for both to complete
      const [qrData, ocrResult] = await Promise.all([qrScanPromise, ocrPromise]);
      const text = ocrResult.text;
      const normalizedText = text.replace(/\s+/g, ' ');

      console.time(`[OCR] Data Extraction - ${id}`);
      // 2. Extraction Logic
      const lines = text.split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 2);

      const cleanText = lines.filter((line: string) => !line.match(/(?:Krungthai|กรุงไทย|จ่ายบิล|สำเร็จ|รหัสอ้างอิง|Transaction|Reference|บันทึก)/i)).join(' ');

      // Amount Extraction
      let amount = 0;
      const amountRegex = /(?:จำนวนเงิน|Amount|ยอดโอน|ยอดเงิน|Total|Sum|เงิน)\s*[:]?\s*([\d,]+\.\d{2})/i;
      const amountMatch = cleanText.match(amountRegex) || normalizedText.match(/([\d,]+\.\d{2})/);
      if (amountMatch) {
        amount = parseFloat((amountMatch[1] || amountMatch[0]).replace(/,/g, ""));
      }

      // Date Extraction
      let date = new Date().toISOString().split("T")[0];
      const thaiMonthsShort = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
      const thaiMonthsFull = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
      const engMonthsShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      
      const patterns = [
        { regex: /(\d{1,2})\s+([ก-ฮ\s\.]+)\s+(\d{2,4})/, type: 'thai' },
        { regex: /(\d{1,2})[\-\/](\d{1,2})[\-\/](\d{2,4})/, type: 'numeric' },
        { regex: /(\d{1,2})[\s\.\-\/]*([a-z]{3,10})[\s\.\-\/]*(\d{2,4})/i, type: 'eng' }
      ];

      for (const pattern of patterns) {
        const match = normalizedText.match(pattern.regex);
        if (match) {
          const [, d, m, y] = match;
          const day = parseInt(d);
          let month = 0;
          let year = parseInt(y);

          if (pattern.type === 'thai') {
            const cleanM = m.replace(/[\s\.]/g, "");
            let bestIdx = thaiMonthsShort.findIndex(tm => {
              const tmClean = tm.replace(/[\s\.]/g, "");
              return cleanM === tmClean || cleanM.includes(tmClean) || tmClean.includes(cleanM);
            });
            if (bestIdx === -1) {
              bestIdx = thaiMonthsFull.findIndex(tm => tm.includes(cleanM) || cleanM.includes(tm.substring(0, 3)));
            }
            if (bestIdx !== -1) month = bestIdx + 1;
          } else if (pattern.type === 'numeric') {
            month = parseInt(m);
          } else if (pattern.type === 'eng') {
            const monthIdx = engMonthsShort.findIndex(em => m.toLowerCase().startsWith(em.toLowerCase()));
            if (monthIdx !== -1) month = monthIdx + 1;
          }

          if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            if (year < 100) {
              if (year >= 60 && year <= 75) year = 2500 + year - 543;
              else year = 2000 + year;
            } else if (year > 2400) {
              year -= 543;
            }
            date = `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
            break;
          }
        }
      }

      // Bank/Receiver Hint
      let receiver = "รายการจากสลิป";
      const banks = ["KBank", "SCB", "Krungthai", "KTB", "Bangkok Bank", "BBL", "TMB", "Thanachart", "ttb", "GSB", "Bay", "Krungsri"];
      for (const bank of banks) {
        if (text.toLowerCase().includes(bank.toLowerCase())) {
          receiver = bank;
          break;
        }
      }

      if (!amount || amount === 0) {
        throw new Error("ไม่พบข้อมูลจำนวนเงินหรืออาจไม่ใช่รูปสลิป");
      }

      console.timeEnd(`[OCR] Data Extraction - ${id}`);
      console.timeEnd(`[OCR] Total Time - ${id}`);

      updateSlip(id, {
        status: "done",
        result: {
          date: date,
          amount: amount,
          receiver: receiver,
          category: "อื่นๆ",
          confidence: 0.8,
          qr_raw: qrData
        }
      });
    } catch (err) {
      const error = err as Error;
      console.error("Client OCR Error:", error);
      updateSlip(id, { 
        status: "error", 
        error: error.message,
        result: {
          date: new Date().toISOString().split("T")[0],
          amount: 0,
          receiver: "สแกนไม่สำเร็จ",
          category: "อื่นๆ",
          confidence: 0
        }
      });
    }
  };

  const processAll = async () => {
    setIsProcessingAll(true);
    
    // 1. Get the current list of pending slips using a safe way
    let slipsToProcess: SlipItem[] = [];
    setSlips(current => {
      slipsToProcess = current.filter(s => s.status === "pending");
      return current;
    });

    try {
      // 2. Process them sequentially
      for (const slip of slipsToProcess) {
        await analyzeSingleSlip(slip.id, slip.preview);
      }
    } catch (err) {
      console.error("Process all error:", err);
    } finally {
      setIsProcessingAll(false);
    }
  };

  const saveSingleSlip = async (id: string) => {
    console.log(`[Save] 💾 Starting save for single slip: ${id}`);
    if (!user) {
      console.error("[Save] Error: No user found in AuthContext");
      toast("กรุณาเข้าสู่ระบบก่อนบันทึก", "error");
      return;
    }

    const slip = slips.find(s => s.id === id);
    if (!slip) {
      console.error(`[Save] Error: Slip ${id} not found in state`);
      return;
    }
    if (slip.status !== 'done') {
      console.warn(`[Save] Warning: Slip ${id} status is ${slip.status}, must be 'done'`);
      return;
    }

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

      console.log(`[Save] Inserting data to Supabase:`, insertData);
      const { error } = await authSupabase.from('transactions').insert(insertData);
      if (error) throw error;
      
      console.log(`[Save] ✅ Save successful for: ${id}`);
      updateSlip(id, { status: "saved" });
      setTimeout(() => {
        setSlips(prev => prev.filter(s => s.id !== id));
      }, 2000);
    } catch (err) {
      const error = err as Error;
      console.error(`[Save] ❌ Save failed for ${id}:`, error);
      updateSlip(id, { status: "error", error: "บันทึกล้มเหลว: " + error.message });
      toast("บันทึกล้มเหลว: " + error.message, "error");
    }
  };

  const saveAll = async (bulkCategory?: string, bulkSplit?: boolean, bulkSplitBetween?: string[]) => {
    console.log(`[SaveAll] 💾 Starting bulk save...`);
    if (!user) {
      console.error("[SaveAll] Error: No user found in AuthContext");
      toast("กรุณาเข้าสู่ระบบก่อนบันทึก", "error");
      return;
    }

    // Use functional state to get the actual slips to save right now
    let slipsToSave: SlipItem[] = [];
    setSlips(current => {
      slipsToSave = current.filter(s => s.status === 'done');
      return current;
    });

    console.log(`[SaveAll] Found ${slipsToSave.length} slips to save`);

    if (slipsToSave.length === 0) {
      setIsSavingAll(false);
      return;
    }

    setIsSavingAll(true);
    
    for (const slip of slipsToSave) {
      console.log(`[SaveAll] Saving slip: ${slip.id}`);
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

        console.log(`[SaveAll] 🚀 Sending insert request to Supabase...`, insertData);
        
        // Use authSupabase which has the correct session
        const { error } = await authSupabase.from('transactions').insert(insertData);
        
        if (error) {
          console.error(`[SaveAll] ❌ Supabase Error:`, error);
          throw error;
        }
        
        console.log(`[SaveAll] ✅ Success for slip: ${slip.id}`);
        updateSlip(slip.id, { status: "saved" });
      } catch (err) {
        const error = err as Error;
        console.error(`[SaveAll] ❌ Failed: ${slip.id}`, error);
        updateSlip(slip.id, { status: "error", error: "บันทึกล้มเหลว: " + error.message });
      }
    }
    
    console.log(`[SaveAll] Bulk save process finished`);
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
