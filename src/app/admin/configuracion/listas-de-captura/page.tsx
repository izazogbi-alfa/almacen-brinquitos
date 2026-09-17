"use client";

import { ListChecks, Palette, Ruler, Shirt } from "lucide-react";
import { BotonHub } from "@/components/boton-hub";
import { CabeceraConfiguracion } from "@/components/cabecera-configuracion";
import { AsyncGate } from "@/components/status-views";
import { SinAccesoConfiguracion } from "@/components/use-editor-catalogos";
import { useInventory } from "@/lib/inventory-context";
import { puede } from "@/lib/modulos";
import {
  HREF_CONFIGURACION,
  LISTAS_CAPTURA,
} from "@/lib/secciones-configuracion";

const ICONOS = {
  esquemas: Shirt,
  colores: Palette,
  tallas: Ruler,
  especificaciones: ListChecks,
} as const;

function HubListasCaptura() {
  const { user } = useInventory();

  if (!puede(user, "configuracion")) {
    return <SinAccesoConfiguracion />;
  }

  return (
    <div className="space-y-4">
      <CabeceraConfiguracion
        titulo="Listas de captura"
        descripcion="Pulsa un botón. Cada lista está aparte. Volver te lleva a Configuración."
        volverHref={HREF_CONFIGURACION}
      />
      <div className="grid gap-3">
        {LISTAS_CAPTURA.map((seccion) => (
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

export default function PaginaListasCaptura() {
  return (
    <AsyncGate>
      <HubListasCaptura />
    </AsyncGate>
  );
}
