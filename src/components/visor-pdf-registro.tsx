"use client";

import { useEffect, useState } from "react";
import { FileDown, FileSearch } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyView } from "@/components/status-views";
import { useInventory } from "@/lib/inventory-context";
import {
  blobPdfDeRegistro,
  descargarPdfDeRegistro,
  mensajeRegistroSinLineas,
  registroTieneLineas,
  tituloDocRegistro,
} from "@/lib/pdf-registro";
import type { SesionCaptura } from "@/lib/sesion-captura";

export function AccionesPdfRegistro({ sesion }: { sesion: SesionCaptura }) {
  const { catalogos, productos } = useInventory();
  const [viendo, setViendo] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  function sinLineas(): boolean {
    if (registroTieneLineas(sesion)) {
      setAviso(null);
      return false;
    }
    const msg = mensajeRegistroSinLineas();
    setAviso(msg);
    toast.error(msg);
    return true;
  }

  function ver() {
    if (sinLineas()) {
      setViendo(true);
      return;
    }
    setViendo(true);
  }

  function descargar() {
    if (sinLineas()) return;
    try {
      descargarPdfDeRegistro(sesion, { catalogos, productos });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "No se pudo armar el PDF. Inténtalo otra vez.";
      setAviso(msg);
      toast.error(msg);
    }
  }

  return (
    <div className="mt-3 w-full space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          className="h-12"
          onClick={ver}
        >
          <FileSearch className="mr-2 size-4 shrink-0" />
          Ver PDF
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-12"
          onClick={descargar}
        >
          <FileDown className="mr-2 size-4 shrink-0" />
          Descargar PDF
        </Button>
      </div>
      {aviso ? (
        <p className="text-sm font-medium text-destructive" role="alert">
          {aviso}
        </p>
      ) : null}
      <VisorPdfRegistro
        abierto={viendo}
        sesion={sesion}
        onCerrar={() => setViendo(false)}
      />
    </div>
  );
}

function VisorPdfRegistro({
  abierto,
  sesion,
  onCerrar,
}: {
  abierto: boolean;
  sesion: SesionCaptura;
  onCerrar: () => void;
}) {
  const { catalogos, productos } = useInventory();
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!abierto) {
      setUrl(null);
      setError(null);
      return;
    }
    if (!registroTieneLineas(sesion)) {
      setError(mensajeRegistroSinLineas());
      setUrl(null);
      return;
    }
    let revoke: string | null = null;
    try {
      const blob = blobPdfDeRegistro(sesion, { catalogos, productos });
      const next = URL.createObjectURL(blob);
      revoke = next;
      setUrl(next);
      setError(null);
    } catch (err) {
      setUrl(null);
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo armar el PDF. Inténtalo otra vez.",
      );
    }
    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [abierto, sesion, catalogos, productos]);

  const titulo = tituloDocRegistro(sesion);

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent
        showCloseButton
        className="flex h-[min(94dvh,880px)] w-[min(96vw,1100px)] max-w-none flex-col gap-3 overflow-hidden p-3 sm:p-4"
      >
        <DialogHeader className="pr-8">
          <DialogTitle>PDF · {titulo}</DialogTitle>
          <DialogDescription>
            Carta horizontal, igual que el archivo. En el teléfono gira la
            pantalla si se ve chico. Cierra con la X.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <EmptyView titulo="Sin PDF" detalle={error} />
        ) : url ? (
          <div className="min-h-0 flex-1 overflow-hidden rounded-lg border bg-zinc-200">
            <iframe
              title={`PDF ${titulo}`}
              src={url}
              className="h-full min-h-[52dvh] w-full bg-zinc-200 sm:min-h-[62dvh]"
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Armando el PDF…</p>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" className="h-11" onClick={onCerrar}>
            Cerrar
          </Button>
          {url ? (
            <Button
              type="button"
              className="h-11"
              onClick={() => {
                try {
                  descargarPdfDeRegistro(sesion, { catalogos, productos });
                } catch (err) {
                  toast.error(
                    err instanceof Error
                      ? err.message
                      : "No se pudo descargar.",
                  );
                }
              }}
            >
              <FileDown className="mr-2 size-4" />
              Descargar PDF
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
