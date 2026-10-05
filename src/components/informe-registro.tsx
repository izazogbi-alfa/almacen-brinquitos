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

const FOTO_INFORME_MM = 25;

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
  completo = false,
  ocultarPortada = false,
  partes,
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
  /** Al armar el archivo: la hoja usa el ancho de la carta y aprieta el espacio vacío. */
  completo?: boolean;
  /** Hojas de continuación: sin el título del pedido. */
  ocultarPortada?: boolean;
  /** Recorte de cada bloque. Si falta, se imprime completo. */
  partes?: ParteBloque[];
}) {
  return (
    <article
      className={cn(
        "min-h-full bg-[#f8fafc]",
        completo ? "w-full p-3" : "p-4 sm:p-6",
      )}
    >
      {ocultarPortada ? null : (
      <header
        data-pdf-corte=""
        className={cn(
          "flex flex-wrap items-end justify-between gap-2 border-b border-slate-200",
          completo ? "mb-2 pb-2" : "mb-4 pb-3",
        )}
      >
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
      )}
      {!ocultarPortada && notas.length > 0 ? (
        <ul className={cn("space-y-1 text-sm text-slate-600", completo ? "mb-2" : "mb-4")}>
          {notas.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      ) : null}
      <div className={completo ? "space-y-2" : "space-y-4"}>
        {bloques.map((bloque, i) => (
          <BloqueInforme
            key={`${bloque.key}-${i}`}
            bloque={bloque}
            claveSolo={claveSolo}
            columnaCodProveedor={columnaCodProveedor}
            completo={completo}
            parte={partes?.[i]}
          />
        ))}
      </div>
    </article>
  );
}

type ParteBloque = {
  desde: number;
  hasta: number;
  foto: boolean;
  totales: boolean;
};

function BloqueInforme({
  bloque,
  claveSolo,
  columnaCodProveedor,
  completo,
  parte,
}: {
  bloque: BloquePrenda;
  claveSolo: boolean;
  columnaCodProveedor?: boolean;
  completo: boolean;
  parte?: ParteBloque;
}) {
  const tallas = bloque.tallas.length ? bloque.tallas : ["Cant."];
  const headersTalla = encabezadosColumnaTalla(tallas, tituloTalla);
  const totales = totalesDeBloque({ ...bloque, tallas });
  const identidad = lineaClaveNombre(bloque.sku, bloque.nombre);
  const detallado = parseEstiloPdf(bloque.estiloPdf) === "detallado";
  const desde = parte?.desde ?? 0;
  const hasta = parte?.hasta ?? bloque.filas.length;
  const filas = bloque.filas.slice(desde, hasta);
  const mostrarFoto = parte ? parte.foto : Boolean(bloque.foto);
  const mostrarTotales = parte ? parte.totales : true;
  const py = completo ? "py-1.5" : "py-2";
  return (
    <section data-pdf-bloque="" className="overflow-hidden rounded-lg border border-teal-600">
      <div data-pdf-clave="" className="flex items-stretch gap-[1.5mm]">
        <div
          className="flex min-w-0 flex-1 flex-col justify-center bg-teal-700 px-3 py-2 text-white"
          style={mostrarFoto && bloque.foto ? { minHeight: `${FOTO_INFORME_MM}mm` } : undefined}
        >
          <p className="font-heading text-lg font-semibold tracking-wide">
            {bloque.sku}
          </p>
          {claveSolo ? null : bloque.sucursalNombre ? (
            <p className="text-sm text-teal-100">{bloque.sucursalNombre}</p>
          ) : null}
        </div>
        {mostrarFoto && bloque.foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bloque.foto}
            alt=""
            className="h-[25mm] w-[25mm] shrink-0 bg-white object-contain"
          />
        ) : null}
      </div>
      {!detallado ? (
        <p
          data-pdf-corte=""
          className={cn("border-b bg-white px-3 text-sm font-semibold text-slate-900", py)}
        >
          {identidad}
        </p>
      ) : null}
      <div className={completo ? "bg-white" : "overflow-x-auto bg-white"}>
        <table
          className={cn(
            "border-collapse text-sm",
            completo ? "w-full" : "w-full min-w-max",
          )}
        >
          <thead>
            <tr>
              <th
                className={cn(
                  "sticky left-0 z-10 bg-teal-800 px-2 text-left font-semibold text-white",
                  py,
                  detallado && "max-w-[55mm]",
                )}
              >
                Color
              </th>
              {columnaCodProveedor ? (
                <th className={cn("bg-teal-800 px-2 text-center font-semibold whitespace-nowrap text-white", py)}>
                  Cód. proveedor
                </th>
              ) : null}
              {headersTalla.map((h, i) => (
                <th
                  key={`${tallas[i]}-${h}`}
                  className={cn("min-w-12 bg-amber-600 px-2 text-center font-semibold text-white", py)}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((fila, i) => (
              <tr key={fila.keys.join("-")} data-pdf-fila="">
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
                      "px-2 text-center tabular-nums",
                      py,
                      i % 2 === 0 ? "bg-teal-50" : "bg-white",
                    )}
                  >
                    {cantidadPdf(fila.porTalla[t])}
                  </td>
                ))}
              </tr>
            ))}
            {mostrarTotales ? (
            <tr data-pdf-cierre="">
              <td className={cn("sticky left-0 z-10 bg-teal-900 px-2 font-semibold text-white", py)}>
                Total
              </td>
              {columnaCodProveedor ? (
                <td className="bg-teal-900 px-2" />
              ) : null}
              {tallas.map((t) => (
                <td
                  key={`tot-${t}`}
                  className={cn(
                    "bg-teal-900 px-2 text-center font-semibold tabular-nums text-white",
                    py,
                  )}
                >
                  {cantidadPdf(totales.porTalla[t])}
                </td>
              ))}
            </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {mostrarTotales ? (
      <p
        data-pdf-cierre=""
        className={cn("bg-white px-3 text-sm font-semibold text-slate-700", py)}
      >
        Total piezas: {totales.piezas}
      </p>
      ) : null}
    </section>
  );
}
