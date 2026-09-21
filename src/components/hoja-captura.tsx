"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  puedeRegresar,
  onCantidad,
  onEnter,
  onSaltar,
  onRegresar,
  onCerrar,
  onPendiente,
  onTerminar,
}: {
  color: string;
  talla: string;
  cantidad: string;
  verde?: boolean;
  guardando?: boolean;
  puedeRegresar: boolean;
  onCantidad: (valor: string) => void;
  onEnter: () => void;
  onSaltar: () => void;
  onRegresar: () => void;
  onCerrar: () => void;
  onPendiente: () => void;
  onTerminar: () => void;
}) {
  const [pisar, setPisar] = useState(true);
  const acento = verde
    ? "bg-emerald-700 text-white hover:bg-emerald-800"
    : "bg-teal-800 text-white hover:bg-teal-900";

  useEffect(() => {
    setPisar(true);
  }, [color, talla]);

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
    "h-9 px-1.5 text-[11px] leading-tight font-medium sm:text-xs";

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" aria-hidden />
      <div
        role="dialog"
        aria-label={`${color}${talla ? ` talla ${talla}` : ""}`}
        className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-3xl rounded-t-2xl border-t bg-background px-3 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] shadow-[0_-10px_40px_rgba(15,23,42,0.18)] md:max-w-5xl"
      >
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-muted-foreground/30" />
        <div className="flex items-center justify-between gap-2">
          <p className="font-heading min-w-0 truncate text-lg font-semibold capitalize">
            {color}
            {talla ? ` · ${talla}` : ""}
          </p>
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
          <Button
            type="button"
            variant="outline"
            className={slim}
            disabled={!puedeRegresar}
            onClick={onRegresar}
          >
            Regresar color
          </Button>
          <Button type="button" variant="outline" className={slim} onClick={onSaltar}>
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
