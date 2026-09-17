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

export async function verificarContrasenaSesion(password: string) {
  const res = await fetch("/api/auth/verificar-contrasena", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ password }),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? "Contraseña incorrecta. No se quitó.");
  }
}

export function DialogQuitarConClave({
  abierto,
  titulo,
  descripcion,
  idCampo,
  onNo,
  onSi,
}: {
  abierto: boolean;
  titulo: string;
  descripcion: string;
  idCampo: string;
  onNo: () => void;
  onSi: () => void | Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const [errorClave, setErrorClave] = useState("");
  const [verificando, setVerificando] = useState(false);

  function cerrar() {
    setPassword("");
    setErrorClave("");
    onNo();
  }

  async function confirmarSi(e: React.FormEvent) {
    e.preventDefault();
    if (!password) {
      setErrorClave("Escribe tu contraseña.");
      return;
    }
    setVerificando(true);
    setErrorClave("");
    try {
      await verificarContrasenaSesion(password);
      setPassword("");
      await onSi();
    } catch (err) {
      setErrorClave(
        err instanceof Error ? err.message : "Contraseña incorrecta. No se quitó.",
      );
    } finally {
      setVerificando(false);
    }
  }

  return (
    <Dialog
      open={abierto}
      onOpenChange={(abiertoAhora) => {
        if (!abiertoAhora) cerrar();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form onSubmit={(e) => void confirmarSi(e)} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{titulo}</DialogTitle>
            <DialogDescription>{descripcion}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={idCampo}>Tu contraseña</Label>
            <Input
              id={idCampo}
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
              disabled={verificando}
              onClick={cerrar}
            >
              No
            </Button>
            <Button
              type="submit"
              variant="destructive"
              className="h-11 w-full sm:w-auto"
              disabled={verificando}
            >
              {verificando ? "Comprobando…" : "Sí"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
