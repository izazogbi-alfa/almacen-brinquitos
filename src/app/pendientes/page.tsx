"use client";

import { ClipboardList, Package, Truck } from "lucide-react";
import { BotonHub } from "@/components/boton-hub";
import { AsyncGate, EmptyView } from "@/components/status-views";
import { useInventory } from "@/lib/inventory-context";
import { puede } from "@/lib/modulos";
import { SECCIONES_PENDIENTES } from "@/lib/secciones-pendientes";

const ICONOS = {
  existencias: Package,
  recepcion: Truck,
  pedidos: ClipboardList,
} as const;

function HubPendientes() {
  const { user } = useInventory();
  const secciones = SECCIONES_PENDIENTES.filter((s) => puede(user, s.modulo));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight text-amber-800">
          Pendientes
        </h2>
        <p className="text-sm text-muted-foreground">
          Pulsa un botón. Cada tipo está aparte. Volver te trae aquí.
        </p>
      </div>
      {secciones.length === 0 ? (
        <EmptyView
          titulo="No hay pendientes"
          detalle="Iza no te asignó Existencias, Recepción ni Pedidos."
        />
      ) : (
        <div className="grid gap-3">
          {secciones.map((seccion) => (
            <BotonHub
              key={seccion.slug}
              href={seccion.href}
              titulo={seccion.titulo}
              detalle={seccion.detalle}
              icon={ICONOS[seccion.slug]}
              tono="amber"
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function PaginaPendientes() {
  return (
    <AsyncGate>
      <HubPendientes />
    </AsyncGate>
  );
}
