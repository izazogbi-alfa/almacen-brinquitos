"use client";

import { useState } from "react";
import { Minus, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AsyncGate, EmptyView } from "@/components/status-views";
import { FotoProducto } from "@/components/foto-producto";
import { etiquetaUnidad, fechaClave, formatoFechaHora } from "@/lib/format";
import { useInventory } from "@/lib/inventory-context";
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

const SUCURSAL_KEY = "almacen_sucursal";

function ExistenciasContent() {
  const { productos, movimientos, cierres, user, contar, cerrarDia } =
    useInventory();
  const [sucursalId, setSucursalId] = useState("");
  const [q, setQ] = useState("");
  const [consulta, setConsulta] = useState("");
  const [buscado, setBuscado] = useState(false);
  const [vista, setVista] = useState<"contar" | "hoy">("contar");
  const [activo, setActivo] = useState<Producto | null>(null);
  const [cantidad, setCantidad] = useState("0");
  const [talla, setTalla] = useState("");
  const [color, setColor] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [cerrando, setCerrando] = useState(false);

  function elegirSucursal(id: string) {
    setSucursalId(id);
    localStorage.setItem(SUCURSAL_KEY, id);
  }

  const sucursal = sucursalPorId(sucursalId);
  const hoy = fechaClave();
  const delDia = movimientos.filter(
    (m) =>
      fechaClave(new Date(m.timestamp)) === hoy && m.tipo === "conteo",
  );
  const cierresHoy = cierres.filter((c) => c.fecha === hoy);
  const ultimoCierreHoy = cierresHoy[0];

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
  const stockSucursalCelda = mostrado && sucursalId
    ? cantidadEn(mostrado, sucursalId, tallaActiva, colorActivo)
    : 0;
  const totalSucursal = mostrado && sucursalId
    ? totalEnSucursal(mostrado, sucursalId)
    : 0;
  const totalTodas = mostrado ? totalProducto(mostrado) : 0;

  function prepararProducto(producto: Producto) {
    const t0 = usaTalla(producto) ? tallasProducto(producto)[0] ?? "" : "";
    const c0 = coloresProducto(producto)[0] ?? "Único";
    setTalla(t0);
    setColor(c0);
    if (sucursalId) {
      setCantidad(String(cantidadEn(producto, sucursalId, t0, c0)));
    } else {
      setCantidad("0");
    }
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
    if (hits.length === 1) {
      prepararProducto(hits[0]);
    } else {
      setTalla("");
      setColor("");
      setCantidad("0");
    }
  }

  function abrir(producto: Producto) {
    setActivo(producto);
    prepararProducto(producto);
  }

  function cambiarTalla(t: string) {
    if (!mostrado) return;
    setTalla(t);
    const cols = coloresProducto(mostrado);
    const c = cols.includes(colorActivo) ? colorActivo : cols[0] ?? "Único";
    if (c !== colorActivo) setColor(c);
    if (sucursalId) {
      setCantidad(String(cantidadEn(mostrado, sucursalId, t, c)));
    }
  }

  function cambiarColor(c: string) {
    if (!mostrado) return;
    setColor(c);
    if (sucursalId) {
      setCantidad(String(cantidadEn(mostrado, sucursalId, tallaActiva, c)));
    }
  }

  async function confirmar() {
    if (!mostrado) return;
    if (!sucursalId) {
      toast.error("Elige la sucursal antes de contar.");
      return;
    }
    setGuardando(true);
    try {
      await contar(
        mostrado.id,
        Number(cantidad),
        sucursalId,
        conTalla ? tallaActiva : undefined,
        colorActivo,
      );
      toast.success(
        `Conteo en ${sucursal?.nombre} · ${user?.nombre}`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  }

  async function cerrar() {
    setCerrando(true);
    try {
      await cerrarDia();
      toast.success("Día cerrado y guardado en el servidor");
      setVista("hoy");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo cerrar.");
    } finally {
      setCerrando(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Contar existencias
        </h2>
        {ultimoCierreHoy ? (
          <p className="text-sm text-teal-800">
            Hoy cerrado por {ultimoCierreHoy.userName} ·{" "}
            {formatoFechaHora(ultimoCierreHoy.timestamp)}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Elige sucursal, busca el producto y cuenta lo que hay en anaquel.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Sucursal</Label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {SUCURSALES.map((s) => (
            <Button
              key={s.id}
              type="button"
              variant={s.id === sucursalId ? "default" : "outline"}
              className="h-11 w-full"
              onClick={() => {
                elegirSucursal(s.id);
                if (mostrado) {
                  setCantidad(
                    String(
                      cantidadEn(
                        mostrado,
                        s.id,
                        usaTalla(mostrado)
                          ? talla || tallasProducto(mostrado)[0] || ""
                          : "",
                        color || coloresProducto(mostrado)[0] || "Único",
                      ),
                    ),
                  );
                }
              }}
            >
              {s.nombre}
            </Button>
          ))}
        </div>
        {!sucursalId ? (
          <p className="text-sm text-amber-800">
            Toca la sucursal donde estás antes de guardar un conteo.
          </p>
        ) : null}
      </div>

      <Button
        type="button"
        variant="outline"
        className="h-11 w-full"
        disabled={cerrando}
        onClick={() => void cerrar()}
      >
        {cerrando
          ? "Guardando…"
          : ultimoCierreHoy
            ? "Guardar de nuevo / cerrar el día"
            : "Cerrar el día"}
      </Button>

      <Tabs value={vista} onValueChange={(v) => setVista(v as typeof vista)}>
        <TabsList className="w-full">
          <TabsTrigger value="contar">Contar</TabsTrigger>
          <TabsTrigger value="hoy">Hoy</TabsTrigger>
        </TabsList>
      </Tabs>

      {vista === "hoy" ? (
        <div className="space-y-4">
          <div>
            <h3 className="mb-2 text-sm font-medium">Quién cerró / guardó</h3>
            {cierresHoy.length === 0 ? (
              <EmptyView
                titulo="Nadie ha cerrado el día"
                detalle="Cuando termines, toca Cerrar el día. Quedará tu nombre y la hora."
              />
            ) : (
              <ul className="space-y-2">
                {cierresHoy.map((c) => (
                  <li key={c.id} className="rounded-xl border p-3 text-sm">
                    <p className="font-medium">{c.userName}</p>
                    <p className="text-muted-foreground">
                      {formatoFechaHora(c.timestamp)} · {c.conteos} conteos
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="mb-2 text-sm font-medium">Quién contó</h3>
            {delDia.length === 0 ? (
              <EmptyView
                titulo="Sin conteos hoy"
                detalle="Busca un producto, elige sucursal y guarda el conteo. Queda a tu nombre."
              />
            ) : (
              <ul className="space-y-2">
                {delDia.map((m) => (
                  <li key={m.id} className="rounded-xl border p-3 text-sm">
                    <p className="font-medium">{m.productoNombre}</p>
                    <p className="text-muted-foreground">
                      {m.sucursalNombre ?? "Sucursal"} · {m.userName} ·{" "}
                      {formatoFechaHora(m.timestamp)}
                      {m.talla || m.color
                        ? ` · ${m.talla ? `${m.talla} / ` : ""}${m.color ?? ""}`
                        : ""}
                      {` · ${m.existenciaDespues ?? 0} pzas`}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <>
          <form onSubmit={buscar} className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Código o nombre (ej. ropón, BRI-1001)"
                className="h-11 pl-9 text-base"
                enterKeyHint="search"
                autoComplete="off"
              />
            </div>
            <Button type="submit" className="h-11 px-4">
              Buscar
            </Button>
          </form>

          {!buscado ? (
            <EmptyView
              titulo="Busca el producto a contar"
              detalle="Escribe el código (ej. BRI-1001) o el nombre (ej. ropón, chaleco, vela)."
            />
          ) : coincidencias.length === 0 ? (
            <EmptyView
              titulo="No hay coincidencias"
              detalle={`Nada con “${consulta}”. Prueba el código o parte del nombre.`}
            />
          ) : mostrado && (unico || activo) ? (
            <Card>
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
                      {sucursal
                        ? `${etiquetaUnidad(mostrado.unidad, totalSucursal)} en ${sucursal.nombre}`
                        : "Elige sucursal"}
                    </Badge>
                    <Badge
                      variant={
                        totalTodas <= (mostrado.minimo ?? 0)
                          ? "destructive"
                          : "outline"
                      }
                    >
                      Total 3 sucursales: {totalTodas} {mostrado.unidad}
                    </Badge>
                  </div>
                </div>
                <ul className="grid grid-cols-3 gap-2 text-center text-xs">
                  {totalesPorSucursal(mostrado).map((s) => (
                    <li
                      key={s.id}
                      className={`rounded-lg border p-2 ${s.id === sucursalId ? "border-teal-700 bg-teal-50" : ""}`}
                    >
                      <p className="font-medium">{s.nombre}</p>
                      <p className="text-muted-foreground">{s.cantidad}</p>
                    </li>
                  ))}
                </ul>
                {conTalla ? (
                  <div className="space-y-1.5">
                    <Label>
                      {esquema === "nino"
                        ? "Talla (0–60, pares)"
                        : "Talla"}
                    </Label>
                    <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto">
                      {tallas.map((t) => (
                        <Button
                          key={t}
                          type="button"
                          variant={t === tallaActiva ? "default" : "outline"}
                          className="h-10 min-w-11 px-2.5 text-xs"
                          onClick={() => cambiarTalla(t)}
                        >
                          {t}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Este producto no usa talla numérica: solo cantidad y color.
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
                        className="h-10"
                        onClick={() => cambiarColor(c)}
                      >
                        {c}
                      </Button>
                    ))}
                  </div>
                </div>
                {sucursal ? (
                  <p className="text-sm">
                    En {sucursal.nombre}
                    {tallaActiva ? ` · talla ${tallaActiva}` : ""} ·{" "}
                    {colorActivo}:{" "}
                    <span className="font-medium">
                      {stockSucursalCelda} {mostrado.unidad}
                    </span>
                  </p>
                ) : null}
                <p className="text-sm">
                  Cuenta: <span className="font-medium">{user?.nombre}</span>
                </p>
                <div className="space-y-2">
                  <Label>Piezas en anaquel</Label>
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
                  className="h-11 w-full"
                  disabled={guardando || !sucursalId}
                  onClick={() => void confirmar()}
                >
                  {guardando ? "Guardando…" : "Guardar conteo"}
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
                    onClick={() => abrir(producto)}
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
                        {sucursal
                          ? ` · ${sucursal.nombre} ${totalEnSucursal(producto, sucursal.id)}`
                          : ""}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

export default function ExistenciasPage() {
  return (
    <AsyncGate>
      <ExistenciasContent />
    </AsyncGate>
  );
}
