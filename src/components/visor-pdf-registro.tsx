"use client";

import { useMemo, useState } from "react";
import { FileDown, FileSearch } from "lucide-react";
import { toast } from "sonner";
import { InformeRegistro } from "@/components/informe-registro";
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
import { notasPdfInforme } from "@/lib/pdf-clave";
import {
  descargarPdfDeRegistro,
  lineasDeRegistro,
  mensajeRegistroSinLineas,
  opcionesPdfRegistro,
  registroTieneLineas,
  tituloDocRegistro,
} from "@/lib/pdf-registro";
import type { SesionCaptura } from "@/lib/sesion-captura";
import { bloquesDesdeLineasColor } from "@/lib/tabla-bloques";

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
    if (sinLineas()) return;
    setViendo(true);
  }

  function descargar() {
    if (sinLineas()) return;
    try {
      descargarPdfDeRegistro(sesion, { catalogos, productos });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "No se pudo armar el PDF. Inténtalo otra vez.";
      setAviso(msg);
      toast.error(msg);
    }
  }

  return (
    <div className="mt-3 w-full space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" className="h-12" onClick={ver}>
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
  const tiene = registroTieneLineas(sesion);
  const opts = opcionesPdfRegistro(sesion);
  const bloques = useMemo(() => {
    if (!tiene) return [];
    return bloquesDesdeLineasColor(lineasDeRegistro(sesion), {
      productos,
      catalogos,
    });
  }, [tiene, sesion, productos, catalogos]);
  const notas = notasPdfInforme(opts.notas, opts.claveSolo);
  const titulo = tituloDocRegistro(sesion);

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent
        showCloseButton
        className="flex h-[min(94dvh,900px)] w-[min(96vw,1100px)] max-w-[min(96vw,1100px)] flex-col gap-3 overflow-hidden p-3 sm:max-w-[min(96vw,1100px)] sm:p-4"
      >
        <DialogHeader className="pr-8">
          <DialogTitle>PDF · {titulo}</DialogTitle>
          <DialogDescription>
            El PDF sigue el esquema de la prenda (compacto o detallado). En
            existencias la franja verde solo lleva la Clave. En el teléfono
            gira la pantalla si se ve chico.
          </DialogDescription>
        </DialogHeader>
        {!tiene ? (
          <EmptyView titulo="Sin PDF" detalle={mensajeRegistroSinLineas()} />
        ) : (
          <div className="min-h-0 flex-1 overflow-auto rounded-lg border">
            <InformeRegistro
              titulo={opts.tituloDoc}
              empresa={catalogos.empresaNombre}
              sucursal={opts.sucursal}
              fecha={opts.fecha}
              quien={opts.quien}
              notas={notas}
              bloques={bloques}
              claveSolo={opts.claveSolo}
              columnaCodProveedor={sesion.modulo === "pedidos"}
            />
          </div>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" className="h-11" onClick={onCerrar}>
            Cerrar
          </Button>
          {tiene ? (
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
