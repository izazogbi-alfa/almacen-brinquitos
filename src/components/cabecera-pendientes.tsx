import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { HREF_PENDIENTES } from "@/lib/secciones-pendientes";

export function CabeceraPendientes({
  titulo,
  descripcion,
}: {
  titulo: string;
  descripcion: string;
}) {
  return (
    <div className="space-y-3">
      <Link
        href={HREF_PENDIENTES}
        className="inline-flex h-12 min-w-12 items-center gap-1 rounded-xl px-3 text-base font-medium text-amber-800 hover:bg-muted"
      >
        <ChevronLeft className="size-5" />
        Volver
      </Link>
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight text-amber-800">
          {titulo}
        </h2>
        <p className="text-sm text-muted-foreground">{descripcion}</p>
      </div>
    </div>
  );
}
