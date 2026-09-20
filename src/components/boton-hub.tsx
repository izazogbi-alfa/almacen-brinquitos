import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function BotonHub({
  href,
  titulo,
  detalle,
  icon: Icon,
  tono = "teal",
}: {
  href: string;
  titulo: string;
  detalle: string;
  icon: LucideIcon;
  tono?: "teal" | "amber";
}) {
  return (
    <Link
      href={href}
      className="flex min-h-24 items-center gap-4 rounded-2xl border bg-card px-4 py-4 shadow-sm active:bg-muted"
    >
      <span
        className={cn(
          "flex size-14 shrink-0 items-center justify-center rounded-xl",
          tono === "amber"
            ? "bg-amber-50 text-amber-800"
            : "bg-teal-50 text-teal-800",
        )}
      >
        <Icon className="size-8" />
      </span>
      <span className="min-w-0 text-left">
        <span className="font-heading block text-lg font-semibold leading-tight">
          {titulo}
        </span>
        <span className="mt-1 block text-sm text-muted-foreground">
          {detalle}
        </span>
      </span>
    </Link>
  );
}
