import { createWorker, type Worker } from "tesseract.js";
import sharp from "sharp";
import jsQR from "jsqr";
import path from "path";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Tesseract Worker Caching (Singleton)
let workerPromise: Promise<Worker> | null = null;

// Simple in-memory rate limiting (per-user)
const lastRequestTime = new Map<string, number>();
const RATE_LIMIT_MS = 5000; // 5 seconds between OCR requests

async function getWorker() {
  if (workerPromise) return workerPromise;
  
  workerPromise = (async () => {
    const options: any = {
      langPath: path.join(process.cwd(), "lang-data"),
      cachePath: path.join(process.cwd(), "lang-data"),
      gzip: false,
    };

    // Only use local worker paths in development to avoid bundling issues in serverless environments
    if (process.env.NODE_ENV === 'development') {
      options.workerPath = path.join(process.cwd(), "node_modules/tesseract.js/src/worker-script/node/index.js");
      options.corePath = path.join(process.cwd(), "node_modules/tesseract.js-core/tesseract-core.wasm.js");
    }
    
    return await createWorker("tha+eng", 1, options);
  })();
  
  return workerPromise;
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting check
    const now = Date.now();
    const lastTime = lastRequestTime.get(user.id) || 0;
    if (now - lastTime < RATE_LIMIT_MS) {
      const waitTime = Math.ceil((RATE_LIMIT_MS - (now - lastTime)) / 1000);
      return NextResponse.json({ 
        error: `โปรดรออีก ${waitTime} วินาทีก่อนส่งสลิปถัดไป (Rate limit)`,
        retryAfter: waitTime
      }, { status: 429 });
    }
    lastRequestTime.set(user.id, now);

    const { image } = await req.json();

    if (!image) {
      return NextResponse.json({ error: "Image data is required" }, { status: 400 });
    }

    const base64Data = image.split(",")[1];
    const buffer = Buffer.from(base64Data, "base64");

    // 1. Image Pre-processing for better OCR (Aggressive for small text)
    const processedBuffer = await sharp(buffer)
      .resize(2000) // Much larger for better OCR of small text
      .grayscale()
      .normalize()
      .sharpen()
      .threshold(170) // Convert to high-contrast black and white
      .toBuffer();

    // 2. Setup/Get Tesseract Worker
    const worker = await getWorker();
    
    const { data: { text } } = await worker.recognize(processedBuffer);
    // Note: Do not terminate worker to allow reuse in warm serverless instances

    // 3. Scan QR Code
    let qrData = "Not found";
    try {
        const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        const code = jsQR(new Uint8ClampedArray(data), info.width, info.height);
        if (code) qrData = code.data;
    } catch { }

    // 4. Text Normalization and Cleaning
    const lines = text.split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 2);

    const cleanText = lines.filter((line: string) => !line.match(/(?:Krungthai|กรุงไทย|จ่ายบิล|สำเร็จ|รหัสอ้างอิง|Transaction|Reference|บันทึก)/i)).join(' ');
    const normalizedText = text.replace(/\s+/g, ' ');

    // 5. Amount Extraction
    let amount = 0;
    const amountRegex = /(?:จำนวนเงิน|Amount|ยอดโอน|ยอดเงิน|Total|Sum|เงิน)\s*[:]?\s*([\d,]+\.\d{2})/i;
    const amountMatch = cleanText.match(amountRegex) || normalizedText.match(/([\d,]+\.\d{2})/);
    if (amountMatch) {
      amount = parseFloat((amountMatch[1] || amountMatch[0]).replace(/,/g, ""));
    }

    // 6. Date Extraction (Improved for accuracy)
    let date = new Date().toISOString().split("T")[0];
    
    const thaiMonthsShort = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    const thaiMonthsFull = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
    const engMonthsShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    // Patterns to try in order of reliability
    const patterns = [
      // 1. Thai Date: 02 พ . ค . 2569 or 12 ม.ค. 67
      {
        regex: /(\d{1,2})\s+([ก-ฮ\s\.]+)\s+(\d{2,4})/,
        type: 'thai'
      },
      // 2. Numeric Date: 12/01/2024 or 12-01-2567
      {
        regex: /(\d{1,2})[\-\/](\d{1,2})[\-\/](\d{2,4})/,
        type: 'numeric'
      },
      // 3. English Date: 12 Jan 2024
      {
        regex: /(\d{1,2})[\s\.\-\/]*([a-z]{3,10})[\s\.\-\/]*(\d{2,4})/i,
        type: 'eng'
      }
    ];

    for (const pattern of patterns) {
      const match = normalizedText.match(pattern.regex);
      if (match) {
        const [, d, m, y] = match;
        const day = parseInt(d);
        let month = 0;
        let year = parseInt(y);

        if (pattern.type === 'thai') {
          // Fuzzy match Thai month: Remove ALL spaces and dots for comparison
          const cleanM = m.replace(/[\s\.]/g, "");
          
          let bestIdx = -1;
          
          // First pass: Match against short forms (without dots)
          bestIdx = thaiMonthsShort.findIndex(tm => {
            const tmClean = tm.replace(/[\s\.]/g, "");
            return cleanM === tmClean || cleanM.includes(tmClean) || tmClean.includes(cleanM);
          });

          if (bestIdx === -1) {
            // Second pass: Match against full names
            bestIdx = thaiMonthsFull.findIndex(tm => tm.includes(cleanM) || cleanM.includes(tm.substring(0, 3)));
          }

          if (bestIdx !== -1) {
            month = bestIdx + 1;
          }
        } else if (pattern.type === 'numeric') {
          month = parseInt(m);
        } else if (pattern.type === 'eng') {
          const monthIdx = engMonthsShort.findIndex(em => m.toLowerCase().startsWith(em.toLowerCase()));
          if (monthIdx !== -1) month = monthIdx + 1;
        }

        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          // Adjust Year
          if (year < 100) {
            // 2-digit year logic
            if (year >= 60 && year <= 75) year = 2500 + year - 543; // e.g., 67 -> 2024
            else year = 2000 + year; // e.g., 24 -> 2024
          } else if (year > 2400) {
            year -= 543; // BE to AD
          }

          date = `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
          break;
        }
      }
    }

    // Logging raw text for debugging (Optional, but helpful)
    if (process.env.NODE_ENV === 'development') {
      console.log("--- OCR RAW TEXT ---");
      console.log(text);
      console.log("--- EXTRACTED DATE ---");
      console.log(date);
      console.log("--------------------");
    }

    // 7. Receiver Extraction (User requested to use default instead of extracting)
    let receiver = ""; // Default empty, user will fill it manually
    
    // 8. Bank Extraction (Keep only as a hint in parentheses if needed, or skip)
    const banks = ["KBank", "SCB", "Krungthai", "KTB", "Bangkok Bank", "BBL", "TMB", "Thanachart", "ttb", "GSB", "Bay", "Krungsri"];
    for (const bank of banks) {
        if (text.toLowerCase().includes(bank.toLowerCase())) {
            receiver = bank;
            break;
        }
    }

    if (!receiver) receiver = "รายการจากสลิป";
    

    return NextResponse.json({
      date: date,
      amount: amount,
      receiver: receiver,
      category: "อื่นๆ",
      confidence: 0.8,
      qr_raw: qrData
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("OCR Analysis Error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
