"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BloqueConfig,
  DialogoEsquema,
  DialogoListaArticulo,
  etiquetaEsquema,
} from "@/components/config-articulo";
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
import { unirLista } from "@/lib/listas-articulo";
import type { EsquemaConteo, Producto } from "@/lib/types";
import { esquemaDe } from "@/lib/sucursales";
import { cn } from "@/lib/utils";

type PanelConfig =
  | null
  | "esquema"
  | "colores"
  | "tallas"
  | "especificaciones";

function ArticulosAdmin() {
  const { productos, user, guardarArticulo } = useInventory();
  const [q, setQ] = useState("");
  const [orden, setOrden] = useState<OrdenArticulos>("nombre");
  const [pagina, setPagina] = useState(1);
  const [ficha, setFicha] = useState<Producto | "nuevo" | null>(null);
  const [nombre, setNombre] = useState("");
  const [clave, setClave] = useState("");
  const [esquema, setEsquema] = useState<EsquemaConteo>("accesorio");
  const [colores, setColores] = useState<string[]>([]);
  const [tallas, setTallas] = useState<string[]>([]);
  const [especificaciones, setEspecificaciones] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [panel, setPanel] = useState<PanelConfig>(null);

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
    setColores(p.colores?.length ? p.colores : []);
    setTallas(p.tallas?.length ? p.tallas : []);
    setEspecificaciones(p.especificaciones?.length ? p.especificaciones : []);
    setPanel(null);
  }

  function abrirNuevo() {
    setFicha("nuevo");
    setNombre("");
    setClave("");
    setEsquema("accesorio");
    setColores([]);
    setTallas([]);
    setEspecificaciones([]);
    setPanel(null);
  }

  function cerrarFicha() {
    setFicha(null);
    setPanel(null);
  }

  const productoFicha = ficha && ficha !== "nuevo" ? ficha : null;
  const formVisible = ficha !== null;

  async function persistir(parcial?: {
    esquema?: EsquemaConteo;
    colores?: string[];
    tallas?: string[];
    especificaciones?: string[];
  }) {
    const sigEsquema = parcial?.esquema ?? esquema;
    const sigColores = parcial?.colores ?? colores;
    const sigTallas = parcial?.tallas ?? tallas;
    const sigEspecs = parcial?.especificaciones ?? especificaciones;
    if (ficha === "nuevo") {
      setEsquema(sigEsquema);
      setColores(sigColores);
      setTallas(sigTallas);
      setEspecificaciones(sigEspecs);
      toast.success("Queda en el alta. Pulsa Guardar alta al terminar.");
      return;
    }
    if (!productoFicha) return;
    await guardarArticulo({
      id: productoFicha.id,
      nombre,
      sku: clave,
      esquemaConteo: sigEsquema,
      colores: unirLista(sigColores),
      tallas: unirLista(sigTallas),
      especificaciones: unirLista(sigEspecs),
    });
    setEsquema(sigEsquema);
    setColores(sigColores);
    setTallas(sigTallas);
    setEspecificaciones(sigEspecs);
    toast.success("Configuración de este artículo guardada");
  }

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
                  colores: unirLista(colores),
                  tallas: unirLista(tallas),
                  especificaciones: unirLista(especificaciones),
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
                Clave y nombre aquí. El engrane de cada bloque abre su lista,
                solo de este artículo.
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

            <BloqueConfig
              titulo="Esquema de conteo"
              vacio="Aún no hay esquema. Pulsa el engrane."
              items={[etiquetaEsquema(esquema)]}
              onConfigurar={() => setPanel("esquema")}
            />
            <BloqueConfig
              titulo="Colores"
              vacio="Aún no hay colores en este artículo. Pulsa el engrane para agregar."
              items={colores}
              onConfigurar={() => setPanel("colores")}
            />
            <BloqueConfig
              titulo="Tallas"
              vacio="Aún no hay tallas en este artículo. Pulsa el engrane. No se arma una tabla global."
              items={tallas}
              onConfigurar={() => setPanel("tallas")}
            />
            <BloqueConfig
              titulo="Especificaciones"
              vacio="Aún no hay especificaciones. Pulsa el engrane para crear la lista de este artículo."
              items={especificaciones}
              onConfigurar={() => setPanel("especificaciones")}
            />

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
            Clave, nombre y el engrane de cada lista.
          </p>
        )}
      </div>

      {panel === "esquema" ? (
        <DialogoEsquema
          abierto
          onCerrar={() => setPanel(null)}
          actual={esquema}
          onGuardar={(sig, plantilla) => {
            void persistir({
              esquema: sig,
              tallas: plantilla !== undefined ? plantilla : tallas,
            })
              .then(() => setPanel(null))
              .catch((err) =>
                toast.error(err instanceof Error ? err.message : "Error"),
              );
          }}
        />
      ) : null}
      {panel === "colores" ? (
        <DialogoListaArticulo
          abierto
          onCerrar={() => setPanel(null)}
          titulo="Colores de este artículo"
          descripcion="Lista propia. Edita, reemplaza o suma colores. No es una matriz de todo el catálogo."
          placeholder="Ej. blanco, rosa, azul"
          valores={colores}
          onGuardar={(items) => {
            void persistir({ colores: items })
              .then(() => setPanel(null))
              .catch((err) =>
                toast.error(err instanceof Error ? err.message : "Error"),
              );
          }}
        />
      ) : null}
      {panel === "tallas" ? (
        <DialogoListaArticulo
          abierto
          onCerrar={() => setPanel(null)}
          titulo="Tallas de este artículo"
          descripcion="Solo las tallas de esta ficha. Puedes copiar una plantilla desde esquema de conteo."
          placeholder="Ej. 4, 6, 8 o CHICO"
          valores={tallas}
          onGuardar={(items) => {
            void persistir({ tallas: items })
              .then(() => setPanel(null))
              .catch((err) =>
                toast.error(err instanceof Error ? err.message : "Error"),
              );
          }}
        />
      ) : null}
      {panel === "especificaciones" ? (
        <DialogoListaArticulo
          abierto
          onCerrar={() => setPanel(null)}
          titulo="Especificaciones de este artículo"
          descripcion="Notas o medidas extra de esta ficha: manga, forro, paquete, etc."
          placeholder="Ej. manga corta, con gorro"
          valores={especificaciones}
          onGuardar={(items) => {
            void persistir({ especificaciones: items })
              .then(() => setPanel(null))
              .catch((err) =>
                toast.error(err instanceof Error ? err.message : "Error"),
              );
          }}
        />
      ) : null}
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
