import {
  cantidadPdf,
  encabezadosColumnaTalla,
} from "@/lib/captura-tallas";
import {
  etiquetaColor,
  totalesDeBloque,
  type BloquePrenda,
} from "@/lib/tabla-bloques";
import { lineaClaveNombre } from "@/lib/pdf-celda";
import { parseEstiloPdf } from "@/lib/pdf-estilo";
import { tituloTalla } from "@/lib/titulo-etiqueta";
import { cn } from "@/lib/utils";

export function InformeRegistro({
  titulo,
  empresa,
  sucursal,
  fecha,
  quien,
  notas,
  bloques,
  claveSolo,
  columnaCodProveedor,
}: {
  titulo: string;
  empresa?: string;
  sucursal?: string;
  fecha?: string;
  quien?: string;
  notas: string[];
  bloques: BloquePrenda[];
  claveSolo: boolean;
  columnaCodProveedor?: boolean;
}) {
  return (
    <article className="min-h-full bg-[#f8fafc] p-4 sm:p-6">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-2 border-b border-slate-200 pb-3">
        <div>
          <p className="font-heading text-xl font-semibold text-slate-900">
            {empresa || "Brinquitos"}
          </p>
          <p className="text-sm text-slate-600">
            {[sucursal, fecha].filter(Boolean).join("  ·  ")}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-slate-800">{titulo}</p>
          {quien ? (
            <p
              className={cn(
                "text-sm text-slate-600",
                /pedido/i.test(titulo) && "font-semibold text-slate-900",
              )}
            >
              Hecho por: {quien}
            </p>
          ) : null}
        </div>
      </header>
      {notas.length > 0 ? (
        <ul className="mb-4 space-y-1 text-sm text-slate-600">
          {notas.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      ) : null}
      <div className="space-y-4">
        {bloques.map((bloque) => (
          <BloqueInforme
            key={bloque.key}
            bloque={bloque}
            claveSolo={claveSolo}
            columnaCodProveedor={columnaCodProveedor}
          />
        ))}
      </div>
    </article>
  );
}

function BloqueInforme({
  bloque,
  claveSolo,
  columnaCodProveedor,
}: {
  bloque: BloquePrenda;
  claveSolo: boolean;
  columnaCodProveedor?: boolean;
}) {
  const tallas = bloque.tallas.length ? bloque.tallas : ["Cant."];
  const headersTalla = encabezadosColumnaTalla(tallas, tituloTalla);
  const totales = totalesDeBloque({ ...bloque, tallas });
  const identidad = lineaClaveNombre(bloque.sku, bloque.nombre);
  const detallado = parseEstiloPdf(bloque.estiloPdf) === "detallado";
  return (
    <section className="overflow-hidden rounded-lg border border-teal-600">
      <div className="bg-teal-700 px-3 py-2 text-white">
        <p className="font-heading text-lg font-semibold tracking-wide">
          {bloque.sku}
        </p>
        {claveSolo ? null : bloque.sucursalNombre ? (
          <p className="text-sm text-teal-100">{bloque.sucursalNombre}</p>
        ) : null}
      </div>
      {!detallado ? (
        <p className="border-b bg-white px-3 py-2 text-sm font-semibold text-slate-900">
          {identidad}
        </p>
      ) : null}
      <div className="overflow-x-auto bg-white">
        <table className="w-full min-w-max border-collapse text-sm">
          <thead>
            <tr>
              <th
                className={cn(
                  "sticky left-0 z-10 bg-teal-800 px-2 py-2 text-left font-semibold text-white",
                  detallado && "max-w-[55mm]",
                )}
              >
                Color
              </th>
              {columnaCodProveedor ? (
                <th className="bg-teal-800 px-2 py-2 text-center font-semibold whitespace-nowrap text-white">
                  Cód. proveedor
                </th>
              ) : null}
              {headersTalla.map((h, i) => (
                <th
                  key={`${tallas[i]}-${h}`}
                  className="min-w-12 bg-amber-600 px-2 py-2 text-center font-semibold text-white"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bloque.filas.map((fila, i) => (
              <tr key={fila.keys.join("-")}>
                <td
                  className={cn(
                    "sticky left-0 z-10 bg-orange-50 px-2 py-1.5",
                    detallado && "max-w-[55mm]",
                  )}
                >
                  <p className="font-medium leading-tight">
                    {etiquetaColor(fila)}
                  </p>
                  {detallado ? (
                    <p className="text-[11px] leading-tight text-slate-600">
                      {identidad}
                    </p>
                  ) : null}
                </td>
                {columnaCodProveedor ? (
                  <td className="px-2 py-1.5 text-center text-xs text-slate-700">
                    {bloque.codigoProveedor || ""}
                  </td>
                ) : null}
                {tallas.map((t) => (
                  <td
                    key={`${fila.keys[0]}-${t}`}
                    className={cn(
                      "px-2 py-2 text-center tabular-nums",
                      i % 2 === 0 ? "bg-teal-50" : "bg-white",
                    )}
                  >
                    {cantidadPdf(fila.porTalla[t])}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td className="sticky left-0 z-10 bg-teal-900 px-2 py-2 font-semibold text-white">
                Total
              </td>
              {columnaCodProveedor ? (
                <td className="bg-teal-900 px-2 py-2" />
              ) : null}
              {tallas.map((t) => (
                <td
                  key={`tot-${t}`}
                  className="bg-teal-900 px-2 py-2 text-center font-semibold tabular-nums text-white"
                >
                  {cantidadPdf(totales.porTalla[t])}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="bg-white px-3 py-2 text-sm font-semibold text-slate-700">
        Total piezas: {totales.piezas}
      </p>
    </section>
  );
}
