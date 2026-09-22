"use client";

import { FileDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyView } from "@/components/status-views";
import { descargarPdfBloques, encabezadoInforme } from "@/lib/pdf";
import { useInventory } from "@/lib/inventory-context";
import { formatoFecha } from "@/lib/format";
import {
  bloquesDesdeLineasColor,
  etiquetaColor,
  type BloquePrenda,
  type LineaColorTabla,
} from "@/lib/tabla-bloques";
import { cn } from "@/lib/utils";

export function TablaPrendas({
  lineas,
  onQuitarFila,
  pdfArchivo,
  pdfTitulo,
  pdfNotas,
  pdfClaveSolo,
  pdfModulo = "existencias",
  vacioDetalle,
  acento,
  mostrarPdf = true,
}: {
  lineas: LineaColorTabla[];
  onQuitarFila?: (keys: string[]) => void;
  pdfArchivo: string;
  pdfTitulo: string;
  pdfNotas?: string[];
  /** Solo existencias: franja verde con la Clave, sin esquema. */
  pdfClaveSolo?: boolean;
  pdfModulo?: "existencias" | "recepcion" | "pedidos";
  vacioDetalle: string;
  acento?: "azul" | "verde";
  mostrarPdf?: boolean;
}) {
  const { productos, catalogos, user } = useInventory();
  const bloques = bloquesDesdeLineasColor(lineas, { productos, catalogos });
  const verde = acento === "verde";
  const conPdf = mostrarPdf;
  const esPedido = pdfModulo === "pedidos";

  function pdf() {
    const sucursal = lineas.find((l) => l.sucursalNombre)?.sucursalNombre;
    descargarPdfBloques(
      pdfArchivo,
      pdfTitulo,
      pdfNotas ?? [],
      bloques,
      encabezadoInforme(catalogos, {
        tituloDoc: pdfTitulo.replace(/^Brinquitos\s*·\s*/i, "") || pdfTitulo,
        sucursal,
        fecha: formatoFecha(new Date().toISOString()),
        quien: user?.nombre,
        claveSolo: pdfClaveSolo,
        columnaCodProveedor: esPedido,
      }),
    );
  }

  if (lineas.length === 0) {
    return (
      <EmptyView
        titulo="Todavía no hay líneas"
        detalle={vacioDetalle}
      />
    );
  }

  return (
    <div className="space-y-3">
      {bloques.map((bloque) => (
        <BloqueTabla
          key={bloque.key}
          bloque={bloque}
          onQuitarFila={onQuitarFila}
        />
      ))}
      {conPdf ? (
        <Button
          type="button"
          variant="outline"
          className={cn(
            "h-11 w-full",
            verde && "border-emerald-700 text-emerald-800",
          )}
          onClick={pdf}
        >
          <FileDown className="mr-2 size-4" />
          Descargar PDF de esta tabla
        </Button>
      ) : null}
    </div>
  );
}

function BloqueTabla({
  bloque,
  onQuitarFila,
}: {
  bloque: BloquePrenda;
  onQuitarFila?: (keys: string[]) => void;
}) {
  return (
    <article className="overflow-hidden rounded-xl border">
      <header className="border-b bg-muted/50 px-3 py-2">
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          Clave
        </p>
        <p className="font-heading text-lg leading-tight font-semibold">
          {bloque.sku}
        </p>
        <p className="text-sm text-muted-foreground">{bloque.nombre}</p>
        {bloque.sucursalNombre ? (
          <p className="text-xs text-muted-foreground">{bloque.sucursalNombre}</p>
        ) : null}
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-max border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="sticky left-0 z-10 bg-muted/90 px-2 py-2 text-left font-medium">
                Color
              </th>
              {bloque.tallas.map((t) => (
                <th
                  key={t}
                  className="min-w-12 px-2 py-2 text-center font-medium"
                >
                  {t || "Cant."}
                </th>
              ))}
              {onQuitarFila ? <th className="w-10 p-0" /> : null}
            </tr>
          </thead>
          <tbody>
            {bloque.filas.map((fila) => (
              <tr key={fila.keys.join("-")} className="border-b last:border-0">
                <td className="sticky left-0 z-10 bg-background px-2 py-2 font-medium">
                  {etiquetaColor(fila)}
                </td>
                {bloque.tallas.map((t) => (
                  <td
                    key={`${fila.keys[0]}-${t}`}
                    className="px-2 py-2 text-center tabular-nums"
                  >
                    {fila.porTalla[t] ?? ""}
                  </td>
                ))}
                {onQuitarFila ? (
                  <td className="px-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Quitar ${fila.color}`}
                      onClick={() => onQuitarFila(fila.keys)}
                    >
                      <Trash2 />
                    </Button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}
