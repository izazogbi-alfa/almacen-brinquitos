"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { formatoFechaHora } from "@/lib/format";
import { useInventory } from "@/lib/inventory-context";
import {
  idleMsCliente,
  msHastaCierre,
  sesionAbiertaDe,
  sesionVisibleHoy,
  type ModuloSesion,
} from "@/lib/sesion-captura";

export function EstadoSesion({ modulo }: { modulo: ModuloSesion }) {
  const { sesiones } = useInventory();
  const abierta = sesionAbiertaDe(sesiones, modulo);
  const ultima = sesiones.find((s) => s.modulo === modulo && s.cerradaEn);
  if (abierta) {
    return (
      <p className="text-sm font-medium text-teal-800">Sesión abierta</p>
    );
  }
  if (ultima?.cerradaEn) {
    return (
      <p className="text-sm text-muted-foreground">
        Último cierre: {formatoFechaHora(ultima.cerradaEn)} · {ultima.userName}
      </p>
    );
  }
  return null;
}

export function useCierrePorInactividad(
  modulo: ModuloSesion,
  onCerrada?: () => void,
) {
  const { sesiones, cerrarSesionInactividad } = useInventory();
  const abierta = sesionAbiertaDe(sesiones, modulo);
  const idAbierta = abierta?.id;
  const ultima = abierta?.ultimaActividad;
  const onCerradaRef = useRef(onCerrada);
  onCerradaRef.current = onCerrada;
  const yaAviso = useRef<string | null>(null);

  useEffect(() => {
    if (!idAbierta || !ultima) return;
    const idleMs = idleMsCliente();
    const espera = msHastaCierre(ultima, Date.now(), idleMs);
    const t = window.setTimeout(() => {
      void (async () => {
        try {
          const data = await cerrarSesionInactividad(modulo);
          if (data.aviso && yaAviso.current !== idAbierta) {
            yaAviso.current = idAbierta;
            toast.message("Sesión cerrada por inactividad");
            onCerradaRef.current?.();
          }
        } catch {
          /* el siguiente recargo cierra en el servidor */
        }
      })();
    }, espera || 250);
    return () => window.clearTimeout(t);
  }, [idAbierta, ultima, modulo, cerrarSesionInactividad]);
}

export function movimientosDeSesionVisible<
  T extends { sesionId?: string; tipo: string },
>(
  movimientos: T[],
  sesiones: Parameters<typeof sesionVisibleHoy>[0],
  modulo: ModuloSesion,
  tipo: string,
): T[] {
  const visible = sesionVisibleHoy(sesiones, modulo);
  if (!visible) return [];
  return movimientos.filter(
    (m) => m.tipo === tipo && m.sesionId === visible.id,
  );
}
