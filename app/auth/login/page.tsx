import LoginButton from "@/app/components/LoginButton";
import { Wallet } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen bg-background items-center justify-center p-6">
      <div className="max-w-md w-full glass rounded-[3rem] p-10 border border-border bg-card/50 flex flex-col items-center text-center gap-10 shadow-2xl animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 rounded-[2rem] bg-accent flex items-center justify-center text-white shadow-lg shadow-accent/20 rotate-3 hover:rotate-0 transition-transform duration-500">
          <Wallet className="w-12 h-12" />
        </div>
        
        <div className="space-y-4">
          <h1 className="text-4xl font-black tracking-tight uppercase text-foreground">
            FINANCE<span className="text-accent">.AI</span>
          </h1>
          <p className="text-muted font-bold text-sm uppercase tracking-widest px-4">
            จัดการสลิปและรายรับรายจ่ายด้วย AI อัจฉริยะ
          </p>
        </div>

        <div className="w-full space-y-6">
          <LoginButton />
        </div>

        <p className="text-[10px] text-muted/50 font-medium leading-relaxed">
          การเข้าสู่ระบบแสดงว่าคุณยอมรับข้อตกลงและเงื่อนไข<br />
          และความปลอดภัยของข้อมูลตามนโยบายความเป็นส่วนตัว
        </p>
      </div>
    </div>
  );
}
