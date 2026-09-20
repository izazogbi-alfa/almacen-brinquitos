"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatoFecha, formatoFechaHora } from "@/lib/format";
import { useInventory } from "@/lib/inventory-context";
import {
  etiquetaBotonPendiente,
  idleMsCliente,
  msHastaCierre,
  sesionAbiertaDe,
  sesionPendienteDe,
  sesionVisibleHoy,
  type BorradorSesion,
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
        {ultima.pendiente ? " · quedó pendiente" : ""}
      </p>
    );
  }
  return null;
}

export function BotonPendiente({
  modulo,
  onReanudada,
}: {
  modulo: ModuloSesion;
  onReanudada?: () => void;
}) {
  const { sesiones, reanudarSesionPendiente } = useInventory();
  const abierta = sesionAbiertaDe(sesiones, modulo);
  const pendiente = sesionPendienteDe(sesiones, modulo);
  const [ocupado, setOcupado] = useState(false);

  if (abierta || !pendiente?.cerradaEn) return null;

  const etiqueta = etiquetaBotonPendiente(modulo);

  return (
    <div className="space-y-1.5">
      <Button
        type="button"
        className="h-auto min-h-16 w-full rounded-xl bg-amber-500 px-4 py-4 text-lg leading-snug font-semibold whitespace-normal text-white shadow-md hover:bg-amber-600"
        disabled={ocupado}
        onClick={() => {
          void (async () => {
            setOcupado(true);
            try {
              await reanudarSesionPendiente(modulo);
              toast.success("Sigue en la misma lista. No empieza un día nuevo.");
              onReanudada?.();
            } catch (err) {
              toast.error(
                err instanceof Error ? err.message : "No se pudo continuar.",
              );
            } finally {
              setOcupado(false);
            }
          })();
        }}
      >
        {ocupado ? "Abriendo…" : etiqueta}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Quedó el {formatoFecha(pendiente.cerradaEn)}
      </p>
    </div>
  );
}

export function useBorradorSesion(
  modulo: ModuloSesion,
  extra?: { sucursalId?: string; proveedor?: string; notasPedido?: string },
  opts?: { crearSiFalta?: boolean },
) {
  const { guardarBorradorSesion, latidoSesion } = useInventory();
  const extraRef = useRef(extra);
  extraRef.current = extra;
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const tRef = useRef<number>(0);

  return (lineas: BorradorSesion["lineas"]) => {
    window.clearTimeout(tRef.current);
    tRef.current = window.setTimeout(() => {
      const e = extraRef.current;
      const payload = {
        sucursalId: e?.sucursalId ?? lineas[0]?.sucursalId,
        proveedor: e?.proveedor,
        notasPedido: e?.notasPedido,
        lineas,
      };
      const run = optsRef.current?.crearSiFalta
        ? latidoSesion(modulo, payload)
        : guardarBorradorSesion(modulo, payload);
      void run.catch(() => {
        /* el siguiente cambio reintenta */
      });
    }, 450);
  };
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
