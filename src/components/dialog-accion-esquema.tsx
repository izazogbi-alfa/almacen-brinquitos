"use client";

import { Copy, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { EsquemaCatalogo } from "@/lib/types";

export function DialogAccionEsquema({
  esquema,
  abierto,
  onCerrar,
  onEditar,
  onClonar,
}: {
  esquema: EsquemaCatalogo | null;
  abierto: boolean;
  onCerrar: () => void;
  onEditar: () => void;
  onClonar: () => void;
}) {
  return (
    <Dialog
      open={abierto}
      onOpenChange={(open) => {
        if (!open) onCerrar();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{esquema?.nombre ?? "Esquema"}</DialogTitle>
          <DialogDescription>
            Este esquema ya está guardado. ¿Lo editas en su lugar o haces una
            copia nueva? Cancelar no cambia nada.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Button
            type="button"
            className="h-12 w-full justify-start gap-2"
            onClick={onEditar}
          >
            <Pencil className="size-4 shrink-0" />
            Editar
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-12 w-full justify-start gap-2"
            onClick={onClonar}
          >
            <Copy className="size-4 shrink-0" />
            Clonar esquema
          </Button>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            className="h-11 w-full"
            onClick={onCerrar}
          >
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
