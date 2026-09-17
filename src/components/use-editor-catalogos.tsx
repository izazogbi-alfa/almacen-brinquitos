"use client";

import { useState } from "react";
import { toast } from "sonner";
import { EmptyView } from "@/components/status-views";
import { useInventory } from "@/lib/inventory-context";
import { puede } from "@/lib/modulos";
import type { Catalogos } from "@/lib/types";

export function SinAccesoConfiguracion() {
  return (
    <EmptyView
      titulo="Sin acceso a configuración"
      detalle="Pide a Iza que te asigne el módulo de configuración."
    />
  );
}

export function useEditorCatalogos() {
  const { user, catalogos, guardarCatalogos } = useInventory();
  const [draft, setDraft] = useState<Catalogos>(catalogos);
  const [guardando, setGuardando] = useState<string | null>(null);

  async function guardarBloque(clave: string, payload: Partial<Catalogos>) {
    setGuardando(clave);
    try {
      await guardarCatalogos(payload);
      toast.success("Guardado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setGuardando(null);
    }
  }

  return {
    permitido: puede(user, "configuracion"),
    draft,
    setDraft,
    guardando,
    guardarBloque,
  };
}
