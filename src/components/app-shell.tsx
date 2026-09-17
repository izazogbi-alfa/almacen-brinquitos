"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  Package,
  Settings,
  Shirt,
  Truck,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useInventory } from "@/lib/inventory-context";
import { etiquetaRol, puede } from "@/lib/modulos";
import { Button } from "@/components/ui/button";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useInventory();

  if (pathname === "/login") {
    return <>{children}</>;
  }

  const nav = [
    puede(user, "existencias")
      ? { href: "/", label: "Existencias", icon: Package }
      : null,
    puede(user, "pedidos")
      ? { href: "/pedidos", label: "Pedidos", icon: ClipboardList }
      : null,
    puede(user, "recepcion")
      ? { href: "/recepcion", label: "Recepción", icon: Truck }
      : null,
    puede(user, "articulos")
      ? { href: "/admin/articulos", label: "Artículos", icon: Shirt }
      : null,
    puede(user, "configuracion")
      ? { href: "/admin/configuracion", label: "Configuración", icon: Settings }
      : null,
    user?.rol === "admin"
      ? { href: "/admin/usuarios", label: "Usuarios", icon: Users }
      : null,
  ].filter(Boolean) as {
    href: string;
    label: string;
    icon: typeof Package;
  }[];

    const cols =
      nav.length <= 1
        ? "grid-cols-1"
        : nav.length === 2
          ? "grid-cols-2"
          : nav.length === 4
            ? "grid-cols-4"
            : nav.length === 5
              ? "grid-cols-5"
              : nav.length >= 6
                ? "grid-cols-3 sm:grid-cols-6"
                : "grid-cols-3";

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col bg-background md:max-w-5xl">
      <header className="sticky top-0 z-40 border-b bg-background/90 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium tracking-wide text-teal-800 uppercase">
              Brinquitos
            </p>
            <h1 className="font-heading text-lg leading-tight font-semibold">
              Almacén
            </h1>
          </div>
          {user ? (
            <div className="shrink-0 text-right">
              <p className="text-sm font-medium">{user.nombre}</p>
              <p className="text-xs text-muted-foreground">
                {etiquetaRol(user.rol)} ·{" "}
                {user.username}
              </p>
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto px-0 text-xs"
                onClick={() => void logout()}
              >
                Cerrar sesión
              </Button>
            </div>
          ) : null}
        </div>
      </header>

      <main className="flex-1 px-4 py-4 pb-28">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
        <div className={cn("mx-auto grid max-w-3xl md:max-w-5xl", cols)}>
          {nav.map((item) => {
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
                  "flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium sm:text-xs",
                  active
                    ? item.href.startsWith("/recepcion")
                      ? "text-emerald-800"
                      : "text-teal-800"
                    : "text-muted-foreground",
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
