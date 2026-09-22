"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { Check, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyView } from "@/components/status-views";
import { FotoProducto } from "@/components/foto-producto";
import { TablaPrendas } from "@/components/tabla-prendas";
import type { LineaColorTabla } from "@/lib/tabla-bloques";
import {
  SUCURSALES,
  cantidadEn,
  sucursalPorId,
} from "@/lib/sucursales";
import {
  coloresDeCaptura,
  tallasDeCaptura,
} from "@/lib/asignacion-articulo";
import { esquemaPorId } from "@/lib/catalogos";
import { useInventory } from "@/lib/inventory-context";
import {
  articulosDelMismoEsquema,
  esquemaDeArticulo,
  esquemaIdDeSeleccion,
  motivoNoSePuedeElegir,
  notasPdfSeleccion,
} from "@/lib/seleccion-mismo-esquema";
import {
  colorAnteriorEnLista,
  siguienteColorEnLista,
  siguienteTallaEnEsquema,
  tallaAnteriorEnEsquema,
} from "@/lib/captura-tallas";
import { HojaCaptura } from "@/components/hoja-captura";
import type { Producto } from "@/lib/types";
import { cn } from "@/lib/utils";

export type ModoCaptura = "contar" | "entrada" | "pedido";

export type CeldaCaptura = {
  talla: string;
  color: string;
  cantidad: number;
};

export type CapturaPayload = {
  producto: Producto;
  sucursalId: string;
  sucursalNombre: string;
  celdas: CeldaCaptura[];
};

type ParTalla = { talla: string; cantidad: number };
type CeldaBorrador = { talla: string; color: string; cantidad: number };
export type EjeCaptura = "talla" | "color";

export type LineaTabla = LineaColorTabla;

const SUCURSAL_KEY = "almacen_sucursal";

export function CapturaArticulo({
  productos,
  modo,
  acento,
  usuarioNombre,
  onCommit,
  onTablaChange,
  guardando,
  extraAfter,
  pdfTitulo,
  pdfArchivo,
  pdfNotas,
  lineasIniciales,
  sucursalInicial,
  onPendienteRegistro,
  onTerminarRegistro,
  onInicioRegistro,
}: {
  productos: Producto[];
  modo: ModoCaptura;
  acento: "azul" | "verde";
  usuarioNombre?: string;
  onCommit: (payload: CapturaPayload) => Promise<void> | void;
  onTablaChange?: (lineas: LineaTabla[]) => void;
  guardando?: boolean;
  extraAfter?: ReactNode;
  pdfTitulo?: string;
  pdfArchivo?: string;
  pdfNotas?: string[];
  lineasIniciales?: LineaTabla[];
  sucursalInicial?: string;
  onPendienteRegistro?: (lineas: LineaTabla[]) => Promise<void> | void;
  onTerminarRegistro?: (lineas: LineaTabla[]) => Promise<void> | void;
  onInicioRegistro?: () => void;
}) {
  const { catalogos } = useInventory();
  const [sucursalId, setSucursalId] = useState(sucursalInicial ?? "");
  const [q, setQ] = useState("");
  const [consulta, setConsulta] = useState("");
  const [buscado, setBuscado] = useState(false);
  const [elegidosIds, setElegidosIds] = useState<string[]>(() => {
    const ids = (lineasIniciales ?? [])
      .map((l) => l.productoId)
      .filter(Boolean);
    return [...new Set(ids)];
  });
  const [activoId, setActivoId] = useState<string | null>(
    lineasIniciales?.[0]?.productoId ?? null,
  );
  const [mostrandoCaptura, setMostrandoCaptura] = useState(false);
  const [errorEsquema, setErrorEsquema] = useState("");
  const [color, setColor] = useState("");
  const [talla, setTalla] = useState("");
  const [especificacion, setEspecificacion] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [borrador, setBorrador] = useState<CeldaBorrador[]>([]);
  const [eje, setEje] = useState<EjeCaptura>(() =>
    modo === "pedido" ? "color" : "talla",
  );
  const [lineas, setLineas] = useState<LineaTabla[]>(lineasIniciales ?? []);
  const cantidadRef = useRef<HTMLInputElement>(null);

  const sucursal = sucursalPorId(sucursalId);
  const verde = acento === "verde";
  const btn = verde
    ? "bg-emerald-700 text-white hover:bg-emerald-800"
    : undefined;

  const coincidencias = !buscado
    ? []
    : productos.filter((p) => {
        const texto = consulta.trim().toLowerCase();
        if (!texto) return false;
        return (
          p.nombre.toLowerCase().includes(texto) ||
          p.sku.toLowerCase().includes(texto)
        );
      });

  const elegidos = useMemo(
    () =>
      elegidosIds
        .map((id) => productos.find((p) => p.id === id))
        .filter((p): p is Producto => Boolean(p)),
    [elegidosIds, productos],
  );

  const esquemaIdBloqueado = esquemaIdDeSeleccion(elegidos, catalogos);
  const esquemaBloqueado = esquemaIdBloqueado
    ? esquemaPorId(catalogos, esquemaIdBloqueado)
    : undefined;

  const mostrado =
    productos.find((p) => p.id === activoId) ?? elegidos[0] ?? null;

  const esquemaActivo = mostrado
    ? esquemaDeArticulo(mostrado, catalogos)
    : undefined;
  const colores = mostrado
    ? coloresDeCaptura(mostrado, catalogos)
    : catalogos.colores.length
      ? catalogos.colores
      : ["Único"];
  const encabezados =
    mostrado && esquemaActivo
      ? tallasDeCaptura(mostrado, catalogos, mostrado.esquemaConteo)
      : [];
  const colorActivo = color || colores[0] || "Único";
  const tallaActiva = talla || encabezados[0] || "";
  const tallasDeRejilla = encabezados.filter((t) => t !== "");
  const elegirEje = modo !== "pedido";
  const ejeActivo: EjeCaptura = elegirEje ? eje : "color";

  const coincidenciasDelEsquema = articulosDelMismoEsquema(
    coincidencias,
    esquemaIdBloqueado ??
      coincidencias.find((p) => esquemaDeArticulo(p, catalogos))?.esquemaConteo,
    catalogos,
  );

  function preparar(producto: Producto, sucId = sucursalId) {
    const esq = esquemaDeArticulo(producto, catalogos);
    const heads = esq
      ? tallasDeCaptura(producto, catalogos, esq.id)
      : [];
    const paleta = coloresDeCaptura(producto, catalogos);
    const c0 = paleta[0] ?? "Único";
    const t0 = heads[0] ?? "";
    setColor(c0);
    setTalla(t0);
    setEspecificacion("");
    setBorrador([]);
    if (modo === "contar" && sucId) {
      setCantidad(String(cantidadEn(producto, sucId, t0, c0)));
    } else if (modo === "entrada") {
      setCantidad("0");
    } else {
      setCantidad("1");
    }
  }

  function elegirSucursal(id: string) {
    setSucursalId(id);
    localStorage.setItem(SUCURSAL_KEY, id);
    if (mostrado) preparar(mostrado, id);
  }

  function intentarMarcar(
    producto: Producto,
    opts?: { abrir?: boolean; quitarSiYaEsta?: boolean },
  ): string | null {
    const ya = elegidosIds.includes(producto.id);
    if (ya) {
      if (opts?.quitarSiYaEsta) {
        const next = elegidosIds.filter((id) => id !== producto.id);
        setElegidosIds(next);
        setErrorEsquema("");
        if (activoId === producto.id) {
          const siguiente = next[0] ?? null;
          setActivoId(siguiente);
          const prod = productos.find((p) => p.id === siguiente);
          if (prod) preparar(prod);
          else setMostrandoCaptura(false);
        }
        return null;
      }
      setErrorEsquema("");
      setActivoId(producto.id);
      preparar(producto);
      if (opts?.abrir) setMostrandoCaptura(true);
      return null;
    }
    const motivo = motivoNoSePuedeElegir(
      producto,
      esquemaIdBloqueado,
      catalogos,
    );
    if (motivo) {
      setErrorEsquema(motivo);
      return motivo;
    }
    setErrorEsquema("");
    setElegidosIds((prev) =>
      prev.includes(producto.id) ? prev : [...prev, producto.id],
    );
    setActivoId(producto.id);
    preparar(producto);
    if (opts?.abrir) setMostrandoCaptura(true);
    return null;
  }

  function buscar(e?: React.FormEvent) {
    e?.preventDefault();
    const texto = q.trim();
    setConsulta(texto);
    setBuscado(true);
    setMostrandoCaptura(false);
    setErrorEsquema("");
    const hits = productos.filter((p) => {
      const t = texto.toLowerCase();
      if (!t) return false;
      return (
        p.nombre.toLowerCase().includes(t) || p.sku.toLowerCase().includes(t)
      );
    });
    if (hits.length === 1) {
      const motivo = intentarMarcar(hits[0], { abrir: false });
      if (motivo) {
        setActivoId(null);
        setColor("");
        setTalla("");
        setBorrador([]);
      }
    } else {
      setColor("");
      setTalla("");
      setBorrador([]);
    }
  }

  function marcarTodosDelEsquema() {
    const idEsquema =
      esquemaIdBloqueado ??
      coincidencias.find((p) => esquemaDeArticulo(p, catalogos))?.esquemaConteo;
    if (!idEsquema) {
      setErrorEsquema(
        "Ninguno de estos tiene esquema. Iza debe ir a Artículos, abrir la ficha y pulsar Agregar esquemas.",
      );
      return;
    }
    const delEsquema = articulosDelMismoEsquema(
      coincidencias,
      idEsquema,
      catalogos,
    );
    if (delEsquema.length === 0) {
      setErrorEsquema(
        "En esta búsqueda no hay prendas del mismo esquema. Prueba otra Clave o nombre.",
      );
      return;
    }
    setErrorEsquema("");
    setElegidosIds((prev) => {
      const set = new Set(prev);
      for (const p of delEsquema) set.add(p.id);
      return [...set];
    });
    if (!activoId && delEsquema[0]) {
      setActivoId(delEsquema[0].id);
      preparar(delEsquema[0]);
    }
  }

  function abrirCaptura(producto?: Producto) {
    const p = producto ?? elegidos[0];
    if (!p) return;
    const motivo = motivoNoSePuedeElegir(p, undefined, catalogos);
    if (motivo) {
      setErrorEsquema(motivo);
      return;
    }
    setActivoId(p.id);
    preparar(p);
    setMostrandoCaptura(false);
    setErrorEsquema("");
  }

  async function abrirHojaColor(c: string) {
    if (mostrandoCaptura && (c !== colorActivo || ejeActivo !== "color")) {
      await guardarEjeActual();
    }
    aplicarColor(c);
    setMostrandoCaptura(true);
    onInicioRegistro?.();
  }

  async function abrirHojaTalla(t: string) {
    if (mostrandoCaptura && (t !== tallaActiva || ejeActivo !== "talla")) {
      await guardarEjeActual();
    }
    aplicarTalla(t);
    setMostrandoCaptura(true);
    onInicioRegistro?.();
  }

  function elegirModoCaptura(siguiente: EjeCaptura) {
    setEje(siguiente);
    setMostrandoCaptura(false);
    setBorrador([]);
  }

  function enfocarCantidad() {
    window.setTimeout(() => {
      const el = cantidadRef.current;
      if (!el) return;
      el.focus();
      el.select();
    }, 50);
  }

  function guardarCantidadActual() {
    const n = Number(cantidad);
    if (!Number.isFinite(n) || n < 0) return;
    if (modo !== "contar" && n <= 0) return;
    if (!tallaActiva && encabezados.some((t) => t !== "")) return;
    setBorrador((prev) => {
      const resto = prev.filter(
        (p) => !(p.talla === tallaActiva && p.color === colorActivo),
      );
      return [
        ...resto,
        { talla: tallaActiva, color: colorActivo, cantidad: n },
      ];
    });
  }

  function cantidadInicial(t: string, c: string) {
    if (mostrado && sucursalId && modo === "contar") {
      return String(cantidadEn(mostrado, sucursalId, t, c));
    }
    if (modo === "entrada") return "0";
    return "1";
  }

  function aplicarColor(c: string) {
    const primera = encabezados[0] ?? "";
    setColor(c);
    setTalla(primera);
    setBorrador([]);
    setCantidad(cantidadInicial(primera, c));
    enfocarCantidad();
  }

  function aplicarTalla(t: string) {
    const primero = colores[0] ?? "Único";
    setTalla(t);
    setColor(primero);
    setBorrador([]);
    setCantidad(cantidadInicial(t, primero));
    enfocarCantidad();
  }

  function cambiarTalla(t: string) {
    if (t !== tallaActiva) {
      guardarCantidadActual();
    }
    setTalla(t);
    setCantidad(cantidadInicial(t, colorActivo));
    enfocarCantidad();
  }

  function cambiarColor(c: string) {
    if (c !== colorActivo) {
      guardarCantidadActual();
    }
    setColor(c);
    setCantidad(cantidadInicial(tallaActiva, c));
    enfocarCantidad();
  }

  function celdasListas(): CeldaBorrador[] {
    const n = Number(cantidad);
    const vigente =
      Number.isFinite(n) && n >= 0 && (modo === "contar" || n > 0)
        ? { talla: tallaActiva, color: colorActivo, cantidad: n }
        : null;
    const base = [...borrador];
    if (!vigente) return base;
    const i = base.findIndex(
      (p) => p.talla === vigente.talla && p.color === vigente.color,
    );
    if (i < 0) return [...base, vigente];
    return base.map((p, idx) => (idx === i ? vigente : p));
  }

  function publicarTabla(next: LineaTabla[]) {
    setLineas(next);
    onTablaChange?.(next);
  }

  function fusionarLineasConCeldas(celdas: CeldaBorrador[]): LineaTabla[] {
    if (!mostrado || !sucursal) return lineas;
    let next = [...lineas];
    for (const celda of celdas) {
      const idx = next.findIndex(
        (x) =>
          x.productoId === mostrado.id &&
          x.color === celda.color &&
          x.especificacion === especificacion &&
          x.sucursalId === sucursal.id,
      );
      const par: ParTalla = { talla: celda.talla, cantidad: celda.cantidad };
      if (idx >= 0) {
        const merged = [...next[idx].pares];
        const i = merged.findIndex((m) => m.talla === par.talla);
        if (i >= 0) merged[i] = par;
        else merged.push(par);
        next[idx] = { ...next[idx], pares: merged };
      } else {
        next = [
          ...next,
          {
            key: `ln-${mostrado.id}-${celda.color}-${especificacion || ""}-${sucursal.id}`,
            productoId: mostrado.id,
            sku: mostrado.sku,
            nombre: mostrado.nombre,
            color: celda.color,
            especificacion: especificacion || undefined,
            sucursalId: sucursal.id,
            sucursalNombre: sucursal.nombre,
            pares: [par],
          },
        ];
      }
    }
    return next;
  }

  async function guardarEjeActual(): Promise<LineaTabla[]> {
    guardarCantidadActual();
    const celdas = celdasListas();
    if (!mostrado || !sucursal || celdas.length === 0) return lineas;
    try {
      await onCommit({
        producto: mostrado,
        sucursalId: sucursal.id,
        sucursalNombre: sucursal.nombre,
        celdas: celdas.map((p) => ({
          talla: p.talla,
          color: p.color,
          cantidad: p.cantidad,
        })),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar el conteo.");
    }
    const next = fusionarLineasConCeldas(celdas);
    publicarTabla(next);
    setBorrador([]);
    return next;
  }

  async function irAlSiguienteColorTrasGuardar() {
    await guardarEjeActual();
    const next = siguienteColorEnLista(colores, colorActivo);
    if (next) {
      aplicarColor(next);
      return;
    }
    setMostrandoCaptura(false);
  }

  async function irAlSiguienteTallaTrasGuardar() {
    await guardarEjeActual();
    const next = siguienteTallaEnEsquema(encabezados, tallaActiva);
    if (next) {
      aplicarTalla(next);
      return;
    }
    setMostrandoCaptura(false);
  }

  function avanzarEnter() {
    const n = Number(cantidad);
    if (!Number.isFinite(n) || n < 0) return;
    if (modo !== "contar" && n <= 0) return;
    if (ejeActivo === "talla") {
      const next = siguienteColorEnLista(colores, colorActivo);
      if (next) {
        cambiarColor(next);
        return;
      }
      void irAlSiguienteTallaTrasGuardar();
      return;
    }
    const next = siguienteTallaEnEsquema(encabezados, tallaActiva);
    if (next) {
      cambiarTalla(next);
      return;
    }
    void irAlSiguienteColorTrasGuardar();
  }

  function saltarEje() {
    setBorrador([]);
    if (ejeActivo === "talla") {
      const next = siguienteTallaEnEsquema(encabezados, tallaActiva);
      if (next) {
        aplicarTalla(next);
        return;
      }
      const otro = tallasDeRejilla.find((t) => t !== tallaActiva);
      if (otro) aplicarTalla(otro);
      else enfocarCantidad();
      return;
    }
    const next = siguienteColorEnLista(colores, colorActivo);
    if (next) {
      aplicarColor(next);
      return;
    }
    const otro = colores.find((c) => c !== colorActivo);
    if (otro) aplicarColor(otro);
    else enfocarCantidad();
  }

  function regresarEje() {
    if (ejeActivo === "talla") {
      const prev = tallaAnteriorEnEsquema(encabezados, tallaActiva);
      if (!prev) {
        toast.message("Ya es la primera talla.");
        return;
      }
      setBorrador([]);
      aplicarTalla(prev);
      return;
    }
    const prev = colorAnteriorEnLista(colores, colorActivo);
    if (!prev) {
      toast.message("Ya es el primer color.");
      return;
    }
    setBorrador([]);
    aplicarColor(prev);
  }

  async function pendienteGuardar() {
    const next = await guardarEjeActual();
    if (next.length === 0) {
      toast.error("Cuenta al menos una talla antes de dejarlo pendiente.");
      return;
    }
    if (!onPendienteRegistro) {
      toast.error("No se pudo dejar pendiente.");
      return;
    }
    await onPendienteRegistro(next);
    setMostrandoCaptura(false);
  }

  async function terminarGuardar() {
    const next = await guardarEjeActual();
    if (next.length === 0) {
      toast.error("Cuenta al menos una talla antes de terminar.");
      return;
    }
    if (!onTerminarRegistro) {
      toast.error("No se pudo terminar.");
      return;
    }
    await onTerminarRegistro(next);
    setMostrandoCaptura(false);
  }

  const notasPdfTabla = [
    ...(pdfNotas ?? []),
    ...notasPdfSeleccion(elegidos, catalogos, {
      sinEsquema: modo === "contar",
    }),
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Sucursal</Label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {SUCURSALES.map((s) => (
            <Button
              key={s.id}
              type="button"
              variant={s.id === sucursalId ? "default" : "outline"}
              className={cn("h-11 w-full", s.id === sucursalId && btn)}
              onClick={() => elegirSucursal(s.id)}
            >
              {s.nombre}
            </Button>
          ))}
        </div>
        {!sucursalId ? (
          <p className={cn("text-sm", verde ? "text-emerald-800" : "text-amber-800")}>
            Elige la sucursal primero. Luego busca el código o el nombre.
            Puedes marcar varias prendas del mismo esquema (un solo PDF).
          </p>
        ) : null}
      </div>

      {!sucursalId ? (
        extraAfter
      ) : (
        <>
          <form onSubmit={buscar} className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Clave o nombre (ej. Baccus, XC1092)"
                className="h-11 pl-9 text-base"
                enterKeyHint="search"
                autoComplete="off"
              />
            </div>
            <Button type="submit" className={cn("h-11 px-4", btn)}>
              Buscar
            </Button>
          </form>

          {elegidos.length > 0 ? (
            <div className="space-y-2 rounded-xl border bg-muted/30 p-3">
              <p className="text-sm font-medium">
                {elegidos.length} artículo{elegidos.length === 1 ? "" : "s"} del
                mismo esquema
                {esquemaBloqueado ? `: ${esquemaBloqueado.nombre}` : ""}
              </p>
              {esquemaBloqueado?.tallas?.length ? (
                <p className="text-xs text-muted-foreground">
                  Tallas: {esquemaBloqueado.tallas.join(", ")}
                </p>
              ) : esquemaBloqueado ? (
                <p className="text-xs text-muted-foreground">
                  Este esquema no usa talla.
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {elegidos.map((p) => (
                  <Button
                    key={p.id}
                    type="button"
                    variant={p.id === activoId ? "default" : "outline"}
                    className={cn(
                      "h-10 max-w-full truncate",
                      p.id === activoId && btn,
                    )}
                    onClick={() => abrirCaptura(p)}
                  >
                    {p.sku} {p.nombre}
                  </Button>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  className={cn("h-11", btn)}
                  onClick={() => abrirCaptura()}
                >
                  Capturar las elegidas
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11"
                  onClick={() => {
                    setMostrandoCaptura(false);
                    setBuscado(true);
                  }}
                >
                  Marcar más de la búsqueda
                </Button>
              </div>
              {esquemaActivo ? (
                <div className="space-y-2">
                  {elegirEje ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Cómo capturar</p>
                      <p className="text-xs text-muted-foreground">
                        Por talla: eliges una talla y Enter recorre todos los
                        colores. Por color: eliges un color y Enter recorre las
                        tallas.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant={ejeActivo === "talla" ? "default" : "outline"}
                          className={cn(
                            "h-12 w-full",
                            ejeActivo === "talla" && btn,
                          )}
                          onClick={() => elegirModoCaptura("talla")}
                        >
                          Por talla
                        </Button>
                        <Button
                          type="button"
                          variant={ejeActivo === "color" ? "default" : "outline"}
                          className={cn(
                            "h-12 w-full",
                            ejeActivo === "color" && btn,
                          )}
                          onClick={() => elegirModoCaptura("color")}
                        >
                          Por color
                        </Button>
                      </div>
                    </div>
                  ) : null}
                  {ejeActivo === "talla" ? (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {(tallasDeRejilla.length > 0
                        ? tallasDeRejilla
                        : ["Sin talla"]
                      ).map((t) => (
                        <Button
                          key={t}
                          type="button"
                          variant={
                            mostrandoCaptura &&
                            (t === tallaActiva ||
                              (t === "Sin talla" && !tallaActiva))
                              ? "default"
                              : "outline"
                          }
                          className={cn(
                            "h-12 w-full",
                            mostrandoCaptura &&
                              (t === tallaActiva ||
                                (t === "Sin talla" && !tallaActiva)) &&
                              btn,
                          )}
                          onClick={() =>
                            void abrirHojaTalla(t === "Sin talla" ? "" : t)
                          }
                        >
                          {t}
                        </Button>
                      ))}
                    </div>
                  ) : colores.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {colores.map((c) => (
                        <Button
                          key={c}
                          type="button"
                          variant={
                            mostrandoCaptura && c === colorActivo
                              ? "default"
                              : "outline"
                          }
                          className={cn(
                            "h-12 w-full capitalize",
                            mostrandoCaptura && c === colorActivo && btn,
                          )}
                          onClick={() => void abrirHojaColor(c)}
                        >
                          {c}
                        </Button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {errorEsquema ? (
            <p className="text-sm text-destructive" role="alert">
              {errorEsquema}
            </p>
          ) : null}

          {!buscado ? (
            <EmptyView
              titulo="Busca el artículo"
              detalle="Marca varias prendas del mismo esquema. En Existencias y Recepción elige Por talla (viene primero) o Por color. Por talla: toca una talla, cantidad y Enter recorre los colores; al terminar pasa a la siguiente talla. Por color: toca un color y Enter recorre las tallas. Un PDF junta todas."
            />
          ) : coincidencias.length === 0 ? (
            <EmptyView
              titulo="No hay coincidencias"
              detalle={`Nada con “${consulta}”.`}
            />
          ) : (
            <div className="space-y-3">
              {coincidencias.every((p) => !esquemaDeArticulo(p, catalogos)) ? (
                <EmptyView
                  titulo="Estos artículos no tienen esquema"
                  detalle="Ninguno de esta búsqueda se puede contar todavía. Iza debe armar el esquema en Configuración → Listas de captura y asignarlo en Artículos → Agregar esquemas. No se usa un esquema de fábrica."
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Marca las que usan el mismo esquema. Si otra se cuenta
                  distinto, no se suma. Las sin esquema quedan apagadas.
                </p>
              )}
              {coincidenciasDelEsquema.length > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full"
                  onClick={marcarTodosDelEsquema}
                >
                  Marcar todas las de este esquema ({coincidenciasDelEsquema.length})
                </Button>
              ) : null}
              <ul className="space-y-2">
                {[...coincidencias]
                  .sort((a, b) => {
                    const aOk = !motivoNoSePuedeElegir(
                      a,
                      esquemaIdBloqueado,
                      catalogos,
                    );
                    const bOk = !motivoNoSePuedeElegir(
                      b,
                      esquemaIdBloqueado,
                      catalogos,
                    );
                    if (aOk === bOk) return 0;
                    return aOk ? -1 : 1;
                  })
                  .map((producto) => {
                  const marcado = elegidosIds.includes(producto.id);
                  const motivo = motivoNoSePuedeElegir(
                    producto,
                    esquemaIdBloqueado,
                    catalogos,
                  );
                  const bloqueado = Boolean(motivo) && !marcado;
                  return (
                    <li key={producto.id}>
                      <button
                        type="button"
                        disabled={bloqueado}
                        aria-pressed={marcado}
                        className={cn(
                          "flex min-h-14 w-full items-center gap-3 rounded-xl border p-2 text-left",
                          marcado && "border-teal-700 ring-2 ring-teal-700/20",
                          bloqueado && "opacity-50",
                        )}
                        onClick={() =>
                          intentarMarcar(producto, { quitarSiYaEsta: true })
                        }
                      >
                        <span
                          className={cn(
                            "flex size-11 shrink-0 items-center justify-center rounded-lg border",
                            marcado
                              ? "border-teal-700 bg-teal-700 text-white"
                              : "bg-background",
                          )}
                          aria-hidden
                        >
                          {marcado ? <Check className="size-5" /> : null}
                        </span>
                        <FotoProducto
                          src={producto.foto}
                          alt={producto.nombre}
                          className="size-16 max-h-16 shrink-0 object-cover"
                        />
                        <div className="min-w-0">
                          <p className="font-medium">
                            {producto.sku} {producto.nombre}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {esquemaDeArticulo(producto, catalogos)?.nombre ??
                              "Sin esquema"}
                          </p>
                          {bloqueado && motivo ? (
                            <p className="text-xs text-destructive">{motivo}</p>
                          ) : null}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {mostrandoCaptura && mostrado && esquemaActivo ? (
            <HojaCaptura
              color={colorActivo}
              talla={tallaActiva}
              cantidad={cantidad}
              verde={verde}
              guardando={guardando}
              eje={ejeActivo}
              puedeRegresar={
                ejeActivo === "talla"
                  ? Boolean(tallaAnteriorEnEsquema(encabezados, tallaActiva))
                  : Boolean(colorAnteriorEnLista(colores, colorActivo))
              }
              onCantidad={setCantidad}
              onEnter={avanzarEnter}
              onSaltar={saltarEje}
              onRegresar={regresarEje}
              onCerrar={() => setMostrandoCaptura(false)}
              onPendiente={() => void pendienteGuardar()}
              onTerminar={() => void terminarGuardar()}
            />
          ) : null}

          <div className={mostrandoCaptura ? "pb-72" : undefined}>
            <h3 className="mb-2 text-sm font-medium">Tabla</h3>
            <p className="mb-2 text-xs text-muted-foreground">
              Cada prenda es un bloque (clave y nombre arriba). Colores de
              arriba hacia abajo. Tallas en el orden del esquema. El PDF de
              esta tabla junta todas las marcadas que ya confirmaste.
            </p>
            <TablaPrendas
              lineas={lineas}
              acento={acento}
              vacioDetalle="Guarda con Enter (última talla o último color del eje) o Terminar guardar para que aparezca aquí, debajo de la clave."
              pdfArchivo={
                pdfArchivo ??
                (modo === "entrada"
                  ? "entrada-tabla.pdf"
                  : modo === "pedido"
                    ? "pedido-tabla.pdf"
                    : "existencias-tabla.pdf")
              }
              pdfTitulo={
                pdfTitulo ??
                (modo === "entrada"
                  ? "Brinquitos · Entrada"
                  : modo === "pedido"
                    ? "Brinquitos · Pedido"
                    : "Brinquitos · Existencias")
              }
              pdfNotas={notasPdfTabla}
              onQuitarFila={(keys) =>
                publicarTabla(lineas.filter((x) => !keys.includes(x.key)))
              }
              pdfClaveSolo={modo === "contar"}
            />
          </div>
          {extraAfter}
        </>
      )}
    </div>
  );
}
