"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AsyncGate, EmptyView } from "@/components/status-views";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useInventory } from "@/lib/inventory-context";
import { formatoFechaHora } from "@/lib/format";
import { puede } from "@/lib/modulos";
import {
  coincideBusquedaPendiente,
  NOMBRE_MODULO_SESION,
  rutaDeModuloSesion,
  sesionesPendientes,
  sucursalDeSesion,
  type ModuloSesion,
  type SesionCaptura,
} from "@/lib/sesion-captura";
import { sucursalPorId } from "@/lib/sucursales";

function nombreSucursal(sesion: SesionCaptura) {
  const raw = sucursalDeSesion(sesion);
  if (!raw) return undefined;
  return sucursalPorId(raw)?.nombre ?? raw;
}

function PendientesContent() {
  const router = useRouter();
  const { sesiones, user, reanudarSesionPendiente } = useInventory();
  const [q, setQ] = useState("");
  const [abriendo, setAbriendo] = useState<string | null>(null);

  const lista = useMemo(() => {
    return sesionesPendientes(sesiones).filter((s) =>
      puede(user, s.modulo),
    );
  }, [sesiones, user]);

  const visibles = useMemo(() => {
    return lista.filter((s) => coincideBusquedaPendiente(s, q));
  }, [lista, q]);

  async function seguir(sesion: SesionCaptura) {
    setAbriendo(sesion.id);
    try {
      await reanudarSesionPendiente(sesion.modulo as ModuloSesion, sesion.id);
      toast.success("Sigue en la misma lista. No empieza un día nuevo.");
      router.push(rutaDeModuloSesion(sesion.modulo));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "No se pudo continuar.",
      );
    } finally {
      setAbriendo(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight text-amber-800">
          Pendientes
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Capturas a medias. Toca una fila para seguir en el mismo módulo, con
          las mismas cantidades.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="busca-pendientes">Buscar</Label>
        <Input
          id="busca-pendientes"
          className="h-12 text-base"
          placeholder="Sucursal, persona o Existencias / Pedidos / Recepción"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoComplete="off"
        />
      </div>

      {visibles.length === 0 ? (
        <EmptyView
          titulo="No hay pendientes"
          detalle={
            q.trim()
              ? "Nada coincide con esa búsqueda. Borra el texto o prueba otra palabra."
              : "Cuando una captura se quede a medias (también si cierras la pestaña), aparece aquí."
          }
        />
      ) : (
        <ul className="space-y-3">
          {visibles.map((sesion) => {
            const sucursal = nombreSucursal(sesion);
            const cuando = sesion.cerradaEn ?? sesion.ultimaActividad;
            return (
              <li key={sesion.id}>
                <button
                  type="button"
                  disabled={abriendo !== null}
                  onClick={() => void seguir(sesion)}
                  className="flex min-h-20 w-full flex-col items-start rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left shadow-sm active:bg-amber-100 disabled:opacity-60"
                >
                  <span className="font-heading text-lg font-semibold text-amber-950">
                    {NOMBRE_MODULO_SESION[sesion.modulo]}
                  </span>
                  <span className="mt-1 text-sm text-amber-950/80">
                    {sesion.userName}
                    {cuando ? ` · ${formatoFechaHora(cuando)}` : ""}
                  </span>
                  {sucursal ? (
                    <span className="mt-0.5 text-sm text-muted-foreground">
                      {sucursal}
                    </span>
                  ) : null}
                  {abriendo === sesion.id ? (
                    <span className="mt-1 text-sm font-medium text-amber-800">
                      Abriendo…
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function PaginaPendientes() {
  return (
    <AsyncGate>
      <PendientesContent />
    </AsyncGate>
  );
}
