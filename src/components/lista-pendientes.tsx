"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CabeceraPendientes } from "@/components/cabecera-pendientes";
import { DialogQuitarConClave } from "@/components/dialog-quitar-con-clave";
import { AsyncGate, EmptyView } from "@/components/status-views";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useInventory } from "@/lib/inventory-context";
import { formatoFechaHora, GRUPOS_REGISTRO, grupoRegistro } from "@/lib/format";
import { puede } from "@/lib/modulos";
import {
  seccionPendienteDe,
  seccionTerminadaDe,
} from "@/lib/secciones-pendientes";
import {
  coincideBusquedaPendiente,
  rutaDeModuloSesion,
  sesionesPendientes,
  sesionesTerminadas,
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

function ListaPendientesModulo({
  modulo,
  archivo,
}: {
  modulo: ModuloSesion;
  archivo?: boolean;
}) {
  const router = useRouter();
  const {
    sesiones,
    user,
    reanudarSesionPendiente,
    borrarSesionPendiente,
    borrarSesionTerminada,
  } = useInventory();
  const [q, setQ] = useState("");
  const [abriendo, setAbriendo] = useState<string | null>(null);
  const [aBorrar, setABorrar] = useState<SesionCaptura | null>(null);
  const seccion = archivo
    ? seccionTerminadaDe(modulo)
    : seccionPendienteDe(modulo);
  const permitido = puede(user, modulo);

  const lista = useMemo(() => {
    if (!permitido) return [];
    const todas = archivo
      ? sesionesTerminadas(sesiones)
      : sesionesPendientes(sesiones);
    return todas.filter((s) => s.modulo === modulo);
  }, [sesiones, modulo, permitido, archivo]);

  const visibles = useMemo(() => {
    return lista.filter((s) => coincideBusquedaPendiente(s, q));
  }, [lista, q]);

  if (!permitido) {
    return (
      <EmptyView
        titulo="Sin acceso"
        detalle="Iza no te asignó este módulo. No sale en el menú ni en Registros."
      />
    );
  }

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
      <CabeceraPendientes
        titulo={seccion.titulo}
        descripcion={
          archivo
            ? "Consulta por día. Borrar pide tu contraseña y quita esta fila, no el catálogo ni el piso."
            : "Consulta por día. Toca la fila para continuar. Borrar pide tu contraseña."
        }
      />

      <div className="space-y-2">
        <Label htmlFor={`busca-pendientes-${modulo}-${archivo ? "t" : "p"}`}>
          Buscar
        </Label>
        <Input
          id={`busca-pendientes-${modulo}-${archivo ? "t" : "p"}`}
          className="h-12 text-base"
          placeholder="Sucursal o persona"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoComplete="off"
        />
      </div>

      {visibles.length === 0 ? (
        <EmptyView
          titulo={archivo ? "No hay terminados" : "No hay en curso"}
          detalle={
            q.trim()
              ? "Nada coincide con esa búsqueda. Borra el texto o prueba otra palabra."
              : archivo
                ? "Cuando pulses Terminar guardar (o Cerrar registro), aparece aquí."
                : "Cuando pulses Pendiente guardar, aparece aquí. Toca la fila para continuar."
          }
        />
      ) : (
        <div className="space-y-8">
          {GRUPOS_REGISTRO.map((grupo) => {
            const filas = visibles.filter((sesion) => {
              const cuando = sesion.cerradaEn ?? sesion.ultimaActividad;
              return cuando ? grupoRegistro(cuando) === grupo : grupo === "Más antiguos";
            });
            if (filas.length === 0) return null;
            return (
              <section key={grupo} className="space-y-3">
                <h3 className="font-heading text-base font-semibold tracking-tight">
                  {grupo}
                </h3>
                <ul className="space-y-3">
                  {filas.map((sesion) => {
                    const sucursal = nombreSucursal(sesion);
                    const cuando = sesion.cerradaEn ?? sesion.ultimaActividad;
                    const estado = archivo ? "Terminado" : "En curso";
                    const meta = (
                      <>
                        <span className="text-xs font-semibold uppercase tracking-wide text-teal-800">
                          {estado}
                        </span>
                        <span className="mt-1 text-sm font-medium">
                          {cuando ? formatoFechaHora(cuando) : "Sin fecha"}
                          {sucursal ? ` · ${sucursal}` : ""}
                        </span>
                        <span className="mt-0.5 text-sm text-muted-foreground">
                          {sesion.userName}
                        </span>
                      </>
                    );
                    return (
                      <li
                        key={sesion.id}
                        className="flex flex-col gap-2 sm:flex-row sm:items-stretch"
                      >
                        {archivo ? (
                          <div className="flex min-h-20 min-w-0 flex-1 flex-col items-start rounded-2xl border bg-card px-4 py-3 text-left shadow-sm">
                            {meta}
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={abriendo !== null}
                            onClick={() => void seguir(sesion)}
                            className="flex min-h-20 min-w-0 flex-1 flex-col items-start rounded-2xl border bg-card px-4 py-3 text-left shadow-sm active:bg-muted disabled:opacity-60"
                          >
                            {meta}
                            <span className="mt-1 text-sm font-semibold text-teal-800">
                              {abriendo === sesion.id
                                ? "Abriendo…"
                                : "Continuar este registro"}
                            </span>
                          </button>
                        )}
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
            );
          })}
        </div>
      )}

      <DialogQuitarConClave
        abierto={aBorrar !== null}
        titulo={archivo ? "¿Borrar este terminado?" : "¿Borrar este registro en curso?"}
        descripcion={
          archivo
            ? "Se quita solo esta fila del archivo. El catálogo y lo que ya quedó en existencias no se borra. Escribe tu contraseña y pulsa Sí."
            : "Se quita solo esta captura a medias. El catálogo y lo que ya quedó en existencias no se borra. Escribe tu contraseña y pulsa Sí."
        }
        idCampo={`clave-borrar-${archivo ? "terminada" : "pendiente"}-${modulo}`}
        etiquetaSi="Sí, borrar"
        onNo={() => setABorrar(null)}
        onConfirmarConClave={async (password) => {
          if (!aBorrar) return;
          if (archivo) {
            await borrarSesionTerminada(aBorrar.id, password);
            toast.success("Terminado borrado. Lo demás sigue igual.");
          } else {
            await borrarSesionPendiente(aBorrar.id, password);
            toast.success("Pendiente borrado. Lo demás sigue igual.");
          }
          setABorrar(null);
        }}
      />
    </div>
  );
}

export function PaginaPendientesModulo({
  modulo,
  archivo,
}: {
  modulo: ModuloSesion;
  archivo?: boolean;
}) {
  return (
    <AsyncGate>
      <ListaPendientesModulo modulo={modulo} archivo={archivo} />
    </AsyncGate>
  );
}
