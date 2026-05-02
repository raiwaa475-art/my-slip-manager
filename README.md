# 🏦 Finance AI - Smart Slip Manager & Dashboard

ระบบจัดการสลิปธนาคารและวิเคราะห์รายรับ-รายจ่ายอัจฉริยะ ด้วยเทคโนโลยี OCR และ AI ช่วยให้การบันทึกค่าใช้จ่ายของคุณเป็นเรื่องง่าย เพียงแค่ "ลากและวาง"

![Dashboard Preview](https://img.shields.io/badge/Status-Production--Ready-emerald?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-Database-emerald?style=for-the-badge&logo=supabase)
![Tesseract.js](https://img.shields.io/badge/OCR-Tesseract.js-orange?style=for-the-badge)

---

## ✨ Features (ความสามารถหลัก)

### 📸 Smart OCR Scanning
*   **Auto Extraction**: สแกนรูปภาพสลิปเพื่อดึงข้อมูล วันที่, จำนวนเงิน, และผู้รับเงิน โดยอัตโนมัติ
*   **Batch Processing**: อัปโหลดและสแกนพร้อมกันได้หลายใบในครั้งเดียว
*   **Manual Entry**: รองรับการเพิ่มรายการเองสำหรับกรณีที่ไม่มีสลิป

### 📊 Professional Dashboard
*   **Monthly Trends**: กราฟวิเคราะห์แนวโน้มรายรับ-รายจ่ายรายเดือน
*   **Category Breakdown**: สรุปสัดส่วนการใช้จ่ายตามหมวดหมู่ (อาหาร, เดินทาง, ช้อปปิ้ง ฯลฯ)
*   **Interactive Calendar**: ปฏิทินแสดงยอดการใช้จ่ายในแต่ละวัน
*   **Transaction Management**: แก้ไขหรือลบรายการที่บันทึกไปแล้วได้ทันที

### 👥 Shared Dashboards & Split Bill
*   **Join via Code**: สร้างห้องหรือเข้าร่วมแดชบอร์ดกับเพื่อนผ่านรหัส 6 หลัก
*   **Multi-user Support**: จัดการการเงินร่วมกันในครอบครัวหรือกลุ่มเพื่อน
*   **Split Bill Logic**: ระบบหารค่าใช้จ่ายที่ช่วยคำนวณยอดเงินต่อคนให้อัตโนมัติ

---

## 🛠 Tech Stack

*   **Frontend**: Next.js 14 (App Router), React, Tailwind CSS
*   **Database & Auth**: Supabase (PostgreSQL, RLS Policies, Google OAuth)
*   **OCR Engine**: Tesseract.js (Client-side & Serverless optimized)
*   **UI Components**: Lucide React Icons, Recharts, Framer Motion
*   **Styling**: Vanilla CSS + Tailwind, Dark Mode Support

---

## 🚀 Getting Started (การติดตั้ง)

### 1. Clone Project
```bash
git clone <your-repo-url>
cd my-slip-manager
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
สร้างไฟล์ `.env.local` และเพิ่มค่าจาก Supabase:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Database Setup (SQL)
รันคำสั่ง SQL ใน Supabase SQL Editor เพื่อสร้าง Table:
*   `dashboards` (id, name, created_at, type, owner_id)
*   `dashboard_users` (id, dashboard_id, user_id)
*   `transactions` (id, user_id, dashboard_id, name, amount, category, date, receiver)

### 5. Run Development Server
```bash
npm run dev
```
เปิดหน้าเว็บที่ [http://localhost:3000](http://localhost:3000)

---

## 📱 Responsive Support
ระบบรองรับการใช้งานทุกหน้าจอ:
*   **Desktop**: มุมมองกว้างขวาง แสดงผลข้อมูลครบถ้วนแบบ Dashboard
*   **Mobile**: ปรับเป็น Card Layout และ Bottom Sheet สะดวกต่อการใช้งานด้วยนิ้วเดียว

---

## 📄 License
MIT License - Created with ❤️ by Antigravity AI
