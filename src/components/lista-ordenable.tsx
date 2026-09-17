"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { GripVertical } from "lucide-react";
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

function MangoOrden({
  etiqueta,
  numero,
  total,
  arrastrando,
  desactivado,
  onPointerDown,
  onMoverTeclado,
}: {
  etiqueta: string;
  numero: number;
  total: number;
  arrastrando: boolean;
  desactivado: boolean;
  onPointerDown: (e: ReactPointerEvent<HTMLButtonElement>) => void;
  onMoverTeclado: (direccion: -1 | 1) => void;
}) {
  return (
    <button
      type="button"
      disabled={desactivado}
      aria-label={`Mango para ordenar ${etiqueta}. Posición ${numero} de ${total}. Sostén y arrastra, o usa flechas.`}
      aria-grabbed={arrastrando}
      onPointerDown={onPointerDown}
      onKeyDown={(e) => {
        if (e.key === "ArrowUp") {
          e.preventDefault();
          onMoverTeclado(-1);
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          onMoverTeclado(1);
        }
      }}
      className={cn(
        "flex size-14 shrink-0 touch-none flex-col items-center justify-center rounded-xl border-2 bg-background text-foreground shadow-sm",
        "focus-visible:ring-3 focus-visible:ring-ring/50",
        arrastrando && "border-primary bg-primary/10",
        desactivado && "opacity-40",
      )}
    >
      <GripVertical className="size-7" aria-hidden />
      <span className="text-xs font-bold tabular-nums leading-none">
        {numero}
      </span>
    </button>
  );
}

export function ListaOrdenable<T>({
  items,
  getKey,
  etiqueta,
  onReorder,
  className,
  children,
}: {
  items: T[];
  getKey: (item: T, index: number) => string;
  etiqueta: (item: T) => string;
  onReorder: (items: T[]) => void;
  className?: string;
  children: (item: T, index: number, mango: ReactNode) => ReactNode;
}) {
  const idLista = useId();
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
      const margen = 72;
      if (y < margen) window.scrollBy(0, -14);
      else if (y > window.innerHeight - margen) window.scrollBy(0, 14);
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

  function iniciar(
    e: ReactPointerEvent<HTMLButtonElement>,
    indice: number,
  ) {
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
        Sostén el mango con puntitos y arrastra para cambiar el orden. El
        número 1 queda primero.
      </p>
      <div
        className={className}
        role="list"
        aria-describedby={`${idLista}-ayuda`}
      >
        {items.map((item, i) => (
          <div
            key={getKey(item, i)}
            role="listitem"
            ref={(el) => {
              filasRef.current[i] = el;
            }}
            className={cn(
              arrastre === i && "relative z-10 rounded-xl ring-2 ring-primary",
            )}
          >
            {children(
              item,
              i,
              <MangoOrden
                etiqueta={etiqueta(item)}
                numero={i + 1}
                total={items.length}
                arrastrando={arrastre === i}
                desactivado={items.length < 2}
                onPointerDown={(ev) => iniciar(ev, i)}
                onMoverTeclado={(dir) =>
                  onReorder(moverEnLista(items, i, dir))
                }
              />,
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export const TEXTO_ORDEN =
  "Mango a la izquierda: sostén, arrastra y suelta. El 1 queda primero. Luego pulsa Guardar.";
