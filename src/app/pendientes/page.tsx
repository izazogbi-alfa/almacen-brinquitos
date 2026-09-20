"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DialogQuitarConClave } from "@/components/dialog-quitar-con-clave";
import { AsyncGate, EmptyView } from "@/components/status-views";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useInventory } from "@/lib/inventory-context";
import { formatoFechaHora } from "@/lib/format";
import { puede } from "@/lib/modulos";
import {
  coincideBusquedaPendiente,
  NOMBRE_MODULO_SESION,
  ORDEN_MODULOS_PENDIENTES,
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
  const { sesiones, user, reanudarSesionPendiente, borrarSesionPendiente } =
    useInventory();
  const [q, setQ] = useState("");
  const [abriendo, setAbriendo] = useState<string | null>(null);
  const [aBorrar, setABorrar] = useState<SesionCaptura | null>(null);

  const lista = useMemo(() => {
    return sesionesPendientes(sesiones).filter((s) => puede(user, s.modulo));
  }, [sesiones, user]);

  const visibles = useMemo(() => {
    return lista.filter((s) => coincideBusquedaPendiente(s, q));
  }, [lista, q]);

  const grupos = useMemo(() => {
    return ORDEN_MODULOS_PENDIENTES.map((modulo) => ({
      modulo,
      titulo: NOMBRE_MODULO_SESION[modulo],
      filas: visibles.filter((s) => s.modulo === modulo),
    })).filter((g) => g.filas.length > 0);
  }, [visibles]);

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
    <div className="space-y-5">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight text-amber-800">
          Pendientes
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Por tipo: Existencias, Pedidos, Recepción. Toca la fila para seguir.
          Borrar quita solo esa captura a medias.
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
        <div className="space-y-8">
          {grupos.map((grupo) => (
            <section key={grupo.modulo} className="space-y-3">
              <h3 className="font-heading text-xl font-semibold tracking-tight text-amber-950">
                {grupo.titulo}
              </h3>
              <ul className="space-y-3">
                {grupo.filas.map((sesion) => {
                  const sucursal = nombreSucursal(sesion);
                  const cuando = sesion.cerradaEn ?? sesion.ultimaActividad;
                  return (
                    <li
                      key={sesion.id}
                      className="flex flex-col gap-2 sm:flex-row sm:items-stretch"
                    >
                      <button
                        type="button"
                        disabled={abriendo !== null}
                        onClick={() => void seguir(sesion)}
                        className="flex min-h-20 min-w-0 flex-1 flex-col items-start rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left shadow-sm active:bg-amber-100 disabled:opacity-60"
                      >
                        <span className="text-sm font-medium text-amber-950/80">
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
                        ) : (
                          <span className="mt-1 text-sm font-semibold text-amber-900">
                            Seguir esta captura
                          </span>
                        )}
                      </button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-12 shrink-0 sm:h-auto sm:w-28"
                        disabled={abriendo !== null}
                        onClick={() => setABorrar(sesion)}
                      >
                        Borrar
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <DialogQuitarConClave
        abierto={aBorrar !== null}
        titulo="¿Borrar este pendiente?"
        descripcion="Se quita solo esta captura a medias. El catálogo y lo que ya quedó en existencias no se borra. Escribe tu contraseña y pulsa Sí."
        idCampo="clave-borrar-pendiente"
        etiquetaSi="Sí, borrar"
        onNo={() => setABorrar(null)}
        onConfirmarConClave={async (password) => {
          if (!aBorrar) return;
          await borrarSesionPendiente(aBorrar.id, password);
          setABorrar(null);
          toast.success("Pendiente borrado. Lo demás sigue igual.");
        }}
      />
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
