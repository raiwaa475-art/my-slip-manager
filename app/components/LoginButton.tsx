"use client";

import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

export default function LoginButton() {
  const supabase = createClient();

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <button
      onClick={handleLogin}
      className="flex items-center gap-2 bg-white text-black hover:bg-gray-100 px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg border border-gray-200"
    >
      <div className="relative w-5 h-5">
        <Image 
          src="https://www.google.com/favicon.ico" 
          alt="Google" 
          fill
          unoptimized
        />
      </div>
      เข้าสู่ระบบด้วย Google
    </button>
  );
}
