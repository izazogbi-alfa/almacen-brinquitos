"use client";

import { useState, type ReactNode } from "react";
import { Minus, Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { etiquetaUnidad } from "@/lib/format";
import {
  SUCURSALES,
  cantidadEn,
  coloresProducto,
  esquemaDe,
  sucursalPorId,
  tallasProducto,
  totalEnSucursal,
  totalProducto,
  totalesPorSucursal,
  usaTalla,
} from "@/lib/sucursales";
import type { Producto } from "@/lib/types";
import { cn } from "@/lib/utils";

export type ModoCaptura = "contar" | "sacar" | "entrada" | "pedido";

export type CapturaPayload = {
  producto: Producto;
  sucursalId: string;
  sucursalNombre: string;
  talla: string;
  color: string;
  cantidad: number;
};

const SUCURSAL_KEY = "almacen_sucursal";

export function CapturaArticulo({
  productos,
  modo,
  acento,
  usuarioNombre,
  onCommit,
  guardando,
  extraAfter,
}: {
  productos: Producto[];
  modo: ModoCaptura;
  acento: "azul" | "verde";
  usuarioNombre?: string;
  onCommit: (payload: CapturaPayload) => Promise<void> | void;
  guardando?: boolean;
  extraAfter?: ReactNode;
}) {
  const [sucursalId, setSucursalId] = useState("");
  const [q, setQ] = useState("");
  const [consulta, setConsulta] = useState("");
  const [buscado, setBuscado] = useState(false);
  const [activo, setActivo] = useState<Producto | null>(null);
  const [cantidad, setCantidad] = useState(modo === "contar" ? "0" : "1");
  const [talla, setTalla] = useState("");
  const [color, setColor] = useState("");
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

  const esquema = mostrado ? esquemaDe(mostrado) : "accesorio";
  const conTalla = mostrado ? usaTalla(mostrado) : false;
  const tallas = mostrado ? tallasProducto(mostrado) : [];
  const colores = mostrado ? coloresProducto(mostrado) : ["Único"];
  const tallaActiva = conTalla ? talla || tallas[0] || "" : "";
  const colorActivo = color || colores[0] || "Único";
  const stockCelda =
    mostrado && sucursalId
      ? cantidadEn(mostrado, sucursalId, tallaActiva, colorActivo)
      : 0;
  const totalSucursal =
    mostrado && sucursalId ? totalEnSucursal(mostrado, sucursalId) : 0;
  const totalTodas = mostrado ? totalProducto(mostrado) : 0;

  function elegirSucursal(id: string) {
    setSucursalId(id);
    localStorage.setItem(SUCURSAL_KEY, id);
    if (mostrado) {
      const t = usaTalla(mostrado) ? talla || tallasProducto(mostrado)[0] || "" : "";
      const c = color || coloresProducto(mostrado)[0] || "Único";
      setCantidad(
        modo === "contar"
          ? String(cantidadEn(mostrado, id, t, c))
          : cantidad || "1",
      );
    }
  }

  function preparar(producto: Producto, sucId = sucursalId) {
    const t0 = usaTalla(producto) ? tallasProducto(producto)[0] ?? "" : "";
    const c0 = coloresProducto(producto)[0] ?? "Único";
    setTalla(t0);
    setColor(c0);
    setCantidad(
      modo === "contar" && sucId
        ? String(cantidadEn(producto, sucId, t0, c0))
        : "1",
    );
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
      setTalla("");
      setColor("");
      setCantidad(modo === "contar" ? "0" : "1");
    }
  }

  function cambiarTalla(t: string) {
    if (!mostrado) return;
    setTalla(t);
    const cols = coloresProducto(mostrado);
    const c = cols.includes(colorActivo) ? colorActivo : cols[0] ?? "Único";
    if (c !== colorActivo) setColor(c);
    if (modo === "contar" && sucursalId) {
      setCantidad(String(cantidadEn(mostrado, sucursalId, t, c)));
    }
  }

  function cambiarColor(c: string) {
    if (!mostrado) return;
    setColor(c);
    if (modo === "contar" && sucursalId) {
      setCantidad(String(cantidadEn(mostrado, sucursalId, tallaActiva, c)));
    }
  }

  const n = Number(cantidad);
  const payload: CapturaPayload | null =
    mostrado && sucursal && Number.isFinite(n) && n >= 0
      ? {
          producto: mostrado,
          sucursalId: sucursal.id,
          sucursalNombre: sucursal.nombre,
          talla: tallaActiva,
          color: colorActivo,
          cantidad: n,
        }
      : null;

  const verbos: Record<ModoCaptura, string> = {
    contar: "contar",
    sacar: "sacar",
    entrada: "dar entrada a",
    pedido: "agregar al pedido",
  };

  async function aceptar() {
    if (!payload) return;
    await onCommit(payload);
    setConfirmar(false);
    if (modo === "pedido" || modo === "sacar" || modo === "entrada") {
      setCantidad("1");
    }
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
              className={cn(
                "h-11 w-full",
                s.id === sucursalId && btn,
              )}
              onClick={() => elegirSucursal(s.id)}
            >
              {s.nombre}
            </Button>
          ))}
        </div>
        {!sucursalId ? (
          <p className={cn("text-sm", verde ? "text-emerald-800" : "text-amber-800")}>
            Elige la sucursal primero. Luego busca el artículo.
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
                placeholder="Código o nombre"
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
              detalle="Escribe el código o el nombre (ej. ropón, chaleco, vela)."
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
                  <p className="font-heading text-lg font-semibold">
                    {mostrado.nombre}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {mostrado.sku} · {mostrado.categoria}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      {etiquetaUnidad(mostrado.unidad, totalSucursal)} en{" "}
                      {sucursal?.nombre}
                    </Badge>
                    <Badge variant="outline">
                      Total 3 sucursales: {totalTodas} {mostrado.unidad}
                    </Badge>
                  </div>
                </div>
                <ul className="grid grid-cols-3 gap-2 text-center text-xs">
                  {totalesPorSucursal(mostrado).map((s) => (
                    <li
                      key={s.id}
                      className={`rounded-lg border p-2 ${s.id === sucursalId ? (verde ? "border-emerald-700 bg-emerald-50" : "border-teal-700 bg-teal-50") : ""}`}
                    >
                      <p className="font-medium">{s.nombre}</p>
                      <p className="text-muted-foreground">{s.cantidad}</p>
                    </li>
                  ))}
                </ul>
                {conTalla ? (
                  <div className="space-y-1.5">
                    <Label>
                      {esquema === "nino" ? "Talla (0–60, pares)" : "Talla"}
                    </Label>
                    <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto">
                      {tallas.map((t) => (
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
                    Sin talla numérica: cantidad y color.
                  </p>
                )}
                <div className="space-y-1.5">
                  <Label>Color</Label>
                  <div className="flex flex-wrap gap-2">
                    {colores.map((c) => (
                      <Button
                        key={c}
                        type="button"
                        variant={c === colorActivo ? "default" : "outline"}
                        className={cn("h-10", c === colorActivo && btn)}
                        onClick={() => cambiarColor(c)}
                      >
                        {c}
                      </Button>
                    ))}
                  </div>
                </div>
                <p className="text-sm">
                  En anaquel ahora:{" "}
                  <span className="font-medium">
                    {stockCelda} {mostrado.unidad}
                  </span>
                  {usuarioNombre ? (
                    <>
                      {" "}
                      · {usuarioNombre}
                    </>
                  ) : null}
                </p>
                <div className="space-y-2">
                  <Label>
                    {modo === "contar"
                      ? "Piezas contadas"
                      : modo === "sacar"
                        ? "Piezas a sacar"
                        : modo === "entrada"
                          ? "Piezas de entrada"
                          : "Cantidad al pedido"}
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
                  className={cn("h-11 w-full", btn)}
                  disabled={!payload || (modo !== "contar" && n <= 0)}
                  onClick={() => setConfirmar(true)}
                >
                  {modo === "contar"
                    ? "Revisar y contar"
                    : modo === "sacar"
                      ? "Revisar y sacar"
                      : modo === "entrada"
                        ? "Revisar entrada"
                        : "Revisar y agregar"}
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
                      <p className="font-medium">{producto.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {producto.sku} · total {totalProducto(producto)}{" "}
                        {producto.unidad}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {extraAfter}
        </>
      )}

      <Dialog open={confirmar} onOpenChange={setConfirmar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar</DialogTitle>
            <DialogDescription>
              {payload
                ? `¿Confirmas ${verbos[modo]} ${payload.cantidad} pza de ${payload.producto.nombre}${payload.talla ? ` talla ${payload.talla}` : ""} ${payload.color} en ${payload.sucursalNombre}?`
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
