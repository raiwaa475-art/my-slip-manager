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
  const slipsRef = useRef<SlipItem[]>([]); // ref เพื่อให้ processAll/saveAll เข้าถึง slips ปัจจุบันได้เสมอ
  // ผน stale closure bug: selectedDashboardId ใน closure ของ saveAll อาจเป็นค่าเก่า
  // ใช้ ref แทนเพื่อให้ได้ค่าล่าสุดเสมอตอน save
  const selectedDashboardIdRef = useRef<string>(selectedDashboardId);
  useEffect(() => {
    selectedDashboardIdRef.current = selectedDashboardId;
    console.log(`[SlipContext] selectedDashboardId updated: ${selectedDashboardId}`);
  }, [selectedDashboardId]);

  const userRef = useRef<typeof user>(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Cleanup worker on unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  const updateSlip = useCallback((id: string, updates: Omit<Partial<SlipItem>, 'result'> & { result?: Partial<AnalysisResult> }) => {
    setSlips((prev) => {
      const next = prev.map((s) => {
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
      });
      slipsRef.current = next; // Bug #5 Fix: sync ref ทุกครั้งที่ state เปลี่ยน
      return next;
    });
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
    setSlips((prev) => {
      const next = [newSlip, ...prev];
      slipsRef.current = next;
      return next;
    });
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
        setSlips((prev) => {
          const next = [...prev, newSlip];
          slipsRef.current = next;
          return next;
        });
      } catch (err) {
        console.error("Error processing file:", file.name, err);
      }
    }
    if (e.target) e.target.value = "";
  };

  const toggleSelect = (id: string) => {
    setSlips(prev => {
      const next = prev.map(s => s.id === id ? { ...s, selected: !s.selected } : s);
      slipsRef.current = next;
      return next;
    });
  };

  const selectAll = () => {
    const allSelected = slipsRef.current.every(s => s.selected);
    setSlips(prev => {
      const next = prev.map(s => ({ ...s, selected: !allSelected }));
      slipsRef.current = next;
      return next;
    });
  };

  const removeSelected = () => {
    setSlips(prev => {
      const next = prev.filter(s => !s.selected);
      slipsRef.current = next;
      return next;
    });
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
    // Bug #5 Fix: ดึง slips จาก ref โดยตรง ไม่ใช้ functional setState trick
    // แก้ปัญหา React 18 batch update ที่ทำให้ slipsToProcess เป็น [] เมื่อ loop เริ่ม
    const slipsToProcess = slipsRef.current.filter(s => s.status === "pending");

    if (slipsToProcess.length === 0) {
      toast("ไม่มีสลิปที่รอสแกน", "info");
      return;
    }

    setIsProcessingAll(true);
    try {
      // ใช้ sequential สำหรับ OCR เพราะ Tesseract worker ทำงานทีละอัน
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
    // ใช้ ref เพื่อป้องกัน stale closure (ค่าจาก context ที่อาจใน snapshot เก่าใน closure)
    const currentUser = userRef.current;
    const currentDashboardId = selectedDashboardIdRef.current;

    console.log(`[Save] 💾 Starting save for single slip: ${id}`);
    console.log(`[Save] 📍 Dashboard: ${currentDashboardId || '(none)'}, User: ${currentUser?.id}`);

    if (!currentUser) {
      console.error("[Save] Error: No user found in AuthContext");
      toast("กรุณาเข้าสู่ระบบก่อนบันทึก", "error");
      return;
    }

    const slip = slipsRef.current.find(s => s.id === id);
    if (!slip) {
      console.error(`[Save] Error: Slip ${id} not found in state`);
      return;
    }
    const canSave = slip.status === 'done' || (slip.status === 'error' && slip.result.amount > 0);
    if (!canSave) {
      console.warn(`[Save] Warning: Slip ${id} status is ${slip.status} and amount is ${slip.result.amount}, cannot save`);
      toast("กรุณาสแกนสลิปก่อนบันทึก", "error");
      return;
    }

    updateSlip(id, { status: "saving" });
    try {
      const insertData: Partial<Transaction> = {
        user_id: currentUser.id,
        name: slip.result.receiver || "ไม่ระบุ",
        amount: -Math.abs(Number(slip.result.amount)),
        date: slip.result.date,
        category: slip.result.category,
        receiver: slip.result.receiver
      };

      if (slip.result.isSplit && slip.result.splitBetween) {
        insertData.metadata = { split_between: slip.result.splitBetween };
        insertData.name = `${slip.result.receiver || "ไม่ระบุ"} (หาร ${slip.result.splitBetween.length} คน)`;
      }

      // ใช้ ref เพื่อให้ได้ dashboard ID ล่าสุดเสมอ (stale closure fix)
      if (currentDashboardId) {
        insertData.dashboard_id = currentDashboardId;
      }

      console.log(`[Save] 🚀 Sending data to Supabase:`, insertData);
      const { data, error } = await authSupabase.from('transactions').insert(insertData).select();

      if (error) {
        console.error(`[Save] ❌ Supabase Error Detail:`, {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      console.log(`[Save] ✅ Save successful:`, data);
      updateSlip(id, { status: "saved" });
      setTimeout(() => {
        setSlips(prev => {
          const next = prev.filter(s => s.id !== id);
          slipsRef.current = next;
          return next;
        });
      }, 2000);
    } catch (err) {
      const error = err as Error;
      console.error(`[Save] ❌ Final Catch:`, error);
      updateSlip(id, { status: "error", error: "บันทึกล้มเหลว: " + error.message });
      toast("บันทึกล้มเหลว: " + error.message, "error");
    }
  };

  const saveAll = async (bulkCategory?: string, bulkSplit?: boolean, bulkSplitBetween?: string[]) => {
    const currentUser = userRef.current;
    const currentDashboardId = selectedDashboardIdRef.current;

    console.log(`[SaveAll] 💾 Starting bulk save... Dashboard: ${currentDashboardId || '(none)'}`);
    if (!currentUser) {
      console.error("[SaveAll] Error: No user found in AuthContext");
      toast("กรุณาเข้าสู่ระบบก่อนบันทึก", "error");
      return;
    }

    const slipsToSave = slipsRef.current.filter(s => s.status === 'done');

    console.log(`[SaveAll] Found ${slipsToSave.length} slips to save`);

    if (slipsToSave.length === 0) {
      toast("ไม่มีรายการที่พร้อมบันทึก", "info");
      return;
    }

    setIsSavingAll(true);

    slipsToSave.forEach(slip => updateSlip(slip.id, { status: "saving" }));

    const saveResults = await Promise.allSettled(
      slipsToSave.map(async (slip) => {
        const insertData: Partial<Transaction> = {
          user_id: currentUser.id, // ใช้จาก ref (Bug Fix)
          name: slip.result.receiver || "ไม่ระบุ",
          amount: -(Math.abs(Number(slip.result.amount)) || 0), // ป้องกัน NaN/String issues
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

        // ใช้ currentDashboardId จาก ref เพื่อให้ได้ค่าล่าสุดเสมอ (Bug Fix)
        if (currentDashboardId) {
          insertData.dashboard_id = currentDashboardId;
        }

        console.log(`[SaveAll] 🚀 Sending insert for slip ${slip.id} to dashboard: ${currentDashboardId || 'personal'}`, insertData);
        
        try {
          // 🚀 ใช้ Fetch ยิงตรงเข้าฐานข้อมูลเลย เพื่อข้ามระบบ Auth Session ของ Supabase ที่ค้าง
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
          
          // ดึง Token ดิบๆ จากบราวเซอร์ (ถ้ามี) เพื่อให้บันทึกผ่านระบบความปลอดภัยได้
          const tokenStr = localStorage.getItem('sb-vjbzujwtwshhrisazoyx-auth-token');
          let accessToken = anonKey;
          if (tokenStr) {
             try { accessToken = JSON.parse(tokenStr).access_token || anonKey; } catch (e) {}
          }

          const insertPromise = fetch(`${supabaseUrl}/rest/v1/transactions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': anonKey!,
              'Authorization': `Bearer ${accessToken}`,
              'Prefer': 'return=representation'
            },
            body: JSON.stringify(insertData)
          });

          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Supabase Timeout (10 seconds)")), 10000)
          );

          const response = await Promise.race([insertPromise, timeoutPromise]) as Response;

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`[SaveAll] ❌ API Error for ${slip.id}:`, errorText);
            throw new Error(errorText);
          }
          
          const data = await response.json();
          console.log(`[SaveAll] ✅ Success for slip: ${slip.id}`, data);
          return slip.id;
        } catch (err: any) {
          console.error(`[SaveAll] 💥 Exception during insert for ${slip.id}:`, err);
          throw err; // ให้ Promise.allSettled จับ
        }
      })
    );

    // อัปเดต status ตามผลลัพธ์
    let successCount = 0;
    saveResults.forEach((result, i) => {
      const slip = slipsToSave[i];
      if (result.status === 'fulfilled') {
        successCount++;
        updateSlip(slip.id, { status: "saved" });
      } else {
        const errMsg = (result as any).reason?.message || "บันทึกล้มเหลว";
        console.error(`[SaveAll] ❌ Failed: ${slip.id}`, (result as any).reason);
        updateSlip(slip.id, { status: "error", error: "บันทึกล้มเหลว: " + errMsg });
      }
    });

    if (successCount > 0) {
      toast(`บันทึกสำเร็จ ${successCount} รายการ`, "success");
    }

    const failed = saveResults.filter(r => r.status === 'rejected').length;
    if (failed > 0) {
      toast(`บันทึกไม่สำเร็จ ${failed} รายการ`, "error");
    }

    console.log(`[SaveAll] Bulk save finished. Success: ${successCount}, Failed: ${failed}`);
    setIsSavingAll(false);
    setTimeout(() => {
      setSlips(prev => {
        const next = prev.filter(s => s.status !== 'saved');
        slipsRef.current = next;
        return next;
      });
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
