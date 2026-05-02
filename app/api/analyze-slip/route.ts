import { createWorker } from "tesseract.js";
import sharp from "sharp";
import jsQR from "jsqr";
import path from "path";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { image } = await req.json();

    if (!image) {
      return NextResponse.json({ error: "Image data is required" }, { status: 400 });
    }

    const base64Data = image.split(",")[1];
    const buffer = Buffer.from(base64Data, "base64");

    // 1. Image Pre-processing for better OCR
    const processedBuffer = await sharp(buffer)
      .grayscale()
      .normalize()
      .threshold(180)
      .toBuffer();

    // 2. Setup Tesseract Worker with Explicit Path for Windows/Next.js
    // This fixes the "Cannot find module E:\ROOT" error
    const workerPath = path.join(process.cwd(), "node_modules", "tesseract.js", "src", "worker-script", "node", "index.js");
    
    const worker = await createWorker("tha+eng", 1, {
      workerPath: workerPath,
      logger: m => console.log(m.status)
    });

    const { data: { text } } = await worker.recognize(processedBuffer);
    await worker.terminate();

    // 3. Scan QR Code
    let qrData = "Not found";
    try {
        const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        const code = jsQR(new Uint8ClampedArray(data), info.width, info.height);
        if (code) qrData = code.data;
    } catch (e) {}

    // Text Normalization for better matching
    const normalizedText = text.replace(/\s+/g, ' ');

    // 4. Amount Extraction
    let amount = 0;
    const amountRegex = /(?:จำนวนเงิน|Amount|ยอดโอน|ยอดเงิน|Total|Sum)\s*[:]?\s*([\d,]+\.\d{2})/i;
    const amountMatch = normalizedText.match(amountRegex) || normalizedText.match(/([\d,]+\.\d{2})/);
    if (amountMatch) {
      amount = parseFloat(amountMatch[1] || amountMatch[0].replace(/,/g, ""));
    }

    // 5. Date Extraction
    let date = new Date().toISOString().split("T")[0];
    
    const thaiMonths = [
      "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
      "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ];
    
    const engMonths = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
      "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
    ];

    // Try Thai date pattern
    const thaiDateRegex = new RegExp(`(\\d{1,2})\\s+(${thaiMonths.join("|")})\\s+(\\d{2,4})`, "i");
    const thaiDateMatch = normalizedText.match(thaiDateRegex);
    
    // Try English date pattern
    const engDateRegex = new RegExp(`(\\d{1,2})\\s+(${engMonths.join("|")})\\s+(\\d{2,4})`, "i");
    const engDateMatch = normalizedText.match(engDateRegex);

    if (thaiDateMatch || engDateMatch) {
      const match = (thaiDateMatch || engDateMatch)!;
      let [_, d, m, y] = match;
      
      let monthIdx;
      if (thaiDateMatch) {
        monthIdx = (thaiMonths.indexOf(m) % 12) + 1;
      } else {
        monthIdx = (engMonths.findIndex(em => em.toLowerCase() === m.toLowerCase()) % 12) + 1;
      }
      
      let yearNum = parseInt(y);
      if (yearNum < 100) yearNum += 2500; 
      if (yearNum > 2400) yearNum -= 543;
      else if (yearNum < 100) yearNum += 2000;
      
      date = `${yearNum}-${monthIdx.toString().padStart(2, "0")}-${d.padStart(2, "0")}`;
    } else {
      // Try numeric pattern: dd/mm/yyyy or yyyy-mm-dd
      const isoMatch = normalizedText.match(/(\d{4})[\-\/](\d{1,2})[\-\/](\d{1,2})/);
      if (isoMatch) {
        date = `${isoMatch[1]}-${isoMatch[2].padStart(2, "0")}-${isoMatch[3].padStart(2, "0")}`;
      } else {
        const slashMatch = normalizedText.match(/(\d{1,2})[\-\/](\d{1,2})[\-\/](\d{2,4})/);
        if (slashMatch) {
          let [_, d, m, y] = slashMatch;
          let yearNum = parseInt(y);
          if (yearNum < 100) yearNum += 2000;
          if (yearNum > 2400) yearNum -= 543;
          date = `${yearNum}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
        }
      }
    }

    // 6. Receiver Extraction
    let receiver = "ไม่ระบุ";
    const receiverRegex = /(?:ไปยัง|โอนให้|To|Receiver|ชื่อผู้รับ|Name)\s*[:]?\s*([^\n\r]+)/i;
    const receiverMatch = normalizedText.match(receiverRegex);
    if (receiverMatch) {
      receiver = receiverMatch[1].trim().substring(0, 50);
    } else {
      const nameMatch = normalizedText.match(/(นาย|นาง|น\.ส\.|บริษัท|บจก\.|Mr\.|Ms\.|Mrs\.)\s*([^\n\r]+)/);
      if (nameMatch) {
          receiver = (nameMatch[1] + nameMatch[2]).trim().substring(0, 50);
      }
    }

    // 7. Bank Extraction (Optional but helpful for receiver field)
    const banks = ["KBank", "SCB", "Krungthai", "KTB", "Bangkok Bank", "BBL", "TMB", "Thanachart", "ttb", "GSB", "Bay", "Krungsri"];
    for (const bank of banks) {
        if (text.toLowerCase().includes(bank.toLowerCase())) {
            if (receiver === "ไม่ระบุ") receiver = bank;
            else receiver = `${receiver} (${bank})`;
            break;
        }
    }

    return NextResponse.json({
      date: date,
      amount: amount,
      receiver: receiver,
      category: "อื่นๆ",
      confidence: 0.8,
      qr_raw: qrData
    });

  } catch (error: any) {
    console.error("OCR Analysis Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
