"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AsyncGate, EmptyView } from "@/components/status-views";
import { FotoProducto } from "@/components/foto-producto";
import { useInventory } from "@/lib/inventory-context";
import {
  ARTICULOS_POR_PAGINA,
  filtrarArticulos,
  ordenarArticulos,
  paginarArticulos,
  type OrdenArticulos,
} from "@/lib/articulos-lista";
import type { EsquemaConteo, Producto } from "@/lib/types";
import { coloresProducto, esquemaDe, tallasProducto } from "@/lib/sucursales";
import { cn } from "@/lib/utils";

function etiquetaEsquema(esquema: EsquemaConteo) {
  if (esquema === "nino") return "Niño 0–60";
  if (esquema === "letra") return "Letra";
  return "Accesorio";
}

function ArticulosAdmin() {
  const { productos, user, guardarArticulo } = useInventory();
  const [q, setQ] = useState("");
  const [orden, setOrden] = useState<OrdenArticulos>("nombre");
  const [pagina, setPagina] = useState(1);
  const [ficha, setFicha] = useState<Producto | "nuevo" | null>(null);
  const [nombre, setNombre] = useState("");
  const [clave, setClave] = useState("");
  const [esquema, setEsquema] = useState<EsquemaConteo>("accesorio");
  const [colores, setColores] = useState("");
  const [tallas, setTallas] = useState("");
  const [guardando, setGuardando] = useState(false);

  const filtrados = useMemo(() => {
    return ordenarArticulos(filtrarArticulos(productos, q), orden);
  }, [productos, q, orden]);

  const lista = paginarArticulos(filtrados, pagina);
  const paginaActual = lista.pagina;

  if (user?.rol !== "admin") {
    return (
      <EmptyView
        titulo="Solo administradora"
        detalle="Iza define las especificaciones de cada artículo."
      />
    );
  }

  function abrir(p: Producto) {
    setFicha(p);
    setNombre(p.nombre);
    setClave(p.sku);
    setEsquema(esquemaDe(p));
    setColores(coloresProducto(p).join(", "));
    setTallas(p.tallas?.length ? p.tallas.join(", ") : "");
  }

  function abrirNuevo() {
    setFicha("nuevo");
    setNombre("");
    setClave("");
    setEsquema("accesorio");
    setColores("");
    setTallas("");
  }

  function cerrarFicha() {
    setFicha(null);
  }

  const productoFicha = ficha && ficha !== "nuevo" ? ficha : null;
  const previewTallas = tallasProducto({
    id: productoFicha?.id ?? "nuevo",
    sku: clave,
    nombre,
    categoria: productoFicha?.categoria ?? "",
    unidad: "pza",
    existencia: 0,
    minimo: 0,
    ubicacion: "",
    esquemaConteo: esquema,
    tallas: tallas
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean),
  }).slice(0, 8);

  const formVisible = ficha !== null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-semibold tracking-tight">
            Artículos
          </h2>
          <p className="text-sm text-muted-foreground">
            {ARTICULOS_POR_PAGINA} por página. Busca por Clave o nombre. Cada
            ficha tiene su propio conteo, colores y tallas.
          </p>
        </div>
        <Button
          type="button"
          className="h-11 shrink-0 gap-2"
          onClick={abrirNuevo}
        >
          <Plus className="size-4" />
          Artículo nuevo
        </Button>
      </div>

      <div
        className={cn(
          "grid gap-6",
          formVisible ? "md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]" : "grid-cols-1",
        )}
      >
        <div
          className={cn(
            "space-y-3",
            formVisible && "hidden md:block",
          )}
        >
          <div className="space-y-1">
            <Label htmlFor="buscar-articulo">Buscar por Clave o nombre</Label>
            <Input
              id="buscar-articulo"
              className="h-11"
              placeholder="Ej. XC1092 o camisa"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPagina(1);
              }}
            />
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium">Orden</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={orden === "nombre" ? "default" : "outline"}
                className="h-11"
                onClick={() => {
                  setOrden("nombre");
                  setPagina(1);
                }}
              >
                Nombre A–Z
              </Button>
              <Button
                type="button"
                variant={orden === "clave" ? "default" : "outline"}
                className="h-11"
                onClick={() => {
                  setOrden("clave");
                  setPagina(1);
                }}
              >
                Clave numérica
              </Button>
            </div>
          </div>

          {productos.length === 0 ? (
            <EmptyView
              titulo="Aún no hay artículos"
              detalle="Pulsa Artículo nuevo para dar de alta el primero."
            />
          ) : filtrados.length === 0 ? (
            <EmptyView
              titulo="Nada coincide"
              detalle={`No hay Clave ni nombre con “${q}”. Prueba otra palabra o borra la búsqueda.`}
            />
          ) : (
            <>
              <ul className="space-y-2">
                {lista.items.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border p-3 text-left",
                        productoFicha?.id === p.id && "border-teal-700 ring-2 ring-teal-700/20",
                      )}
                      onClick={() => abrir(p)}
                    >
                      <FotoProducto
                        src={p.foto}
                        alt={p.nombre}
                        className="size-14 max-h-14 shrink-0 object-cover"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-medium tracking-wide text-teal-800 uppercase">
                          Clave {p.sku}
                        </p>
                        <p className="font-medium leading-tight">{p.nombre}</p>
                        <p className="text-xs text-muted-foreground">
                          {etiquetaEsquema(esquemaDe(p))}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>

              <div className="flex flex-col gap-2 rounded-xl border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-medium">
                  Página {paginaActual} de {lista.totalPaginas}
                  <span className="block text-xs font-normal text-muted-foreground sm:inline sm:before:content-['·'] sm:before:mx-1">
                    {lista.total} artículos
                  </span>
                </p>
                <div className="grid grid-cols-2 gap-2 sm:flex">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 gap-1"
                    disabled={paginaActual <= 1}
                    onClick={() => setPagina(paginaActual - 1)}
                  >
                    <ChevronLeft className="size-4" />
                    Anterior
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 gap-1"
                    disabled={paginaActual >= lista.totalPaginas}
                    onClick={() => setPagina(paginaActual + 1)}
                  >
                    Siguiente
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        {formVisible ? (
          <form
            className="space-y-3 rounded-xl border p-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setGuardando(true);
              try {
                await guardarArticulo({
                  id: productoFicha?.id,
                  nombre,
                  sku: clave,
                  esquemaConteo: esquema,
                  colores,
                  tallas,
                });
                toast.success(
                  ficha === "nuevo"
                    ? "Artículo dado de alta"
                    : "Artículo guardado",
                );
                cerrarFicha();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Error");
              } finally {
                setGuardando(false);
              }
            }}
          >
            <div>
              <h3 className="font-heading text-lg font-semibold">
                {ficha === "nuevo" ? "Alta de artículo" : "Ficha del artículo"}
              </h3>
              <p className="text-sm text-muted-foreground">
                Clave primero. Las tallas y colores son de este artículo, no de
                todo el catálogo.
              </p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="clave-articulo">Clave</Label>
              <Input
                id="clave-articulo"
                className="h-11"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                required
                autoComplete="off"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="nombre-articulo">Nombre</Label>
              <Input
                id="nombre-articulo"
                className="h-11"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                autoComplete="off"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="esquema-articulo">Esquema de conteo</Label>
              <select
                id="esquema-articulo"
                className="h-11 w-full rounded-lg border bg-background px-3"
                value={esquema}
                onChange={(e) => setEsquema(e.target.value as EsquemaConteo)}
              >
                <option value="nino">Ropa niño (tallas 0–60 pares)</option>
                <option value="letra">Letra (EXCHICO…ADULTO)</option>
                <option value="accesorio">Accesorio (sin talla)</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="colores-articulo">
                Colores de este artículo (separados por coma)
              </Label>
              <Input
                id="colores-articulo"
                className="h-11"
                value={colores}
                onChange={(e) => setColores(e.target.value)}
                placeholder="Ej. blanco, rosa, azul"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tallas-articulo">
                Tallas / especificaciones de este artículo (opcional, coma)
              </Label>
              <Input
                id="tallas-articulo"
                className="h-11"
                value={tallas}
                onChange={(e) => setTallas(e.target.value)}
                placeholder={
                  esquema === "nino"
                    ? "Vacío = 0,2,4…60"
                    : esquema === "letra"
                      ? "Vacío = EXCHICO…ADULTO"
                      : "Vacío = sin talla"
                }
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Vista previa de tallas:{" "}
              {previewTallas.length ? previewTallas.join(", ") : "sin talla"}
              {previewTallas.length >= 8 ? "…" : ""}
            </p>
            <Button type="submit" className="h-11 w-full" disabled={guardando}>
              {guardando
                ? "Guardando…"
                : ficha === "nuevo"
                  ? "Guardar alta"
                  : "Guardar ficha"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={cerrarFicha}
            >
              Volver a la lista
            </Button>
          </form>
        ) : (
          <p className="hidden rounded-xl border border-dashed p-6 text-sm text-muted-foreground md:block">
            Elige un artículo de la lista o pulsa Artículo nuevo. Aquí verás su
            Clave, nombre y especificaciones.
          </p>
        )}
      </div>
    </div>
  );
}

export default function PaginaArticulos() {
  return (
    <AsyncGate>
      <ArticulosAdmin />
    </AsyncGate>
  );
}
