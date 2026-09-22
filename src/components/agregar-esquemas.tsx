"use client";

import { useState } from "react";
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
import { EmptyView } from "@/components/status-views";
import {
  alternarDeCatalogo,
  estaElegido,
  opcionesTallaArticulo,
  resumenConteo,
  textoLista,
} from "@/lib/asignacion-articulo";
import type { Catalogos } from "@/lib/types";

function ChipCatalogo({
  items,
  elegidos,
  onToggle,
  vacio,
}: {
  items: string[];
  elegidos: string[];
  onToggle: (valor: string) => void;
  vacio: string;
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
        {vacio}
      </p>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const activo = estaElegido(elegidos, item);
        return (
          <Button
            key={item}
            type="button"
            variant={activo ? "default" : "outline"}
            className="h-11 min-w-11"
            aria-pressed={activo}
            onClick={() => onToggle(item)}
          >
            {item}
          </Button>
        );
      })}
    </div>
  );
}

export type AsignacionEsquema = {
  esquemaConteo: string;
  colores: string[];
  tallas: string[];
  especificaciones: string[];
};

export function DialogAgregarEsquemas({
  abierto,
  catalogos,
  inicial,
  onCerrar,
  onGuardar,
}: {
  abierto: boolean;
  catalogos: Catalogos;
  inicial: AsignacionEsquema;
  onCerrar: () => void;
  onGuardar: (asignacion: AsignacionEsquema, password: string) => Promise<void>;
}) {
  const [esquemaId, setEsquemaId] = useState(inicial.esquemaConteo);
  const [colores, setColores] = useState(inicial.colores);
  const [tallas, setTallas] = useState(inicial.tallas);
  const [especificaciones, setEspecificaciones] = useState(
    inicial.especificaciones,
  );
  const [paso, setPaso] = useState<"elegir" | "clave">("elegir");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const opcionesTalla = opcionesTallaArticulo(catalogos, esquemaId);
  const resumen = resumenConteo(
    catalogos,
    esquemaId,
    colores,
    tallas,
    especificaciones,
  );

  function aplicarEsquema(id: string) {
    setEsquemaId(id);
    const opciones = opcionesTallaArticulo(catalogos, id);
    const delEsquema = catalogos.esquemas.find((e) => e.id === id)?.tallas ?? [];
    if (id === inicial.esquemaConteo && inicial.tallas.length) {
      setTallas(inicial.tallas.filter((t) => estaElegido(opciones, t)));
      return;
    }
    setTallas(delEsquema.filter((t) => estaElegido(opciones, t)));
  }

  function resetAlCerrar() {
    setPaso("elegir");
    setPassword("");
    setError("");
    setGuardando(false);
    onCerrar();
  }

  function pedirClave() {
    if (catalogos.esquemas.length === 0) {
      setError("No hay esquemas. Ármalos en Configuración.");
      return;
    }
    if (!esquemaId) {
      setError("Elige el esquema que mejor le queda a este artículo.");
      return;
    }
    setError("");
    setPassword("");
    setPaso("clave");
  }

  async function confirmar(e: React.FormEvent) {
    e.preventDefault();
    if (!password) {
      setError("Escribe tu contraseña.");
      return;
    }
    setGuardando(true);
    setError("");
    try {
      await onGuardar(
        {
          esquemaConteo: esquemaId,
          colores,
          tallas,
          especificaciones,
        },
        password,
      );
      resetAlCerrar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog
      open={abierto}
      onOpenChange={(open) => {
        if (!open) resetAlCerrar();
      }}
    >
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        {paso === "elegir" ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <DialogHeader className="space-y-2 p-4 pb-2 text-left">
              <DialogTitle>Agregar esquemas</DialogTitle>
              <DialogDescription>
                Elige el esquema ya armado en Configuración que mejor le queda a
                este artículo. Es el mismo para existencias, pedidos y
                recepción. Clave y nombre no se tocan aquí.
              </DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3">
              {catalogos.esquemas.length === 0 ? (
                <EmptyView
                  titulo="No hay esquemas"
                  detalle="Ármalos en Configuración. Aquí solo se elige, no se crea uno nuevo."
                />
              ) : (
                <section className="space-y-2">
                  <Label>Esquema que mejor le queda</Label>
                  <div className="flex flex-col gap-2">
                    {catalogos.esquemas.map((e) => (
                      <Button
                        key={e.id}
                        type="button"
                        variant={e.id === esquemaId ? "default" : "outline"}
                        className="h-11 w-full justify-start"
                        aria-pressed={e.id === esquemaId}
                        onClick={() => aplicarEsquema(e.id)}
                      >
                        {e.nombre}
                      </Button>
                    ))}
                  </div>
                </section>
              )}

              {esquemaId ? (
                <>
                  <section className="space-y-2">
                    <Label>Colores de este artículo</Label>
                    <ChipCatalogo
                      items={catalogos.colores}
                      elegidos={colores}
                      onToggle={(valor) =>
                        setColores(
                          alternarDeCatalogo(catalogos.colores, colores, valor),
                        )
                      }
                      vacio="No hay colores en Configuración. Ármalos ahí."
                    />
                  </section>
                  <section className="space-y-2">
                    <Label>Tallas de este artículo</Label>
                    <ChipCatalogo
                      items={opcionesTalla}
                      elegidos={tallas}
                      onToggle={(valor) =>
                        setTallas(
                          alternarDeCatalogo(opcionesTalla, tallas, valor),
                        )
                      }
                      vacio="Este esquema no usa talla. Solo color y cantidad."
                    />
                  </section>
                  <section className="space-y-2">
                    <Label>Especificaciones</Label>
                    <ChipCatalogo
                      items={catalogos.especificaciones}
                      elegidos={especificaciones}
                      onToggle={(valor) =>
                        setEspecificaciones(
                          alternarDeCatalogo(
                            catalogos.especificaciones,
                            especificaciones,
                            valor,
                          ),
                        )
                      }
                      vacio="No hay especificaciones en Configuración. Se puede guardar sin ellas."
                    />
                  </section>
                  <aside className="space-y-1 rounded-xl bg-teal-50 p-3 text-sm text-teal-950 ring-1 ring-teal-200">
                    <p className="font-semibold">Así se cuenta</p>
                    <p>{resumen.esquemaNombre}</p>
                    <p>
                      Colores: {textoLista(resumen.colores, "ninguno aún")}
                    </p>
                    <p>
                      {resumen.sinTalla
                        ? "Tallas: no usa talla."
                        : `Tallas: ${textoLista(resumen.tallas, "")}`}
                    </p>
                  </aside>
                </>
              ) : null}

              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
            <DialogFooter className="flex-row gap-2 border-t p-4 sm:justify-stretch">
              <Button
                type="button"
                variant="outline"
                className="h-11 flex-1"
                onClick={resetAlCerrar}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="h-11 flex-1"
                disabled={catalogos.esquemas.length === 0}
                onClick={pedirClave}
              >
                Continuar
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={(e) => void confirmar(e)} className="grid gap-4 p-4">
            <DialogHeader className="text-left">
              <DialogTitle>Guardar esquema</DialogTitle>
              <DialogDescription>
                Vas a dejar {resumen.esquemaNombre} para existencias, pedidos y
                recepción. Escribe tu contraseña de administradora. Si te
                equivocas, no se guarda.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="clave-agregar-esquema">Tu contraseña</Label>
              <Input
                id="clave-agregar-esquema"
                type="password"
                autoComplete="current-password"
                className="h-11"
                autoFocus
                value={password}
                aria-invalid={Boolean(error)}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError("");
                }}
              />
              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
            <DialogFooter className="sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full sm:w-auto"
                disabled={guardando}
                onClick={() => {
                  setPaso("elegir");
                  setPassword("");
                  setError("");
                }}
              >
                Atrás
              </Button>
              <Button
                type="submit"
                className="h-11 w-full sm:w-auto"
                disabled={guardando}
              >
                {guardando ? "Comprobando…" : "Guardar esquema"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
