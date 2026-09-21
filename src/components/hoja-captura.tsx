"use client";

import { useEffect, useState } from "react";
import { Delete } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TECLAS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["borrar", "0", "enter"],
] as const;

export function HojaCaptura({
  sku,
  color,
  talla,
  cantidad,
  colores,
  tallas,
  verde,
  guardando,
  puedeRegresar,
  onCantidad,
  onColor,
  onTalla,
  onEnter,
  onSaltar,
  onRegresar,
  onCerrar,
  onPendiente,
  onTerminar,
}: {
  sku: string;
  color: string;
  talla: string;
  cantidad: string;
  colores: string[];
  tallas: string[];
  verde?: boolean;
  guardando?: boolean;
  puedeRegresar: boolean;
  onCantidad: (valor: string) => void;
  onColor: (color: string) => void;
  onTalla: (talla: string) => void;
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
      const next = cantidad.length <= 1 ? "0" : cantidad.slice(0, -1);
      onCantidad(next);
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

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="shrink-0 border-b px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2">
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate font-heading text-lg font-semibold">
            {sku}
            <span className="ml-2 font-sans text-base font-medium capitalize">
              {color}
              {talla ? ` · ${talla}` : ""}
            </span>
          </p>
          <Button type="button" variant="ghost" className="h-10 shrink-0 px-3" onClick={onCerrar}>
            Cerrar
          </Button>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11"
            disabled={!puedeRegresar}
            onClick={onRegresar}
          >
            Regresar color
          </Button>
          <Button type="button" variant="outline" className="h-11" onClick={onSaltar}>
            Saltar color
          </Button>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11"
            disabled={guardando}
            onClick={onPendiente}
          >
            {guardando ? "Guardando…" : "Pendiente guardar"}
          </Button>
          <Button
            type="button"
            className={cn("h-11", acento)}
            disabled={guardando}
            onClick={onTerminar}
          >
            {guardando ? "Guardando…" : "Terminar guardar"}
          </Button>
        </div>
        {colores.length > 1 ? (
          <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
            {colores.map((c) => (
              <Button
                key={c}
                type="button"
                variant={c === color ? "default" : "outline"}
                className={cn(
                  "h-9 shrink-0 px-3 text-sm capitalize",
                  c === color && acento,
                )}
                onClick={() => onColor(c)}
              >
                {c}
              </Button>
            ))}
          </div>
        ) : null}
        {tallas.some((t) => t !== "") ? (
          <div className="mt-1 flex gap-1 overflow-x-auto pb-1">
            {tallas.map((t) => (
              <Button
                key={t}
                type="button"
                variant={t === talla ? "default" : "outline"}
                className={cn(
                  "h-8 min-w-9 shrink-0 px-2 text-xs",
                  t === talla && acento,
                )}
                onClick={() => onTalla(t)}
              >
                {t}
              </Button>
            ))}
          </div>
        ) : null}
      </header>

      <div className="flex min-h-0 flex-1 flex-col justify-end px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <p className="py-3 text-center font-heading text-6xl font-semibold tabular-nums tracking-tight">
          {cantidad || "0"}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {TECLAS.flat().map((k) => (
            <Button
              key={k}
              type="button"
              variant={k === "enter" ? "default" : "outline"}
              className={cn(
                "h-14 text-xl",
                k === "enter" && acento,
              )}
              disabled={guardando && k === "enter"}
              aria-label={
                k === "borrar" ? "Borrar" : k === "enter" ? "Enter" : k
              }
              onClick={() => tecla(k)}
            >
              {k === "borrar" ? <Delete className="size-6" /> : k === "enter" ? "Enter" : k}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
