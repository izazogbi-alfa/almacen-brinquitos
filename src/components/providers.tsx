"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { InventoryProvider } from "@/lib/inventory-context";
import { AppShell } from "@/components/app-shell";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <InventoryProvider>
        <AppShell>{children}</AppShell>
        <Toaster position="top-center" richColors />
      </InventoryProvider>
    </ThemeProvider>
  );
}
