"use client";

import { useState, type ReactNode } from "react";
import { Minus, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyView } from "@/components/status-views";
import { FotoProducto } from "@/components/foto-producto";
import {
  SUCURSALES,
  cantidadEn,
  sucursalPorId,
} from "@/lib/sucursales";
import { esquemaPorId, tallasDeEsquema } from "@/lib/catalogos";
import { useInventory } from "@/lib/inventory-context";
import type { Producto } from "@/lib/types";
import { cn } from "@/lib/utils";

export type ModoCaptura = "contar" | "sacar" | "entrada" | "pedido";

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

export type LineaTabla = {
  key: string;
  productoId: string;
  sku: string;
  nombre: string;
  color: string;
  especificacion?: string;
  sucursalId: string;
  sucursalNombre: string;
  pares: ParTalla[];
};

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
}: {
  productos: Producto[];
  modo: ModoCaptura;
  acento: "azul" | "verde";
  usuarioNombre?: string;
  onCommit: (payload: CapturaPayload) => Promise<void> | void;
  onTablaChange?: (lineas: LineaTabla[]) => void;
  guardando?: boolean;
  extraAfter?: ReactNode;
}) {
  const { catalogos } = useInventory();
  const [sucursalId, setSucursalId] = useState("");
  const [q, setQ] = useState("");
  const [consulta, setConsulta] = useState("");
  const [buscado, setBuscado] = useState(false);
  const [activo, setActivo] = useState<Producto | null>(null);
  const [esquemaId, setEsquemaId] = useState("");
  const [color, setColor] = useState("");
  const [talla, setTalla] = useState("");
  const [especificacion, setEspecificacion] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [borrador, setBorrador] = useState<ParTalla[]>([]);
  const [lineas, setLineas] = useState<LineaTabla[]>([]);
  const [confirmar, setConfirmar] = useState(false);

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

  const unico = coincidencias.length === 1 ? coincidencias[0] : null;
  const mostradoId = activo?.id ?? unico?.id;
  const mostrado =
    productos.find((p) => p.id === mostradoId) ?? activo ?? unico;

  const colores = catalogos.colores.length ? catalogos.colores : ["Único"];
  const esquemaActivo = esquemaPorId(catalogos, esquemaId);
  const encabezados = tallasDeEsquema(catalogos, esquemaActivo?.id);
  const colorActivo = color || colores[0] || "Único";
  const tallaActiva = talla || encabezados[0] || "";
  const listasListas =
    catalogos.esquemas.length > 0 && catalogos.colores.length > 0;

  function preparar(producto: Producto, sucId = sucursalId) {
    const esq =
      esquemaPorId(catalogos, producto.esquemaConteo)?.id ??
      catalogos.esquemas[0]?.id ??
      "";
    const heads = tallasDeEsquema(catalogos, esq);
    const c0 = colores[0] ?? "Único";
    const t0 = heads[0] ?? "";
    setEsquemaId(esq);
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

  function buscar(e?: React.FormEvent) {
    e?.preventDefault();
    const texto = q.trim();
    setConsulta(texto);
    setBuscado(true);
    setActivo(null);
    const hits = productos.filter((p) => {
      const t = texto.toLowerCase();
      if (!t) return false;
      return (
        p.nombre.toLowerCase().includes(t) || p.sku.toLowerCase().includes(t)
      );
    });
    if (hits.length === 1) preparar(hits[0]);
    else {
      setColor("");
      setTalla("");
      setEsquemaId("");
      setBorrador([]);
    }
  }

  function cambiarEsquema(id: string) {
    setEsquemaId(id);
    setBorrador([]);
    const heads = tallasDeEsquema(catalogos, id);
    const t0 = heads[0] ?? "";
    setTalla(t0);
    if (mostrado && sucursalId && modo === "contar") {
      setCantidad(String(cantidadEn(mostrado, sucursalId, t0, colorActivo)));
    } else {
      setCantidad("1");
    }
  }

  function cambiarColor(c: string) {
    setColor(c);
    setBorrador([]);
    if (mostrado && sucursalId && modo === "contar") {
      setCantidad(String(cantidadEn(mostrado, sucursalId, tallaActiva, c)));
    } else {
      setCantidad("1");
    }
  }

  function cambiarTalla(t: string) {
    setTalla(t);
    if (mostrado && sucursalId && modo === "contar") {
      setCantidad(String(cantidadEn(mostrado, sucursalId, t, colorActivo)));
    }
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

  function agregarTalla() {
    const n = Number(cantidad);
    if (!Number.isFinite(n) || n < 0) return;
    if (modo !== "contar" && n <= 0) return;
    setBorrador((prev) => {
      const resto = prev.filter((p) => p.talla !== tallaActiva);
      return [...resto, { talla: tallaActiva, cantidad: n }];
    });
  }

  const paresConfirmables = paresListos();
  const payload: CapturaPayload | null =
    mostrado && sucursal && paresConfirmables.length > 0
      ? {
          producto: mostrado,
          sucursalId: sucursal.id,
          sucursalNombre: sucursal.nombre,
          celdas: paresConfirmables.map((p) => ({
            talla: p.talla,
            color: colorActivo,
            cantidad: p.cantidad,
          })),
        }
      : null;

  function publicarTabla(next: LineaTabla[]) {
    setLineas(next);
    onTablaChange?.(next);
  }

  async function aceptar() {
    if (!payload || !mostrado || !sucursal) return;
    const pares = paresConfirmables;
    await onCommit(payload);
    publicarTabla(
      (() => {
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
      })(),
    );
    setBorrador([]);
    setConfirmar(false);
    setCantidad(modo === "contar" ? "0" : "1");
  }

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
                placeholder="Clave o nombre (ej. XC1092 camisa)"
                className="h-11 pl-9 text-base"
                enterKeyHint="search"
                autoComplete="off"
              />
            </div>
            <Button type="submit" className={cn("h-11 px-4", btn)}>
              Buscar
            </Button>
          </form>

          {!buscado ? (
            <EmptyView
              titulo="Busca el artículo"
              detalle="Elige esquema, color y tallas de las listas. Cada color confirmado baja a la tabla."
            />
          ) : !listasListas ? (
            <EmptyView
              titulo="Faltan listas"
              detalle="Iza debe armar esquema y colores en Configuración. Aquí solo se elige, no se crean."
            />
          ) : coincidencias.length === 0 ? (
            <EmptyView
              titulo="No hay coincidencias"
              detalle={`Nada con “${consulta}”.`}
            />
          ) : mostrado && (unico || activo) ? (
            <Card className={verde ? "border-emerald-700/40" : undefined}>
              <CardContent className="space-y-3">
                <FotoProducto src={mostrado.foto} alt={mostrado.nombre} />
                <div>
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Clave
                  </p>
                  <p className="font-heading text-lg font-semibold">
                    {mostrado.sku}
                  </p>
                  <p className="text-sm text-muted-foreground">{mostrado.nombre}</p>
                  {usuarioNombre ? (
                    <p className="text-xs text-muted-foreground">{usuarioNombre}</p>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <Label>Esquema de conteo</Label>
                  <div className="flex flex-wrap gap-2">
                    {catalogos.esquemas.map((e) => (
                      <Button
                        key={e.id}
                        type="button"
                        variant={e.id === esquemaActivo?.id ? "default" : "outline"}
                        className={cn(
                          "h-10",
                          e.id === esquemaActivo?.id && btn,
                        )}
                        onClick={() => cambiarEsquema(e.id)}
                      >
                        {e.nombre}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Color</Label>
                  <div className="flex flex-wrap gap-2">
                    {colores.map((c) => (
                      <Button
                        key={c}
                        type="button"
                        variant={c === colorActivo ? "default" : "outline"}
                        className={cn("h-10 capitalize", c === colorActivo && btn)}
                        onClick={() => cambiarColor(c)}
                      >
                        {c}
                      </Button>
                    ))}
                  </div>
                </div>
                {encabezados.some((t) => t !== "") ? (
                  <div className="space-y-1.5">
                    <Label>Talla</Label>
                    <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto">
                      {encabezados.map((t) => (
                        <Button
                          key={t}
                          type="button"
                          variant={t === tallaActiva ? "default" : "outline"}
                          className={cn(
                            "h-10 min-w-11 px-2.5 text-xs",
                            t === tallaActiva && btn,
                          )}
                          onClick={() => cambiarTalla(t)}
                        >
                          {t}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Este esquema no usa talla: solo cantidad y color.
                  </p>
                )}
                {catalogos.especificaciones.length > 0 ? (
                  <div className="space-y-1.5">
                    <Label>Especificación (opcional)</Label>
                    <div className="flex flex-wrap gap-2">
                      {catalogos.especificaciones.map((s) => (
                        <Button
                          key={s}
                          type="button"
                          variant={s === especificacion ? "default" : "outline"}
                          className={cn("h-10", s === especificacion && btn)}
                          onClick={() =>
                            setEspecificacion((prev) => (prev === s ? "" : s))
                          }
                        >
                          {s}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="space-y-2">
                  <Label>
                    {modo === "contar"
                      ? "Piezas contadas"
                      : modo === "sacar"
                        ? "Piezas a sacar"
                        : modo === "entrada"
                          ? "Piezas de entrada"
                          : "Cantidad"}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-11"
                      onClick={() =>
                        setCantidad(String(Math.max(0, Number(cantidad) - 1)))
                      }
                    >
                      <Minus />
                    </Button>
                    <Input
                      inputMode="numeric"
                      className="h-11 text-center text-lg"
                      value={cantidad}
                      onChange={(e) => setCantidad(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-11"
                      onClick={() =>
                        setCantidad(String(Number(cantidad || 0) + 1))
                      }
                    >
                      <Plus />
                    </Button>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full"
                  onClick={agregarTalla}
                >
                  {encabezados.some((t) => t !== "")
                    ? `Agregar talla ${tallaActiva || ""}`
                    : "Agregar cantidad"}
                </Button>
                {paresConfirmables.length > 0 ? (
                  <p className="text-sm">
                    {colorActivo}:{" "}
                    {paresConfirmables
                      .map((p) =>
                        p.talla ? `${p.talla} → ${p.cantidad}` : String(p.cantidad),
                      )
                      .join(" · ")}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Elige esquema, color, talla y cantidad. Confirma el color
                    (o la línea) para bajarlo a la tabla.
                  </p>
                )}
                <Button
                  type="button"
                  className={cn("h-11 w-full", btn)}
                  disabled={!payload}
                  onClick={() => setConfirmar(true)}
                >
                  Confirmar este color
                </Button>
                {coincidencias.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => setActivo(null)}
                  >
                    Volver a la lista
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ) : (
            <ul className="space-y-2">
              {coincidencias.map((producto) => (
                <li key={producto.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-xl border p-2 text-left"
                    onClick={() => {
                      setActivo(producto);
                      preparar(producto);
                    }}
                  >
                    <FotoProducto
                      src={producto.foto}
                      alt={producto.nombre}
                      className="size-16 max-h-16 shrink-0 object-cover"
                    />
                    <div className="min-w-0">
                      <p className="font-medium">
                        {producto.sku} {producto.nombre}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div>
            <h3 className="mb-2 text-sm font-medium">Tabla</h3>
            {lineas.length === 0 ? (
              <EmptyView
                titulo="Todavía no hay líneas"
                detalle="Confirma un color para que la fila aparezca aquí."
              />
            ) : (
              <div className="-mx-1 overflow-x-auto rounded-xl border">
                <table className="min-w-max border-collapse text-sm">
                  <tbody>
                    {lineas.map((ln) => (
                      <tr key={ln.key} className="border-b last:border-0">
                        <td className="w-32 min-w-32 border-r px-2 py-2 align-top">
                          <p className="font-semibold leading-tight">{ln.sku}</p>
                          <p className="text-xs text-muted-foreground leading-tight">
                            {ln.nombre}
                          </p>
                        </td>
                        <td className="border-r px-2 py-2 capitalize">
                          {ln.color}
                          {ln.especificacion ? (
                            <span className="block text-xs text-muted-foreground normal-case">
                              {ln.especificacion}
                            </span>
                          ) : null}
                        </td>
                        {ln.pares.flatMap((p) => [
                          <td
                            key={`${ln.key}-${p.talla}-t`}
                            className="border-r bg-muted/50 px-2 py-2 text-center font-medium"
                          >
                            {p.talla || "Cant."}
                          </td>,
                          <td
                            key={`${ln.key}-${p.talla}-q`}
                            className="border-r px-2 py-2 text-center"
                          >
                            {p.cantidad}
                          </td>,
                        ])}
                        <td className="px-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Quitar línea"
                            onClick={() =>
                              publicarTabla(
                                lineas.filter((x) => x.key !== ln.key),
                              )
                            }
                          >
                            <Trash2 />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {extraAfter}
        </>
      )}

      <Dialog open={confirmar} onOpenChange={setConfirmar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar</DialogTitle>
            <DialogDescription>
              {payload
                ? `¿Confirmas ${colorActivo} de ${payload.producto.sku} ${payload.producto.nombre} en ${payload.sucursalNombre}? ${paresConfirmables.map((p) => (p.talla ? `${p.talla}→${p.cantidad}` : p.cantidad)).join(", ")}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmar(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              className={cn(btn)}
              disabled={guardando}
              onClick={() => void aceptar()}
            >
              {guardando ? "Guardando…" : "Sí, confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
