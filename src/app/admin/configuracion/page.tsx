"use client";

import Link from "next/link";
import { ListChecks, Palette, Ruler, Shirt } from "lucide-react";
import { AsyncGate } from "@/components/status-views";
import { SinAccesoConfiguracion } from "@/components/use-editor-catalogos";
import { useInventory } from "@/lib/inventory-context";
import { puede } from "@/lib/modulos";
import { SECCIONES_CONFIGURACION } from "@/lib/secciones-configuracion";

const ICONOS = {
  esquemas: Shirt,
  colores: Palette,
  tallas: Ruler,
  especificaciones: ListChecks,
} as const;

function HubConfiguracion() {
  const { user } = useInventory();

  if (!puede(user, "configuracion")) {
    return <SinAccesoConfiguracion />;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Configuración
        </h2>
        <p className="text-sm text-muted-foreground">
          Pulsa un botón. Cada lista está aparte. Luego puedes sumar sucursales
          o PDF aquí mismo.
        </p>
      </div>
      <div className="grid gap-3">
        {SECCIONES_CONFIGURACION.map((seccion) => {
          const Icon = ICONOS[seccion.slug];
          return (
            <Link
              key={seccion.slug}
              href={seccion.href}
              className="flex min-h-24 items-center gap-4 rounded-2xl border bg-card px-4 py-4 shadow-sm active:bg-muted"
            >
              <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-800">
                <Icon className="size-8" />
              </span>
              <span className="min-w-0 text-left">
                <span className="font-heading block text-lg font-semibold leading-tight">
                  {seccion.titulo}
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {seccion.detalle}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function PaginaConfiguracion() {
  return (
    <AsyncGate>
      <HubConfiguracion />
    </AsyncGate>
  );
}
