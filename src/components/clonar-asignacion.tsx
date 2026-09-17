"use client";

import { useMemo, useState } from "react";
import { Check } from "lucide-react";
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
import { FotoProducto } from "@/components/foto-producto";
import { filtrarArticulos, ordenarArticulos } from "@/lib/articulos-lista";
import type { Producto } from "@/lib/types";
import { cn } from "@/lib/utils";

export function DialogClonarAsignacion({
  abierto,
  origenId,
  origenEtiqueta,
  esquemaNombre,
  productos,
  onCerrar,
  onClonar,
}: {
  abierto: boolean;
  origenId?: string;
  origenEtiqueta: string;
  esquemaNombre: string;
  productos: Producto[];
  onCerrar: () => void;
  onClonar: (ids: string[], password: string) => Promise<void>;
}) {
  const [q, setQ] = useState("");
  const [elegidos, setElegidos] = useState<string[]>([]);
  const [paso, setPaso] = useState<"elegir" | "clave">("elegir");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const candidatos = useMemo(
    () =>
      ordenarArticulos(
        productos.filter((p) => p.id !== origenId),
        "nombre",
      ),
    [productos, origenId],
  );
  const filtrados = useMemo(
    () => filtrarArticulos(candidatos, q),
    [candidatos, q],
  );

  function resetAlCerrar() {
    setQ("");
    setElegidos([]);
    setPaso("elegir");
    setPassword("");
    setError("");
    setGuardando(false);
    onCerrar();
  }

  function alternar(id: string) {
    setElegidos((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
    if (error) setError("");
  }

  function pedirClave() {
    if (elegidos.length === 0) {
      setError("Elige al menos un artículo.");
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
      await onClonar(elegidos, password);
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
              <DialogTitle>Clonar a otros artículos</DialogTitle>
              <DialogDescription>
                Copia el esquema {esquemaNombre} y sus colores, tallas y
                especificaciones de {origenEtiqueta}. Clave y nombre de los
                otros no cambian. Existencias, pedidos y recepción usarán lo
                mismo.
              </DialogDescription>
            </DialogHeader>
            {candidatos.length === 0 ? (
              <div className="px-4 pb-4">
                <EmptyView
                  titulo="No hay otros artículos"
                  detalle="Da de alta más productos para copiar este esquema."
                />
              </div>
            ) : (
              <>
                <div className="space-y-2 px-4">
                  <Label htmlFor="buscar-clonar">Buscar por Clave o nombre</Label>
                  <Input
                    id="buscar-clonar"
                    className="h-11"
                    placeholder="Ej. XC1092 o camisa"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    {elegidos.length === 0
                      ? "Ninguno elegido aún."
                      : `${elegidos.length} artículo${elegidos.length === 1 ? "" : "s"} para copiar.`}
                  </p>
                  {error ? (
                    <p className="text-sm text-destructive" role="alert">
                      {error}
                    </p>
                  ) : null}
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                  {filtrados.length === 0 ? (
                    <EmptyView
                      titulo="Nada coincide"
                      detalle={`No hay Clave ni nombre con “${q}”. Prueba otra palabra.`}
                    />
                  ) : (
                    <ul className="space-y-2">
                      {filtrados.map((p) => {
                        const activo = elegidos.includes(p.id);
                        return (
                          <li key={p.id}>
                            <button
                              type="button"
                              className={cn(
                                "flex w-full items-center gap-3 rounded-xl border p-3 text-left",
                                activo && "border-teal-700 ring-2 ring-teal-700/20",
                              )}
                              aria-pressed={activo}
                              onClick={() => alternar(p.id)}
                            >
                              <FotoProducto
                                src={p.foto}
                                alt={p.nombre}
                                className="size-12 max-h-12 shrink-0 object-cover"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium tracking-wide text-teal-800 uppercase">
                                  Clave {p.sku}
                                </p>
                                <p className="font-medium leading-tight">
                                  {p.nombre}
                                </p>
                              </div>
                              {activo ? (
                                <Check className="size-5 shrink-0 text-teal-800" />
                              ) : null}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </>
            )}
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
                disabled={candidatos.length === 0}
                onClick={pedirClave}
              >
                Continuar
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={(e) => void confirmar(e)} className="grid gap-4 p-4">
            <DialogHeader className="text-left">
              <DialogTitle>Confirmar copia</DialogTitle>
              <DialogDescription>
                Vas a copiar {esquemaNombre} y sus listas a {elegidos.length}{" "}
                artículo{elegidos.length === 1 ? "" : "s"}. Clave y nombre no
                se tocan. Escribe tu contraseña de administradora.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="clave-clonar-articulo">Tu contraseña</Label>
              <Input
                id="clave-clonar-articulo"
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
                {guardando ? "Comprobando…" : "Copiar esquema"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
