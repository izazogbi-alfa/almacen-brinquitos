"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { DialogAgregarEsquemas } from "@/components/agregar-esquemas";
import { AsyncGate, EmptyView } from "@/components/status-views";
import { DialogClonarAsignacion } from "@/components/clonar-asignacion";
import { FotoProducto } from "@/components/foto-producto";
import {
  estaElegido,
  opcionesTallaArticulo,
  resumenConteo,
  textoLista,
} from "@/lib/asignacion-articulo";
import { useInventory } from "@/lib/inventory-context";
import { puede } from "@/lib/modulos";
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
  const { productos, catalogos, user, guardarArticulo, clonarAsignacion } =
    useInventory();
  const [q, setQ] = useState("");
  const [orden, setOrden] = useState<OrdenArticulos>("nombre");
  const [pagina, setPagina] = useState(1);
  const [ficha, setFicha] = useState<Producto | "nuevo" | null>(null);
  const [nombre, setNombre] = useState("");
  const [clave, setClave] = useState("");
  const [esquemaId, setEsquemaId] = useState("");
  const [colores, setColores] = useState<string[]>([]);
  const [tallas, setTallas] = useState<string[]>([]);
  const [especificaciones, setEspecificaciones] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [password, setPassword] = useState("");
  const [errorClave, setErrorClave] = useState("");
  const [clonar, setClonar] = useState(false);
  const [agregarEsquemas, setAgregarEsquemas] = useState(false);

  const filtrados = useMemo(() => {
    return ordenarArticulos(filtrarArticulos(productos, q), orden);
  }, [productos, q, orden]);

  const lista = paginarArticulos(filtrados, pagina);
  const paginaActual = lista.pagina;
  const resumen = resumenConteo(
    catalogos,
    esquemaId,
    colores,
    tallas,
    especificaciones,
  );
  const productoFicha = ficha && ficha !== "nuevo" ? ficha : null;
  const formVisible = ficha !== null;

  if (!puede(user, "articulos")) {
    return (
      <EmptyView
        titulo="Sin acceso a artículos"
        detalle="Pide a Iza que te asigne el módulo de artículos."
      />
    );
  }

  function aplicarDesdeProducto(p: Producto) {
    const esq = catalogos.esquemas.find((e) => e.id === p.esquemaConteo)?.id ?? "";
    setEsquemaId(esq);
    const opciones = opcionesTallaArticulo(catalogos, esq);
    setTallas((p.tallas ?? []).filter((t) => estaElegido(opciones, t)));
    setColores((p.colores ?? []).filter((c) => estaElegido(catalogos.colores, c)));
    setEspecificaciones(
      (p.especificaciones ?? []).filter((s) =>
        estaElegido(catalogos.especificaciones, s),
      ),
    );
  }

  function abrir(p: Producto) {
    setFicha(p);
    setNombre(p.nombre);
    setClave(p.sku);
    aplicarDesdeProducto(p);
    setErrorClave("");
    setPassword("");
  }

  function abrirNuevo() {
    setFicha("nuevo");
    setNombre("");
    setClave("");
    setEsquemaId("");
    setTallas([]);
    setColores([]);
    setEspecificaciones([]);
    setErrorClave("");
    setPassword("");
  }

  function cerrarFicha() {
    setFicha(null);
    setConfirmar(false);
    setClonar(false);
    setAgregarEsquemas(false);
    setPassword("");
    setErrorClave("");
  }

  function pedirConfirmacion(e: React.FormEvent) {
    e.preventDefault();
    setPassword("");
    setErrorClave("");
    setConfirmar(true);
  }

  function cancelarGuardado() {
    setConfirmar(false);
    setPassword("");
    setErrorClave("");
  }

  async function confirmarGuardado(e: React.FormEvent) {
    e.preventDefault();
    if (!password) {
      setErrorClave("Escribe tu contraseña.");
      return;
    }
    setGuardando(true);
    setErrorClave("");
    try {
      await guardarArticulo({
        id: productoFicha?.id,
        nombre,
        sku: clave,
        soloIdentidad: true,
        password,
      });
      toast.success(
        ficha === "nuevo" ? "Artículo dado de alta" : "Clave y nombre guardados",
      );
      cerrarFicha();
    } catch (err) {
      setErrorClave(err instanceof Error ? err.message : "Error");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-semibold tracking-tight">
            Artículos
          </h2>
          <p className="text-sm text-muted-foreground">
            {ARTICULOS_POR_PAGINA} por página. En la ficha pulsa Agregar
            esquemas para el conteo de existencias, pedidos y recepción. Las
            listas se arman en Configuración.
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
            className="space-y-4 rounded-xl border p-4"
            onSubmit={pedirConfirmacion}
          >
            <div>
              <h3 className="font-heading text-lg font-semibold">
                {ficha === "nuevo" ? "Alta de artículo" : "Ficha del artículo"}
              </h3>
              <p className="text-sm text-muted-foreground">
                Clave primero, luego el nombre. El esquema no se elige aquí: pulsa
                Agregar esquemas. Es el mismo para existencias, pedidos y
                recepción.
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

            <aside className="space-y-2 rounded-xl bg-teal-50 p-4 text-teal-950 ring-1 ring-teal-200">
              <p className="text-sm font-semibold">
                Así se cuenta (existencias, pedidos y recepción)
              </p>
              {esquemaId ? (
                <>
                  <p className="text-sm">
                    <span className="font-medium">{resumen.esquemaNombre}</span>
                  </p>
                  <p className="text-sm">
                    Colores:{" "}
                    {textoLista(resumen.colores, "ninguno aún")}
                  </p>
                  <p className="text-sm">
                    {resumen.sinTalla
                      ? "Tallas: no usa talla. Solo color y cantidad."
                      : `Tallas: ${textoLista(resumen.tallas, "")}`}
                  </p>
                  <p className="text-sm">
                    Especificaciones:{" "}
                    {textoLista(resumen.especificaciones, "ninguna")}
                  </p>
                </>
              ) : (
                <p className="text-sm">
                  Aún no hay esquema. Pulsa Agregar esquemas y elige el que
                  mejor le queda, de los ya armados en Configuración.
                </p>
              )}
            </aside>

            <Button
              type="button"
              className="h-11 w-full"
              disabled={guardando}
              onClick={() => {
                if (!clave.trim() || !nombre.trim()) {
                  toast.error("Escribe Clave y nombre antes de agregar el esquema.");
                  return;
                }
                setAgregarEsquemas(true);
              }}
            >
              Agregar esquemas
            </Button>
            <Button type="submit" variant="outline" className="h-11 w-full" disabled={guardando}>
              {ficha === "nuevo" ? "Guardar alta" : "Guardar ficha"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full"
              disabled={guardando || !esquemaId}
              onClick={() => setClonar(true)}
            >
              Clonar a otros artículos
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
            Clave, nombre y cómo se cuenta.
          </p>
        )}
      </div>

      <Dialog
        open={confirmar}
        onOpenChange={(abierto) => {
          if (!abierto) cancelarGuardado();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <form
            onSubmit={(e) => void confirmarGuardado(e)}
            className="grid gap-4"
          >
            <DialogHeader>
              <DialogTitle>Guardar artículo</DialogTitle>
              <DialogDescription>
                Escribe tu contraseña de administradora para guardar Clave y
                nombre. El esquema se elige en Agregar esquemas, no aquí.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="clave-guardar-articulo">Tu contraseña</Label>
              <Input
                id="clave-guardar-articulo"
                type="password"
                autoComplete="current-password"
                className="h-11"
                autoFocus
                value={password}
                aria-invalid={Boolean(errorClave)}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorClave) setErrorClave("");
                }}
              />
              {errorClave ? (
                <p className="text-sm text-destructive" role="alert">
                  {errorClave}
                </p>
              ) : null}
            </div>
            <DialogFooter className="sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full sm:w-auto"
                disabled={guardando}
                onClick={cancelarGuardado}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="h-11 w-full sm:w-auto"
                disabled={guardando}
              >
                {guardando ? "Comprobando…" : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DialogAgregarEsquemas
        key={agregarEsquemas ? "agregar-esquemas-abierto" : "agregar-esquemas-cerrado"}
        abierto={agregarEsquemas}
        catalogos={catalogos}
        inicial={{
          esquemaConteo: esquemaId,
          colores,
          tallas,
          especificaciones,
        }}
        onCerrar={() => setAgregarEsquemas(false)}
        onGuardar={async (asignacion, claveAdmin) => {
          const guardado = await guardarArticulo({
            id: productoFicha?.id,
            nombre,
            sku: clave,
            esquemaConteo: asignacion.esquemaConteo,
            colores: asignacion.colores,
            tallas: asignacion.tallas,
            especificaciones: asignacion.especificaciones,
            password: claveAdmin,
          });
          setFicha(guardado);
          aplicarDesdeProducto(guardado);
          toast.success("Esquema guardado para existencias, pedidos y recepción");
        }}
      />

      <DialogClonarAsignacion
        abierto={clonar}
        origenId={productoFicha?.id}
        origenEtiqueta={
          clave.trim() && nombre.trim()
            ? `Clave ${clave} ${nombre}`
            : "esta ficha"
        }
        esquemaNombre={resumen.esquemaNombre}
        productos={productos}
        onCerrar={() => setClonar(false)}
        onClonar={async (ids, claveAdmin) => {
          await clonarAsignacion({
            ids,
            esquemaConteo: esquemaId,
            colores,
            tallas,
            especificaciones,
            password: claveAdmin,
          });
          toast.success(
            `Esquema copiado a ${ids.length} artículo${ids.length === 1 ? "" : "s"}`,
          );
        }}
      />
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
