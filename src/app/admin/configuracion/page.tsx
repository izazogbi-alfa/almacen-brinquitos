"use client";

import { Archive, ClipboardList, FileSpreadsheet, FileText } from "lucide-react";
import { BotonHub } from "@/components/boton-hub";
import { AsyncGate } from "@/components/status-views";
import { SinAccesoConfiguracion } from "@/components/use-editor-catalogos";
import { useInventory } from "@/lib/inventory-context";
import { puede } from "@/lib/modulos";
import { SECCIONES_CONFIGURACION } from "@/lib/secciones-configuracion";

const ICONOS = {
  "listas-de-captura": ClipboardList,
  respaldos: Archive,
  informe: FileText,
  "actualizar-catalogo": FileSpreadsheet,
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
          Pulsa un botón. Cada función está aparte. Luego puedes sumar más
          aquí mismo.
        </p>
      </div>
      <div className="grid gap-3">
        {SECCIONES_CONFIGURACION.filter(
          (seccion) => !seccion.soloAdmin || user?.rol === "admin",
        ).map((seccion) => (
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

export default function PaginaConfiguracion() {
  return (
    <AsyncGate>
      <HubConfiguracion />
    </AsyncGate>
  );
}
