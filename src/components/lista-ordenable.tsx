"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { GripVertical, X } from "lucide-react";
import { moverAIndice, moverEnLista } from "@/lib/listas";
import { cn } from "@/lib/utils";

function indicePorPuntero(
  filas: Array<HTMLElement | null>,
  y: number,
): number {
  const vivos = filas
    .map((el, i) => (el ? { i, el } : null))
    .filter((x): x is { i: number; el: HTMLElement } => x !== null);
  if (vivos.length === 0) return 0;
  for (const { i, el } of vivos) {
    const caja = el.getBoundingClientRect();
    if (y < caja.top + caja.height / 2) return i;
  }
  return vivos[vivos.length - 1].i;
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
  const filasRef = useRef<Array<HTMLElement | null>>([]);
  const itemsRef = useRef(items);
  const onReorderRef = useRef(onReorder);
  const arrastreRef = useRef<number | null>(null);
  const [arrastre, setArrastre] = useState<number | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const scrollRef = useRef<number | null>(null);
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

  const aplicarDesdeY = useCallback((y: number) => {
    const desde = arrastreRef.current;
    if (desde === null) return;
    const hacia = indicePorPuntero(filasRef.current, y);
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
      aplicarDesdeY(y);
      scrollRef.current = requestAnimationFrame(seguirScroll);
    };
    scrollRef.current = requestAnimationFrame(seguirScroll);

    const onMove = (e: PointerEvent) => {
      yRef.current = e.clientY;
      aplicarDesdeY(e.clientY);
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
  }, [arrastrando, aplicarDesdeY, terminar]);

  function iniciar(e: ReactPointerEvent<HTMLElement>, indice: number) {
    if (items.length < 2) return;
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    arrastreRef.current = indice;
    yRef.current = e.clientY;
    setArrastre(indice);
    setArrastrando(true);
  }

  return (
    <div>
      <p id={`${idLista}-ayuda`} className="sr-only">
        Recuadro de orden. Arrastra cada fila hacia arriba o abajo. La de
        arriba queda primera.
      </p>
      <div
        ref={cajaRef}
        role="list"
        aria-describedby={`${idLista}-ayuda`}
        className="max-h-64 overflow-y-auto rounded-xl border bg-muted/40"
      >
        {items.map((item, i) => {
          const nombre = etiqueta(item);
          return (
            <div
              key={getKey(item, i)}
              role="listitem"
              ref={(el) => {
                filasRef.current[i] = el;
              }}
              className={cn(
                "flex items-stretch border-b border-border/70 last:border-b-0",
                arrastre === i && "bg-primary/10",
              )}
            >
              <button
                type="button"
                disabled={items.length < 2}
                aria-label={`Mover ${nombre}`}
                aria-grabbed={arrastre === i}
                onPointerDown={(ev) => iniciar(ev, i)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    onReorder(moverEnLista(items, i, -1));
                  }
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    onReorder(moverEnLista(items, i, 1));
                  }
                }}
                className={cn(
                  "flex min-h-11 min-w-0 flex-1 touch-none items-center gap-2 px-2 text-left",
                  "focus-visible:ring-3 focus-visible:ring-ring/50",
                  items.length < 2 && "opacity-70",
                )}
              >
                <GripVertical
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {nombre}
                </span>
              </button>
              {onQuitar ? (
                <button
                  type="button"
                  className="flex size-11 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
                  aria-label={`Quitar ${nombre}`}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => onQuitar(item)}
                >
                  <X className="size-4" />
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
  "En el recuadro: arrastra la fila. Arriba = primero. Luego Guardar.";
