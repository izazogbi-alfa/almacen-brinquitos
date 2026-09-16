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
import type { Producto } from "@/lib/types";

function ExistenciasContent() {
  const {
    productos,
    movimientos,
    cierres,
    user,
    retirar,
    contar,
    cerrarDia,
  } = useInventory();
  const [q, setQ] = useState("");
  const [consulta, setConsulta] = useState("");
  const [buscado, setBuscado] = useState(false);
  const [vista, setVista] = useState<"sacar" | "hoy">("sacar");
  const [activo, setActivo] = useState<Producto | null>(null);
  const [modo, setModo] = useState<"retiro" | "conteo">("retiro");
  const [cantidad, setCantidad] = useState("1");
  const [guardando, setGuardando] = useState(false);
  const [cerrando, setCerrando] = useState(false);

  const hoy = fechaClave();
  const delDia = movimientos.filter(
    (m) =>
      fechaClave(new Date(m.timestamp)) === hoy &&
      (m.tipo === "retiro" || m.tipo === "conteo"),
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

  function buscar(e?: React.FormEvent) {
    e?.preventDefault();
    const texto = q.trim();
    setConsulta(texto);
    setBuscado(true);
    setActivo(null);
    setModo("retiro");
    setCantidad("1");
  }

  function abrir(producto: Producto) {
    setActivo(producto);
    setModo("retiro");
    setCantidad("1");
  }

  async function confirmar() {
    if (!mostrado) return;
    setGuardando(true);
    try {
      if (modo === "retiro") {
        await retirar(mostrado.id, Number(cantidad));
        toast.success(`Salida a nombre de ${user?.nombre}`);
      } else {
        await contar(mostrado.id, Number(cantidad));
        toast.success("Conteo guardado");
      }
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
          Sacar existencia
        </h2>
        {ultimoCierreHoy ? (
          <p className="text-sm text-teal-800">
            Hoy cerrado por {ultimoCierreHoy.userName} ·{" "}
            {formatoFechaHora(ultimoCierreHoy.timestamp)}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Busca el código o el nombre. No se muestra el catálogo completo.
          </p>
        )}
      </div>

      <Button
        type="button"
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
          <TabsTrigger value="sacar">Sacar</TabsTrigger>
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
                      {formatoFechaHora(c.timestamp)} · {c.retiros} salidas ·{" "}
                      {c.conteos} conteos
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="mb-2 text-sm font-medium">Quién lo sacó</h3>
            {delDia.length === 0 ? (
              <EmptyView
                titulo="Sin movimientos hoy"
                detalle="Busca un producto y regístrale una salida. Queda a tu nombre."
              />
            ) : (
              <ul className="space-y-2">
                {delDia.map((m) => (
                  <li key={m.id} className="rounded-xl border p-3 text-sm">
                    <p className="font-medium">
                      {m.tipo === "retiro" ? "Salió" : "Conteo"} ·{" "}
                      {m.productoNombre}
                    </p>
                    <p className="text-muted-foreground">
                      {m.tipo === "retiro" ? `${m.cantidad} pzas · ` : null}
                      {m.userName} · {formatoFechaHora(m.timestamp)}
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
                placeholder="Código o nombre"
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
              titulo="Busca el producto a sacar"
              detalle="Escribe el código (ej. ALI-1001) o el nombre (ej. harina) y toca Buscar."
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
                    {mostrado.sku} · {mostrado.ubicacion}
                  </p>
                  <Badge
                    className="mt-2"
                    variant={
                      mostrado.existencia <= mostrado.minimo
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {etiquetaUnidad(mostrado.unidad, mostrado.existencia)} en piso
                  </Badge>
                </div>
                <p className="text-sm">
                  Lo saca: <span className="font-medium">{user?.nombre}</span>
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={modo === "retiro" ? "default" : "outline"}
                    className="h-10 flex-1"
                    onClick={() => {
                      setModo("retiro");
                      setCantidad("1");
                    }}
                  >
                    Sacar
                  </Button>
                  <Button
                    type="button"
                    variant={modo === "conteo" ? "default" : "outline"}
                    className="h-10 flex-1"
                    onClick={() => {
                      setModo("conteo");
                      setCantidad(String(mostrado.existencia));
                    }}
                  >
                    Contar
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>
                    {modo === "retiro"
                      ? "Cantidad que sale"
                      : "Existencia contada"}
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
                  className="h-11 w-full"
                  disabled={guardando}
                  onClick={() => void confirmar()}
                >
                  {guardando ? "Guardando…" : "Registrar"}
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
                        {producto.sku} · {producto.existencia} {producto.unidad}
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
