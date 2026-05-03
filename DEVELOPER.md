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

### 1. การสแกน OCR และดึงข้อมูล
*   **Location**: `app/page.tsx` -> ฟังก์ชัน `analyzeSingleSlip`
*   **Engine**: `Tesseract.js` สำหรับถอดข้อความ (ภาษาไทย + อังกฤษ)
*   **QR Scan**: `jsqr` สำหรับถอดข้อมูล Raw QR จากรูปภาพ เพื่อใช้ตรวจสอบความถูกต้องของสลิปในอนาคต

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
4.  **Middleware**: ย้ายจาก `middleware.ts` มาเป็น `proxy.ts` ตามมาตรฐาน Next.js 16
