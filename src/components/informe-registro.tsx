import {
  etiquetaColor,
  totalesDeBloque,
  type BloquePrenda,
} from "@/lib/tabla-bloques";
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
}: {
  titulo: string;
  empresa?: string;
  sucursal?: string;
  fecha?: string;
  quien?: string;
  notas: string[];
  bloques: BloquePrenda[];
  claveSolo: boolean;
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
          />
        ))}
      </div>
    </article>
  );
}

function BloqueInforme({
  bloque,
  claveSolo,
}: {
  bloque: BloquePrenda;
  claveSolo: boolean;
}) {
  const tallas = bloque.tallas.length ? bloque.tallas : ["Cant."];
  const totales = totalesDeBloque({ ...bloque, tallas });
  return (
    <section className="overflow-hidden rounded-lg border border-teal-600">
      <div className="bg-teal-700 px-3 py-2 text-white">
        <p className="font-heading text-lg font-semibold tracking-wide">
          {bloque.sku}
        </p>
        {claveSolo ? null : (
          <p className="text-sm text-teal-100">
            {[bloque.nombre, bloque.sucursalNombre].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
      <div className="overflow-x-auto bg-white">
        <table className="w-full min-w-max border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-teal-800 px-2 py-2 text-left font-semibold text-white">
                Color
              </th>
              {tallas.map((t) => (
                <th
                  key={t}
                  className="min-w-12 bg-amber-600 px-2 py-2 text-center font-semibold text-white"
                >
                  {t || "Cant."}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bloque.filas.map((fila, i) => (
              <tr key={fila.keys.join("-")}>
                <td className="sticky left-0 z-10 bg-orange-50 px-2 py-2 font-medium capitalize">
                  {etiquetaColor(fila)}
                </td>
                {tallas.map((t) => (
                  <td
                    key={`${fila.keys[0]}-${t}`}
                    className={cn(
                      "px-2 py-2 text-center tabular-nums",
                      i % 2 === 0 ? "bg-teal-50" : "bg-white",
                    )}
                  >
                    {fila.porTalla[t] ?? ""}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td className="sticky left-0 z-10 bg-teal-900 px-2 py-2 font-semibold text-white">
                Total
              </td>
              {tallas.map((t) => (
                <td
                  key={`tot-${t}`}
                  className="bg-teal-900 px-2 py-2 text-center font-semibold tabular-nums text-white"
                >
                  {totales.porTalla[t] || ""}
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
