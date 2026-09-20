"use client";

import { CheckCircle2, ClipboardList, Package, Truck } from "lucide-react";
import { BotonHub } from "@/components/boton-hub";
import { AsyncGate, EmptyView } from "@/components/status-views";
import { useInventory } from "@/lib/inventory-context";
import { puede } from "@/lib/modulos";
import {
  SECCIONES_PENDIENTES,
  SECCIONES_TERMINADAS,
} from "@/lib/secciones-pendientes";

const ICONOS_PENDIENTES = {
  existencias: Package,
  recepcion: Truck,
  pedidos: ClipboardList,
} as const;

const ICONOS_TERMINADAS = {
  "existencias-terminadas": Package,
  "recepcion-terminadas": Truck,
  "pedidos-terminados": CheckCircle2,
} as const;

function HubPendientes() {
  const { user } = useInventory();
  const pendientes = SECCIONES_PENDIENTES.filter((s) => puede(user, s.modulo));
  const terminadas = SECCIONES_TERMINADAS.filter((s) => puede(user, s.modulo));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight text-amber-800">
          Pendientes
        </h2>
        <p className="text-sm text-muted-foreground">
          Pulsa un botón. A medias o ya terminadas, cada tipo está aparte.
        </p>
      </div>
      {pendientes.length === 0 ? (
        <EmptyView
          titulo="No hay pendientes"
          detalle="Iza no te asignó Existencias, Recepción ni Pedidos."
        />
      ) : (
        <>
          <div className="grid gap-3">
            {pendientes.map((seccion) => (
              <BotonHub
                key={seccion.slug}
                href={seccion.href}
                titulo={seccion.titulo}
                detalle={seccion.detalle}
                icon={ICONOS_PENDIENTES[seccion.slug]}
                tono="amber"
              />
            ))}
          </div>
          <div className="grid gap-3">
            {terminadas.map((seccion) => (
              <BotonHub
                key={seccion.slug}
                href={seccion.href}
                titulo={seccion.titulo}
                detalle={seccion.detalle}
                icon={ICONOS_TERMINADAS[seccion.slug]}
                tono="teal"
              />
            ))}
          </div>
        </>
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
