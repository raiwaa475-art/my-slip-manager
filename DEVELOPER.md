# 👨‍💻 Developer Guide: Project Architecture

คู่มือสำหรับนักพัฒนาเพื่อช่วยให้เข้าใจโครงสร้างโปรเจกต์และหาโค้ดได้ง่ายขึ้น

## 📂 Project Structure (โครงสร้างโฟลเดอร์)

| Folder/File | Description |
| :--- | :--- |
| `app/` | หน้าหลักและ API Routes (Next.js App Router) |
| `app/page.tsx` | หน้าสแกนสลิปหลัก (Main Scanner Logic & Layout) |
| `app/dashboard/` | หน้าแสดงสถิติและจัดการรายการ (Dashboard Page) |
| `app/components/` | คอมโพเนนต์ที่แยกออกมาเพื่อความ Modular |
| `app/components/ui/` | ชิ้นส่วน UI พื้นฐาน (Button, Input, Modal, etc.) |
| `app/dashboard/hooks/` | Custom Hooks สำหรับจัดการข้อมูลธุรกรรม |
| `lib/` | Shared Utilities และ Configuration |
| `lib/supabase/` | Supabase Client setup (Client & Server side) |
| `types/index.ts` | TypeScript Interfaces (หัวใจหลักของข้อมูลในระบบ) |
| `proxy.ts` | จัดการ Session และ Auth State (Supabase SSR) |

---

## 🔑 Key Logic Locations (จุดรวม Logic สำคัญ)

### 1. การสแกน OCR และดึงข้อมูล (Optimized)
*   **Location**: `app/api/analyze-slip/route.ts` (Server-side)
*   **Engine**: `Tesseract.js` รันบน Node.js (Server) เพื่อลดภาระการโหลดไฟล์ 23MB+ ที่ฝั่ง Client
*   **QR Scan**: `jsqr` รันบน Server เช่นกัน เพื่อดึง Raw Data จากสลิป
*   **Client Side**: ส่งรูปภาพ Base64 ไปยัง API และรอรับผลลัพธ์ ทำให้หน้าเว็บโหลดเริ่มต้นได้เร็วขึ้นมาก (ลด Bundle Size)

### 2. การจัดการข้อมูลธุรกรรม (Transactions)
*   **Location**: `app/dashboard/hooks/useTransactions.ts`
*   **Features**: ดึงข้อมูล (Fetch), เพิ่ม/ลบ (CRUD), และ Real-time update ผ่าน Supabase Realtime
*   **State Management**: ใช้ `useMemo` และ `useCallback` เพื่อ Optimize ประสิทธิภาพ

### 3. ระบบการหารบิล (Split Bill System)
*   **Storage**: เก็บรายชื่อผู้ร่วมหารใน `transaction.metadata.split_between` (เป็น User ID หรือ Guest Name)
*   **Logic**: การหารจะถูกประมวลผลที่ฝั่ง Client เมื่อบันทึก และสรุปยอดหนี้ใน Dashboard
*   **Components**:
    *   `SlipRow.tsx`: UI จัดการข้อมูลสลิปแต่ละใบ
    *   `SplitSettingsModal.tsx`: จัดการผู้หารแต่ละรายการ
    *   `BulkSaveModal.tsx`: ตั้งค่าการหารแบบกลุ่มสำหรับหลายสลิปพร้อมกัน

### 4. Authentication & Middleware
*   **Middleware**: `proxy.ts` ทำหน้าที่ Refresh Session ของ Supabase ทุกครั้งที่มีการ Request
*   **Auth**: ใช้ Supabase Auth (Google OAuth และ Email)

---

## 🛠 Database Schema (Supabase)

*   **`dashboards`**: กลุ่มหรือพื้นที่จัดการเงิน (เช่น "ส่วนตัว", "ทริปญี่ปุ่น")
    *   `metadata`: เก็บ `guest_members` (รายชื่อคนที่ไม่เข้าระบบ) และ `promptpay_id`
*   **`dashboard_users`**: ตารางกลางเชื่อม User เข้ากับ Dashboard (Many-to-Many)
*   **`transactions`**: ข้อมูลรายรับ-รายจ่าย
    *   `metadata`: เก็บข้อมูลเสริม เช่น `split_between`

---

## 📱 Responsive & UI Strategy
*   **Mobile First**: เน้นการใช้งานบนมือถือเป็นหลัก (Bottom Navigation และ Touch-friendly buttons)
*   **Glassmorphism**: ใช้พื้นหลังโปร่งแสงและ Blur เพื่อความสวยงามพรีเมียม
*   **Theme**: รองรับทั้ง Light และ Dark Mode ผ่าน `ThemeToggle`

---

## 💡 Tips สำหรับการพัฒนาต่อ
*   **ต้องการแก้ระบบสแกน**: แก้ไข Logic ใน `app/page.tsx` และ UI ใน `app/components/SlipRow.tsx`
*   **ต้องการเพิ่ม Category**: ไปที่ `lib/constants.ts` -> `CATEGORIES`
*   **ต้องการแก้ไข Type**: ไปที่ `types/index.ts` เพื่อรักษาความถูกต้องของข้อมูลทั่วทั้งโปรเจกต์
*   **การทดสอบ**: รัน `npm run dev` และใช้ `npm run lint` เพื่อตรวจสอบ Type Safety

---

## 🚀 Recent Architecture Improvements
มีการ Refactor ครั้งใหญ่เพื่อแก้ปัญหาไฟล์ `app/page.tsx` ใหญ่เกินไป:
1.  **Extraction**: แยก Logic UI สลิปไปที่ `SlipRow.tsx`
2.  **Modals**: แยก `SplitSettingsModal` และ `BulkSaveModal` ออกมา
3.  **Typing**: ย้าย Type ทั้งหมดไปที่ `types/index.ts` เพื่อความเป็นระเบียบ
4.  **Middleware**: ใช้ชื่อ `proxy.ts` ตามมาตรฐาน Next.js 16 (Turbopack)

---

## 🚀 Deployment & Production Readiness (การเตรียมพร้อมก่อน Deploy)
โปรเจกต์นี้ได้รับการตรวจสอบความพร้อมสำหรับการ Deploy (เช่น บน Vercel) ดังนี้:
1.  **Middleware/Proxy Setup**: ใช้ `proxy.ts` แทน `middleware.ts` ตามข้อกำหนดของ Next.js 16.2.4 ในโปรเจกต์นี้ เพื่อรองรับการจัดการ Auth Session ในระดับ Server-side
2.  **Linting & Type Safety**: แก้ไข `any` types และ unused variables ทั้งหมดเพื่อให้ผ่าน `npm run lint` ซึ่งสำคัญมากสำหรับ CI/CD
3.  **Build Verification**: ตรวจสอบแล้วว่า `npm run build` ผ่านสมบูรณ์ ไม่มีการ Error ในขั้นตอน Compilation
4.  **Environment Variables**: ต้องตั้งค่า `NEXT_PUBLIC_SUPABASE_URL` และ `NEXT_PUBLIC_SUPABASE_ANON_KEY` ใน Production environment
5.  **Tesseract.js**: ใช้ `tha+eng` trained data ที่ถูกเก็บไว้ใน `/lang-data` เพื่อความรวดเร็วและไม่พึ่งพา External CDN ระหว่างรัน
