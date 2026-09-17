"use client";

import Link from "next/link";
import { Users } from "lucide-react";
import { AsyncGate, EmptyView } from "@/components/status-views";
import { useInventory } from "@/lib/inventory-context";
import { SECCIONES_USUARIOS } from "@/lib/secciones-usuarios";

const ICONOS = {
  personas: Users,
} as const;

function HubUsuarios() {
  const { user } = useInventory();

  if (user?.rol !== "admin") {
    return (
      <EmptyView
        titulo="Solo quien administra"
        detalle="Aquí Iza crea personas, les da rol y elige qué módulos ven."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Usuarios
        </h2>
        <p className="text-sm text-muted-foreground">
          Pulsa un botón. Cada función está aparte. Luego puedes sumar más
          aquí mismo.
        </p>
      </div>
      <div className="grid gap-3">
        {SECCIONES_USUARIOS.map((seccion) => {
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

export default function PaginaUsuarios() {
  return (
    <AsyncGate>
      <HubUsuarios />
    </AsyncGate>
  );
}
