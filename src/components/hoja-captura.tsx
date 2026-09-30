"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FormaCaptura } from "@/lib/forma-captura";
import { tituloEtiqueta, tituloTalla } from "@/lib/titulo-etiqueta";

const TECLAS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["borrar", "0", "enter"],
] as const;

function nombreEje(eje: FormaCaptura) {
  if (eje === "color") return "color";
  if (eje === "especificacion") return "especificación";
  return "talla";
}

export function HojaCaptura({
  color,
  talla,
  especificacion = "",
  cantidad,
  foto,
  nombreArticulo,
  verde,
  guardando,
  eje = "talla",
  puedeRegresar,
  onCantidad,
  onEnter,
  onSaltar,
  onRegresar,
  onCerrar,
  onPendiente,
  onTerminar,
  progresoArticulo,
}: {
  color: string;
  talla: string;
  especificacion?: string;
  cantidad: string;
  foto?: string;
  nombreArticulo?: string;
  verde?: boolean;
  guardando?: boolean;
  eje?: FormaCaptura;
  puedeRegresar: boolean;
  onCantidad: (valor: string) => void;
  onEnter: () => void;
  onSaltar: () => void;
  onRegresar: () => void;
  onCerrar: () => void;
  onPendiente: () => void;
  onTerminar: () => void;
  progresoArticulo?: string;
}) {
  const [pisar, setPisar] = useState(true);
  const [celda, setCelda] = useState(`${color}::${talla}`);
  const acento = verde
    ? "bg-emerald-700 text-white hover:bg-emerald-800"
    : "bg-teal-800 text-white hover:bg-teal-900";
  const celdaAhora = `${eje}::${color}::${talla}::${especificacion}`;
  if (celda !== celdaAhora) {
    setCelda(celdaAhora);
    setPisar(true);
  }

  function tecla(k: string) {
    if (k === "enter") {
      onEnter();
      setPisar(true);
      return;
    }
    if (k === "borrar") {
      onCantidad(cantidad.length <= 1 ? "0" : cantidad.slice(0, -1));
      setPisar(false);
      return;
    }
    if (pisar || cantidad === "0" || cantidad === "") {
      onCantidad(k);
    } else {
      onCantidad(`${cantidad}${k}`.slice(0, 6));
    }
    setPisar(false);
  }

  const slim =
    "h-10 px-1.5 text-[11px] leading-tight font-medium sm:h-11 sm:text-xs";
  const tallaVista = talla ? tituloTalla(talla) : "";
  const colorVista = color ? tituloEtiqueta(color) : "";
  const specVista = especificacion ? tituloEtiqueta(especificacion) : "";
  const ejeVista = eje === "especificacion" ? specVista : colorVista;
  const titulo =
    ejeVista && tallaVista
      ? `${ejeVista} · ${tallaVista}`
      : ejeVista || tallaVista || "Captura";
  const ejeNombre = nombreEje(eje);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" aria-hidden />
      <div
        role="dialog"
        aria-label={titulo}
        className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-3xl rounded-t-2xl border-t bg-background px-3 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] shadow-[0_-10px_40px_rgba(15,23,42,0.18)] md:max-w-5xl"
      >
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-muted-foreground/30" />
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-0.5">
            {progresoArticulo ? (
              <p className="truncate text-xs font-medium text-muted-foreground">
                {progresoArticulo}
              </p>
            ) : null}
            <p
              className="font-heading inline-flex min-h-9 min-w-0 max-w-full items-center truncate rounded-full bg-teal-800 px-3.5 py-1.5 text-base font-bold tracking-wide text-white sm:min-h-10 sm:text-lg"
            >
              {titulo}
            </p>
          </div>
          {foto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={foto}
              alt={nombreArticulo || titulo}
              className="h-[min(20mm,18vw)] w-[min(20mm,18vw)] shrink-0 rounded-lg bg-muted object-contain"
            />
          ) : (
            <div
              className="flex h-[min(20mm,18vw)] w-[min(20mm,18vw)] shrink-0 items-center justify-center rounded-lg bg-muted px-1 text-center text-[10px] leading-tight text-muted-foreground"
              aria-hidden
            >
              Sin foto
            </div>
          )}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <Button
            type="button"
            variant="outline"
            className={slim}
            disabled={!puedeRegresar}
            onClick={onRegresar}
          >
            Regresar {ejeNombre}
          </Button>
          <Button
            type="button"
            variant="outline"
            className={slim}
            onClick={onSaltar}
          >
            Saltar {ejeNombre}
          </Button>
          <Button
            type="button"
            variant="outline"
            className={slim}
            disabled={guardando}
            onClick={onPendiente}
          >
            {guardando ? "Guardando…" : "Pendiente guardar"}
          </Button>
          <Button
            type="button"
            className={cn(slim, acento)}
            disabled={guardando}
            onClick={onTerminar}
          >
            {guardando ? "Guardando…" : "Terminar guardar"}
          </Button>
        </div>
        <p className="py-2 text-center font-heading text-5xl font-semibold tabular-nums tracking-tight">
          {cantidad || "0"}
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {TECLAS.flat().map((k) => (
            <Button
              key={k}
              type="button"
              variant={k === "enter" ? "default" : "outline"}
              className={cn("h-12 text-lg", k === "enter" && acento)}
              disabled={guardando && k === "enter"}
              aria-label={k === "borrar" ? "Borrar" : k === "enter" ? "Enter" : k}
              onClick={() => tecla(k)}
            >
              {k === "borrar" ? "⌫" : k === "enter" ? "Enter" : k}
            </Button>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          className="mt-1.5 h-11 w-full"
          onClick={onCerrar}
        >
          Cerrar
        </Button>
      </div>
    </>
  );
}
