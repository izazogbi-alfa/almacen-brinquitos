"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { tituloEtiqueta, tituloTalla } from "@/lib/titulo-etiqueta";

const TECLAS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["borrar", "0", "enter"],
] as const;

export function HojaCaptura({
  color,
  talla,
  cantidad,
  verde,
  guardando,
  eje = "color",
  puedeRegresarColor,
  puedeRegresarTalla,
  onCantidad,
  onEnter,
  onSaltarColor,
  onRegresarColor,
  onSaltarTalla,
  onRegresarTalla,
  onCerrar,
  onPendiente,
  onTerminar,
  progresoArticulo,
}: {
  color: string;
  talla: string;
  cantidad: string;
  verde?: boolean;
  guardando?: boolean;
  eje?: "talla" | "color";
  puedeRegresarColor: boolean;
  puedeRegresarTalla?: boolean;
  onCantidad: (valor: string) => void;
  onEnter: () => void;
  onSaltarColor: () => void;
  onRegresarColor: () => void;
  onSaltarTalla?: () => void;
  onRegresarTalla?: () => void;
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
  const porTalla = eje === "talla";
  const celdaAhora = `${color}::${talla}`;
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
  const titulo =
    colorVista && tallaVista
      ? `${colorVista} · ${tallaVista}`
      : colorVista || tallaVista || "Captura";

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
          <Button
            type="button"
            variant="ghost"
            className="h-8 shrink-0 px-2 text-xs"
            onClick={onCerrar}
          >
            Cerrar
          </Button>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {porTalla ? (
            <>
              <Button
                type="button"
                variant="outline"
                className={slim}
                disabled={!puedeRegresarTalla}
                onClick={onRegresarTalla}
              >
                Regresar talla
              </Button>
              <Button
                type="button"
                variant="outline"
                className={slim}
                onClick={onSaltarTalla}
              >
                Saltar talla
              </Button>
            </>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className={slim}
            disabled={!puedeRegresarColor}
            onClick={onRegresarColor}
          >
            Regresar color
          </Button>
          <Button
            type="button"
            variant="outline"
            className={slim}
            onClick={onSaltarColor}
          >
            Saltar color
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
      </div>
    </>
  );
}
