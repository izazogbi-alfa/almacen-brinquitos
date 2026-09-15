"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  Package,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useInventory } from "@/lib/inventory-context";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/", label: "Existencias", icon: Package },
  { href: "/pedidos", label: "Pedidos", icon: ClipboardList },
  { href: "/recepcion", label: "Recepción", icon: Truck },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { simularFallo, status } = useInventory();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col bg-background md:max-w-5xl">
      <header className="sticky top-0 z-40 border-b bg-background/90 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium tracking-wide text-teal-800 uppercase">
              Bodega Central
            </p>
            <h1 className="font-heading text-lg leading-tight font-semibold">
              Almacén
            </h1>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={simularFallo}
            disabled={status === "loading"}
          >
            Simular error
          </Button>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 pb-28">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
        <div className="mx-auto grid max-w-3xl grid-cols-3 md:max-w-5xl">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-xs font-medium",
                  active ? "text-teal-800" : "text-muted-foreground",
                )}
              >
                <Icon className={cn("size-5", active && "stroke-[2.4]")} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
