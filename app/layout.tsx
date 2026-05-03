import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FINANCE.AI | ระบบจัดการสลิปและรายรับรายจ่ายอัจฉริยะ",
  description: "จัดการสลิปและบัญชีรายรับรายจ่ายของคุณด้วย AI สรุปยอดอัตโนมัติ หารบิลกับเพื่อนได้ง่ายๆ ในที่เดียว",
  icons: {
    icon: "/icon.png",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground transition-colors">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
