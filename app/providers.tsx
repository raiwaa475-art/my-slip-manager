"use client";

import { ThemeProvider } from "next-themes";
import { ToastProvider } from "./components/ui/Toast";
import { ConfirmProvider } from "./components/ui/ConfirmDialog";
import { AuthProvider } from "./contexts/AuthContext";

if (typeof window !== "undefined") {
  const originalReleasePointerCapture = Element.prototype.releasePointerCapture;
  Element.prototype.releasePointerCapture = function (pointerId) {
    try {
      originalReleasePointerCapture.call(this, pointerId);
    } catch {
      // Ignore NotFoundError: No active pointer with the given id is found
    }
  };
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ConfirmProvider>
        <ToastProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ToastProvider>
      </ConfirmProvider>
    </ThemeProvider>
  );
}
