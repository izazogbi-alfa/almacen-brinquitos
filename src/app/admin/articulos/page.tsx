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
import type { Producto } from "@/lib/types";
import { cn } from "@/lib/utils";

function ArticulosAdmin() {
  const { productos, user, guardarArticulo } = useInventory();
  const [q, setQ] = useState("");
  const [orden, setOrden] = useState<OrdenArticulos>("nombre");
  const [pagina, setPagina] = useState(1);
  const [ficha, setFicha] = useState<Producto | "nuevo" | null>(null);
  const [nombre, setNombre] = useState("");
  const [clave, setClave] = useState("");
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
        detalle="Los operadores no dan de alta artículos."
      />
    );
  }

  function abrir(p: Producto) {
    setFicha(p);
    setNombre(p.nombre);
    setClave(p.sku);
  }

  function abrirNuevo() {
    setFicha("nuevo");
    setNombre("");
    setClave("");
  }

  function cerrarFicha() {
    setFicha(null);
  }

  const productoFicha = ficha && ficha !== "nuevo" ? ficha : null;
  const formVisible = ficha !== null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-semibold tracking-tight">
            Artículos
          </h2>
          <p className="text-sm text-muted-foreground">
            {ARTICULOS_POR_PAGINA} por página. Busca por Clave o nombre. Las
            listas de conteo se arman en Configuración.
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
        <div className={cn("space-y-3", formVisible && "hidden md:block")}>
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
                        productoFicha?.id === p.id &&
                          "border-teal-700 ring-2 ring-teal-700/20",
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
                Clave primero, luego el nombre. Esquema, colores, tallas y
                especificaciones se eligen al capturar, desde Configuración.
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
            Clave y nombre.
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
