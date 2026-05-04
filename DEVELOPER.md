# 👨‍💻 Developer Guide: Project Architecture

คู่มือสำหรับนักพัฒนาเพื่อช่วยให้เข้าใจโครงสร้างโปรเจกต์ การจัดการข้อมูล และ Logic สำคัญในระบบ "FINANCE.AI"

## 📂 Project Structure

| Folder/File | Description |
| :--- | :--- |
| `app/` | หัวใจของ Next.js (App Router) |
| `app/page.tsx` | หน้าหลักสำหรับอัปโหลดและจัดการสลิปก่อนบันทึก |
| `app/dashboard/` | หน้าแสดงสถิติ รายการธุรกรรม และระบบหารบิล |
| `app/api/` | Server-side logic (OCR Analysis, Database operations) |
| `app/contexts/` | Global State (AuthContext, SlipContext) |
| `app/dashboard/hooks/` | Custom Hooks แยกตามฟังก์ชัน (useTransactions, useDebts, useGuestMembers) |
| `lib/` | Shared Utilities และ Configuration |
| `lib/supabase/` | Supabase Client setup (Client & Server side) |
| `types/index.ts` | TypeScript Interfaces (หัวใจหลักของข้อมูลในระบบ) |
| `lang-data/` | ไฟล์ `traineddata` สำหรับ Tesseract OCR (ไทย+อังกฤษ) |

---

## 🔑 Key Logic & Implementations

### 1. ระบบ OCR อัจฉริยะ (Client-side OCR)
เราใช้ **Tesseract.js** รันบน Browser ('use client') ตาม "กฎเหล็ก" เพื่อความเสถียรสูงสุดและลดภาระ Server

*   **Iron Rule**: Tesseract ต้องไม่รันบน Server (API Route) เพื่อหลีกเลี่ยงปัญหา Environment Mismatch ใน Node.js และประหยัดทรัพยากรบน Vercel
*   **Worker Management**: ใช้ Singleton Worker ใน Client Context และมีการสั่ง `terminate()` เมื่อ Unmount เพื่อคืน Memory
*   **Image Processing**: ใช้ Browser Canvas ในการจัดการรูปภาพก่อนส่งให้ OCR
*   **Data Validation**: 
    *   **Regex Extraction**: ระบบสกัดข้อมูล (วันที่/ยอดเงิน) ทำงานบน Client ทั้งหมดแล้วส่งเป็น JSON ไปบันทึกที่ Database
    *   **QR Scanning**: ใช้ `jsqr` รันบน Client เพื่อสแกน QR Code (Slip Verify) ควบคู่ไปกับ OCR

### 2. การจัดการ State ใน Dashboard (Performance Optimized)
Dashboard ถูกออกแบบมาให้รองรับข้อมูลจำนวนมากโดยไม่เกิดปัญหา Performance

*   **Infinite Loop Prevention**: ข้อมูลที่มาจากการคำนวณ (Derived State) เช่น `guestMembers`, `trendData`, และ `categoryData` จะถูกครอบด้วย `useMemo` เพื่อรักษาความคงที่ของ Object Reference ป้องกันการ Trigger `useEffect` วนลูป
*   **Stable Callbacks**: ฟังก์ชันที่ส่งลงไปให้ Component ลูก (เช่น `setActiveDashboard`) จะถูกครอบด้วย `useCallback` เพื่อลดการ Re-render ที่ไม่จำเป็น
*   **Lazy Loading**: คอมโพเนนต์กราฟ (Recharts) ถูกโหลดแบบ **Dynamic Import (Lazy Loading)** เพื่อลดภาระการโหลดหน้าเว็บในครั้งแรก (ลดขนาดลงได้ประมาณ 300KB+)

### 3. ระบบหารบิล (Split Bill Logic)
*   **Greedy Algorithm**: ระบบคำนวณหนี้ในกลุ่มโดยใช้หลักการจับคู่ลูกหนี้และเจ้าหนี้ที่มียอดสูงสุดเข้าด้วยกัน (Greedy approach) เพื่อให้จำนวนครั้งในการโอนคืนน้อยที่สุด
*   **Guest Support**: รองรับทั้งสมาชิกในระบบ และ "Guest" (เพื่อนที่ไม่มีบัญชี) โดยใช้ ID Prefix `guest:` เพื่อความง่ายในการจัดการ

### 4. ระบบการรับเงิน (Payment Methods)
*   แดชบอร์ดแต่ละกลุ่มสามารถตั้งค่าการรับเงินได้ 2 รูปแบบ: **PromptPay** (สร้าง QR อัตโนมัติ) หรือ **Bank Account** (แสดงเลขบัญชีและชื่อธนาคาร)
*   ข้อมูลเหล่านี้ถูกเก็บไว้ใน `metadata` ของตาราง `dashboards` ใน Supabase

---

## 🚀 Deployment Notes (Vercel)

1.  **Environment Variables**: ต้องตั้งค่า `NEXT_PUBLIC_SUPABASE_URL` และ `NEXT_PUBLIC_SUPABASE_ANON_KEY` ใน Vercel Dashboard
2.  **Dependencies**: ตรวจสอบว่ามี `node-fetch` (v2) ใน `package.json` เพราะ Tesseract.js Worker ใน Node.js จำเป็นต้องใช้
3.  **Build Testing**: แนะนำให้รัน `npm run build` และ `npm run start` ในเครื่องตัวเองก่อน Deploy เสมอเพื่อตรวจสอบความถูกต้องของระบบ Bundle

---

*อัปเดตล่าสุด: 4 พฤษภาคม 2026*
