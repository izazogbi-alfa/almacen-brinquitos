"use client";

import { useState, type ReactNode } from "react";
import { Search } from "lucide-react";
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
  coloresProducto,
  encabezadosTalla,
  sucursalPorId,
} from "@/lib/sucursales";
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

const SUCURSAL_KEY = "almacen_sucursal";

function clave(color: string, talla: string) {
  return `${color}::${talla}`;
}

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
  const [valores, setValores] = useState<Record<string, string>>({});
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

  const colores = mostrado ? coloresProducto(mostrado) : [];
  const encabezados = mostrado ? encabezadosTalla(mostrado) : [];

  function initGrid(producto: Producto, sucId: string) {
    const next: Record<string, string> = {};
    for (const color of coloresProducto(producto)) {
      for (const talla of encabezadosTalla(producto)) {
        const k = clave(color, talla);
        if (modo === "contar" && sucId) {
          next[k] = String(cantidadEn(producto, sucId, talla, color));
        } else {
          next[k] = "";
        }
      }
    }
    setValores(next);
  }

  function elegirSucursal(id: string) {
    setSucursalId(id);
    localStorage.setItem(SUCURSAL_KEY, id);
    if (mostrado) initGrid(mostrado, id);
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
    if (hits.length === 1) initGrid(hits[0], sucursalId);
    else setValores({});
  }

  const celdas: CeldaCaptura[] = [];
  if (mostrado) {
    for (const color of colores) {
      for (const talla of encabezados) {
        const raw = valores[clave(color, talla)] ?? "";
        if (raw.trim() === "") continue;
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0) continue;
        if (modo !== "contar" && n === 0) continue;
        celdas.push({ talla, color, cantidad: n });
      }
    }
  }

  const payload: CapturaPayload | null =
    mostrado && sucursal && celdas.length > 0
      ? {
          producto: mostrado,
          sucursalId: sucursal.id,
          sucursalNombre: sucursal.nombre,
          celdas,
        }
      : null;

  const verbos: Record<ModoCaptura, string> = {
    contar: "el conteo",
    sacar: "la salida",
    entrada: "la entrada",
    pedido: "agregar al pedido",
  };

  async function aceptar() {
    if (!payload) return;
    await onCommit(payload);
    setConfirmar(false);
    if (modo !== "contar" && mostrado) initGrid(mostrado, sucursalId);
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
                placeholder="Código o nombre (ej. XC1092 camisa)"
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
              detalle="Escribe el código (XC1092) o el nombre (camisa, chaleco, vela)."
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
                <p className="text-sm text-muted-foreground">
                  Llena la fila de un color (todas sus tallas) y baja a la siguiente.
                  {usuarioNombre ? ` · ${usuarioNombre}` : ""}
                </p>
                <div className="-mx-1 overflow-x-auto">
                  <table className="min-w-max border-collapse text-center text-xs">
                    <thead>
                      <tr className="bg-muted/70">
                        <th className="sticky left-0 z-20 min-w-28 border bg-muted px-2 py-2 text-left font-semibold">
                          Artículo
                        </th>
                        <th className="sticky left-28 z-20 min-w-16 border bg-muted px-1 py-2 font-semibold">
                          COLOR
                        </th>
                        {encabezados.map((t) => (
                          <th
                            key={t || "cant"}
                            className="min-w-10 border px-1 py-2 font-medium"
                          >
                            {t || "Cant."}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {colores.map((color, idx) => (
                        <tr key={color}>
                          {idx === 0 ? (
                            <td
                              rowSpan={colores.length}
                              className="sticky left-0 z-10 max-w-28 border bg-background px-2 py-2 text-left align-top"
                            >
                              <p className="font-heading text-sm font-semibold leading-tight">
                                {mostrado.sku}
                              </p>
                              <p className="text-xs leading-tight">{mostrado.nombre}</p>
                            </td>
                          ) : null}
                          <td className="sticky left-28 z-10 border bg-background px-1 py-1 font-medium capitalize">
                            {color}
                          </td>
                          {encabezados.map((talla) => {
                            const k = clave(color, talla);
                            return (
                              <td key={k} className="border p-0">
                                <input
                                  inputMode="numeric"
                                  aria-label={`${color} ${talla || "cantidad"}`}
                                  className="h-9 w-10 bg-transparent text-center text-sm outline-none focus:bg-teal-50"
                                  value={valores[k] ?? ""}
                                  onChange={(e) =>
                                    setValores((prev) => ({
                                      ...prev,
                                      [k]: e.target.value,
                                    }))
                                  }
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Button
                  type="button"
                  className={cn("h-11 w-full", btn)}
                  disabled={!payload}
                  onClick={() => setConfirmar(true)}
                >
                  Revisar y confirmar
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
                      initGrid(producto, sucursalId);
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
                      <p className="text-xs text-muted-foreground">
                        {coloresProducto(producto).length} colores ·{" "}
                        {encabezadosTalla(producto).filter(Boolean).length || 1}{" "}
                        columnas de talla
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
                ? `¿Confirmas ${verbos[modo]} de ${payload.producto.sku} ${payload.producto.nombre} en ${payload.sucursalNombre}? ${payload.celdas.length} celdas.`
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
