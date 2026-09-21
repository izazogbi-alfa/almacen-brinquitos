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
  const [borrador, setBorrador] = useState<ParTalla[]>([]);
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
  const sinEsquemaArticulo = Boolean(mostrado && !esquemaActivo);
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
  const listasListas = colores.length > 0;

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
      const motivo = intentarMarcar(hits[0], { abrir: true });
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
    setMostrandoCaptura(true);
    setErrorEsquema("");
  }

  function enfocarCantidad() {
    window.setTimeout(() => {
      const el = cantidadRef.current;
      if (!el) return;
      el.focus();
      el.select();
    }, 50);
  }

  function guardarCantidadDeTalla(tallaGuardar: string, valor: string) {
    const n = Number(valor);
    if (!Number.isFinite(n) || n < 0) return;
    if (modo !== "contar" && n <= 0) return;
    if (!tallaGuardar && encabezados.some((t) => t !== "")) return;
    setBorrador((prev) => {
      const resto = prev.filter((p) => p.talla !== tallaGuardar);
      return [...resto, { talla: tallaGuardar, cantidad: n }];
    });
  }

  function aplicarColor(c: string) {
    const primera = encabezados[0] ?? "";
    setColor(c);
    setTalla(primera);
    setBorrador([]);
    if (mostrado && sucursalId && modo === "contar") {
      setCantidad(String(cantidadEn(mostrado, sucursalId, primera, c)));
    } else {
      setCantidad("1");
    }
    enfocarCantidad();
  }

  function cambiarTalla(t: string) {
    if (t !== tallaActiva) {
      guardarCantidadDeTalla(tallaActiva, cantidad);
    }
    setTalla(t);
    if (mostrado && sucursalId && modo === "contar") {
      setCantidad(String(cantidadEn(mostrado, sucursalId, t, colorActivo)));
    }
    enfocarCantidad();
  }

  function paresListos(): ParTalla[] {
    const n = Number(cantidad);
    const vigente =
      Number.isFinite(n) && n >= 0 && (modo === "contar" || n > 0)
        ? { talla: tallaActiva, cantidad: n }
        : null;
    const base = [...borrador];
    if (vigente && !base.some((p) => p.talla === vigente.talla)) {
      base.push(vigente);
    } else if (vigente) {
      return base.map((p) => (p.talla === vigente.talla ? vigente : p));
    }
    return base;
  }

  function publicarTabla(next: LineaTabla[]) {
    setLineas(next);
    onTablaChange?.(next);
  }

  function fusionarLineasConPares(pares: ParTalla[]): LineaTabla[] {
    if (!mostrado || !sucursal) return lineas;
    const idx = lineas.findIndex(
      (x) =>
        x.productoId === mostrado.id &&
        x.color === colorActivo &&
        x.especificacion === especificacion &&
        x.sucursalId === sucursal.id,
    );
    if (idx >= 0) {
      const next = [...lineas];
      const prevPares = next[idx].pares;
      const merged = [...prevPares];
      for (const p of pares) {
        const i = merged.findIndex((m) => m.talla === p.talla);
        if (i >= 0) merged[i] = p;
        else merged.push(p);
      }
      next[idx] = { ...next[idx], pares: merged };
      return next;
    }
    return [
      ...lineas,
      {
        key: `ln-${Date.now()}`,
        productoId: mostrado.id,
        sku: mostrado.sku,
        nombre: mostrado.nombre,
        color: colorActivo,
        especificacion: especificacion || undefined,
        sucursalId: sucursal.id,
        sucursalNombre: sucursal.nombre,
        pares,
      },
    ];
  }

  async function guardarColorActual(): Promise<LineaTabla[]> {
    guardarCantidadDeTalla(tallaActiva, cantidad);
    const pares = paresListos();
    if (!mostrado || !sucursal || pares.length === 0) return lineas;
    try {
      await onCommit({
        producto: mostrado,
        sucursalId: sucursal.id,
        sucursalNombre: sucursal.nombre,
        celdas: pares.map((p) => ({
          talla: p.talla,
          color: colorActivo,
          cantidad: p.cantidad,
        })),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar el conteo.");
    }
    const next = fusionarLineasConPares(pares);
    publicarTabla(next);
    setBorrador([]);
    return next;
  }

  async function irAlSiguienteColorTrasGuardar() {
    await guardarColorActual();
    const next = siguienteColorEnLista(colores, colorActivo);
    if (next) {
      aplicarColor(next);
      return;
    }
    setMostrandoCaptura(false);
  }

  function avanzarTallaOGuardarColor() {
    const n = Number(cantidad);
    if (!Number.isFinite(n) || n < 0) return;
    if (modo !== "contar" && n <= 0) return;
    const next = siguienteTallaEnEsquema(encabezados, tallaActiva);
    if (next) {
      cambiarTalla(next);
      if (modo !== "contar") setCantidad("1");
      return;
    }
    void irAlSiguienteColorTrasGuardar();
  }

  async function tocarColor(c: string) {
    if (c === colorActivo) {
      enfocarCantidad();
      return;
    }
    await guardarColorActual();
    aplicarColor(c);
  }

  function saltarEsteColor() {
    setBorrador([]);
    const next = siguienteColorEnLista(colores, colorActivo);
    if (next) {
      aplicarColor(next);
      return;
    }
    const otro = colores.find((c) => c !== colorActivo);
    if (otro) aplicarColor(otro);
    else enfocarCantidad();
  }

  function regresarColor() {
    const prev = colorAnteriorEnLista(colores, colorActivo);
    if (!prev) {
      toast.message("Ya es el primer color.");
      return;
    }
    setBorrador([]);
    aplicarColor(prev);
  }

  async function pendienteGuardar() {
    const next = await guardarColorActual();
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
    const next = await guardarColorActual();
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
              detalle="Marca varias prendas que se cuentan igual (mismo esquema, ej. 1, 1X, 2–18, 34–42, 44–50). Luego toca un color, escribe la cantidad y pulsa Enter: pasa a la siguiente talla. Al terminar el color se guarda solo. Un PDF junta todas. Si no hay esquema, hay que asignarlo en Artículos."
            />
          ) : coincidencias.length === 0 ? (
            <EmptyView
              titulo="No hay coincidencias"
              detalle={`Nada con “${consulta}”.`}
            />
          ) : mostrandoCaptura && mostrado && sinEsquemaArticulo ? (
            <EmptyView
              titulo="Este artículo no tiene esquema"
              detalle={`${mostrado.sku} ${mostrado.nombre} todavía no tiene esquema de conteo. Iza debe ir a Artículos, abrir la ficha y pulsar Agregar esquemas (después de armar los esquemas en Configuración → Listas de captura). No se usa un esquema de fábrica.`}
            />
          ) : mostrandoCaptura && mostrado && !listasListas ? (
            <EmptyView
              titulo="Faltan listas"
              detalle="Iza debe armar colores en Configuración. Aquí solo se elige, no se crean."
            />
          ) : mostrandoCaptura && mostrado && esquemaActivo ? (
            <HojaCaptura
              sku={mostrado.sku}
              color={colorActivo}
              talla={tallaActiva}
              cantidad={cantidad}
              colores={colores}
              tallas={encabezados}
              verde={verde}
              guardando={guardando}
              puedeRegresar={Boolean(colorAnteriorEnLista(colores, colorActivo))}
              onCantidad={setCantidad}
              onColor={(c) => void tocarColor(c)}
              onTalla={cambiarTalla}
              onEnter={avanzarTallaOGuardarColor}
              onSaltar={saltarEsteColor}
              onRegresar={regresarColor}
              onCerrar={() => setMostrandoCaptura(false)}
              onPendiente={() => void pendienteGuardar()}
              onTerminar={() => void terminarGuardar()}
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

          <div>
            <h3 className="mb-2 text-sm font-medium">Tabla</h3>
            <p className="mb-2 text-xs text-muted-foreground">
              Cada prenda es un bloque (clave y nombre arriba). Colores de
              arriba hacia abajo. Tallas en el orden del esquema. El PDF de
              esta tabla junta todas las marcadas que ya confirmaste.
            </p>
            <TablaPrendas
              lineas={lineas}
              acento={acento}
              vacioDetalle="Guarda un color (Enter en la última talla, o Terminar guardar) para que aparezca aquí, debajo de la clave."
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
