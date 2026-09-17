"use client";

import { useState } from "react";
import { verificarContrasenaSesion } from "@/components/dialog-quitar-con-clave";
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
import type { UsuarioPublico } from "@/lib/types";

export function DialogCambiarContrasena({
  abierto,
  persona,
  onCerrar,
  onGuardar,
}: {
  abierto: boolean;
  persona: UsuarioPublico | null;
  onCerrar: () => void;
  onGuardar: (nueva: string, claveAdmin: string) => Promise<void>;
}) {
  const [nueva, setNueva] = useState("");
  const [repite, setRepite] = useState("");
  const [claveAdmin, setClaveAdmin] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  function limpiar() {
    setNueva("");
    setRepite("");
    setClaveAdmin("");
    setError("");
  }

  function cerrar() {
    limpiar();
    onCerrar();
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!nueva) {
      setError("Escribe la contraseña nueva.");
      return;
    }
    if (nueva !== repite) {
      setError("Las dos nuevas no coinciden. No se cambió.");
      return;
    }
    if (!claveAdmin) {
      setError("Escribe tu contraseña (la de ahora).");
      return;
    }
    setGuardando(true);
    setError("");
    try {
      await verificarContrasenaSesion(claveAdmin);
      await onGuardar(nueva, claveAdmin);
      limpiar();
    } catch (err) {
      const crudo = err instanceof Error ? err.message : "";
      const pareceClaveMala =
        /contraseña incorrecta/i.test(crudo) || /no se quitó/i.test(crudo);
      setError(
        pareceClaveMala
          ? "Contraseña incorrecta. No se cambió."
          : crudo || "No se cambió la contraseña.",
      );
    } finally {
      setGuardando(false);
    }
  }

  const nombre = persona?.nombre ?? "";
  const username = persona?.username ?? "";

  return (
    <Dialog
      open={abierto}
      onOpenChange={(abiertoAhora) => {
        if (!abiertoAhora) cerrar();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form onSubmit={(e) => void guardar(e)} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Cambiar contraseña</DialogTitle>
            <DialogDescription>
              {persona
                ? `Nueva clave para «${nombre}» (@${username}). Escríbela dos veces. Para guardar, tu contraseña de ahora (quien está dentro). Si te equivocas, no cambia.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="clave-nueva-persona">Contraseña nueva</Label>
              <Input
                id="clave-nueva-persona"
                type="password"
                autoComplete="new-password"
                className="h-11"
                autoFocus
                value={nueva}
                aria-invalid={Boolean(error)}
                onChange={(e) => {
                  setNueva(e.target.value);
                  if (error) setError("");
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clave-nueva-repite">Repite la nueva</Label>
              <Input
                id="clave-nueva-repite"
                type="password"
                autoComplete="new-password"
                className="h-11"
                value={repite}
                aria-invalid={Boolean(error)}
                onChange={(e) => {
                  setRepite(e.target.value);
                  if (error) setError("");
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clave-admin-ahora">Tu contraseña (la de ahora)</Label>
              <Input
                id="clave-admin-ahora"
                type="password"
                autoComplete="current-password"
                className="h-11"
                value={claveAdmin}
                aria-invalid={Boolean(error)}
                onChange={(e) => {
                  setClaveAdmin(e.target.value);
                  if (error) setError("");
                }}
              />
            </div>
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
              onClick={cerrar}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="h-11 w-full sm:w-auto"
              disabled={guardando}
            >
              {guardando ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
