"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { X } from "lucide-react";
import { moverAIndice, moverEnLista } from "@/lib/listas";
import { cn } from "@/lib/utils";

function indicePorPuntero(
  celdas: Array<HTMLElement | null>,
  x: number,
  y: number,
): number {
  const vivos = celdas
    .map((el, i) => (el ? { i, el } : null))
    .filter((nodo): nodo is { i: number; el: HTMLElement } => nodo !== null);
  if (vivos.length === 0) return 0;
  let mejor = vivos[0].i;
  let mejorDist = Number.POSITIVE_INFINITY;
  for (const { i, el } of vivos) {
    const caja = el.getBoundingClientRect();
    if (
      x >= caja.left &&
      x <= caja.right &&
      y >= caja.top &&
      y <= caja.bottom
    ) {
      return i;
    }
    const cx = caja.left + caja.width / 2;
    const cy = caja.top + caja.height / 2;
    const dist = (x - cx) ** 2 + (y - cy) ** 2;
    if (dist < mejorDist) {
      mejorDist = dist;
      mejor = i;
    }
  }
  return mejor;
}

export function ListaOrdenable<T>({
  items,
  getKey,
  etiqueta,
  onReorder,
  onQuitar,
}: {
  items: T[];
  getKey: (item: T, index: number) => string;
  etiqueta: (item: T) => string;
  onReorder: (items: T[]) => void;
  onQuitar?: (item: T) => void;
}) {
  const idLista = useId();
  const cajaRef = useRef<HTMLDivElement>(null);
  const celdasRef = useRef<Array<HTMLElement | null>>([]);
  const itemsRef = useRef(items);
  const onReorderRef = useRef(onReorder);
  const arrastreRef = useRef<number | null>(null);
  const [arrastre, setArrastre] = useState<number | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const scrollRef = useRef<number | null>(null);
  const xRef = useRef(0);
  const yRef = useRef(0);

  useEffect(() => {
    itemsRef.current = items;
    onReorderRef.current = onReorder;
  }, [items, onReorder]);

  const terminar = useCallback(() => {
    arrastreRef.current = null;
    setArrastre(null);
    setArrastrando(false);
    if (scrollRef.current !== null) {
      cancelAnimationFrame(scrollRef.current);
      scrollRef.current = null;
    }
  }, []);

  const aplicarDesdePunto = useCallback((x: number, y: number) => {
    const desde = arrastreRef.current;
    if (desde === null) return;
    const hacia = indicePorPuntero(celdasRef.current, x, y);
    if (hacia === desde) return;
    onReorderRef.current(moverAIndice(itemsRef.current, desde, hacia));
    arrastreRef.current = hacia;
    setArrastre(hacia);
  }, []);

  useEffect(() => {
    if (!arrastrando) return;

    document.body.classList.add("cursor-grabbing");
    document.body.classList.add("select-none");

    const seguirScroll = () => {
      const y = yRef.current;
      const caja = cajaRef.current;
      if (caja) {
        const r = caja.getBoundingClientRect();
        if (y < r.top + 36) caja.scrollTop -= 12;
        else if (y > r.bottom - 36) caja.scrollTop += 12;
      }
      aplicarDesdePunto(xRef.current, y);
      scrollRef.current = requestAnimationFrame(seguirScroll);
    };
    scrollRef.current = requestAnimationFrame(seguirScroll);

    const onMove = (e: PointerEvent) => {
      xRef.current = e.clientX;
      yRef.current = e.clientY;
      aplicarDesdePunto(e.clientX, e.clientY);
    };
    const bloquearScroll = (e: TouchEvent) => {
      e.preventDefault();
    };
    const onUp = () => terminar();

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    window.addEventListener("touchmove", bloquearScroll, { passive: false });
    return () => {
      document.body.classList.remove("cursor-grabbing");
      document.body.classList.remove("select-none");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("touchmove", bloquearScroll);
      if (scrollRef.current !== null) {
        cancelAnimationFrame(scrollRef.current);
        scrollRef.current = null;
      }
    };
  }, [arrastrando, aplicarDesdePunto, terminar]);

  function iniciar(e: ReactPointerEvent<HTMLElement>, indice: number) {
    if (items.length < 2) return;
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    arrastreRef.current = indice;
    xRef.current = e.clientX;
    yRef.current = e.clientY;
    setArrastre(indice);
    setArrastrando(true);
  }

  return (
    <div>
      <p id={`${idLista}-ayuda`} className="sr-only">
        Recuadro de orden. Arrastra los cuadritos numerados. El 1 queda
        primero.
      </p>
      <div
        ref={cajaRef}
        role="list"
        aria-describedby={`${idLista}-ayuda`}
        className="flex max-h-72 flex-wrap content-start gap-2 overflow-y-auto rounded-xl border bg-muted/30 p-3"
      >
        {items.map((item, i) => {
          const nombre = etiqueta(item);
          return (
            <div
              key={getKey(item, i)}
              role="listitem"
              ref={(el) => {
                celdasRef.current[i] = el;
              }}
              className={cn(
                "relative size-[4.5rem] shrink-0",
                arrastre === i && "z-10",
              )}
            >
              <button
                type="button"
                disabled={items.length < 2}
                title={nombre}
                aria-label={`Cuadro ${i + 1}, ${nombre}. Arrastra para ordenar.`}
                aria-grabbed={arrastre === i}
                onPointerDown={(ev) => iniciar(ev, i)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                    e.preventDefault();
                    onReorder(moverEnLista(items, i, -1));
                  }
                  if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                    e.preventDefault();
                    onReorder(moverEnLista(items, i, 1));
                  }
                }}
                className={cn(
                  "flex size-full touch-none flex-col items-center justify-center rounded-xl border bg-card px-1 pt-1 pb-1 shadow-sm",
                  "text-center outline-none transition-shadow",
                  "focus-visible:ring-3 focus-visible:ring-ring/50",
                  arrastre === i &&
                    "border-primary shadow-md ring-2 ring-primary",
                  items.length < 2 && "opacity-70",
                )}
              >
                <span className="font-heading text-xl font-semibold leading-none tabular-nums text-primary">
                  {i + 1}
                </span>
                <span className="mt-1 line-clamp-2 w-full text-[10px] font-medium leading-tight text-foreground">
                  {nombre}
                </span>
              </button>
              {onQuitar ? (
                <button
                  type="button"
                  className="absolute -top-1.5 -right-1.5 flex size-8 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-sm hover:text-foreground"
                  aria-label={`Quitar ${nombre}`}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => onQuitar(item)}
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const TEXTO_ORDEN =
  "Arrastra los cuadritos. El 1 queda primero. Luego Guardar.";
