"use client";

import { Users } from "lucide-react";
import { BotonHub } from "@/components/boton-hub";
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
        {SECCIONES_USUARIOS.map((seccion) => (
          <BotonHub
            key={seccion.slug}
            href={seccion.href}
            titulo={seccion.titulo}
            detalle={seccion.detalle}
            icon={ICONOS[seccion.slug]}
          />
        ))}
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
