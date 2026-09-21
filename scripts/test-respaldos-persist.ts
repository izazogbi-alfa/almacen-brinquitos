import assert from "node:assert/strict";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import {
  guardarColeccionRespaldos,
  leerColeccionRespaldos,
} from "../src/server/respaldos-persist.ts";
import type { RespaldoCompleto } from "../src/lib/respaldos.ts";
import { idRespaldoAutomatico } from "../src/lib/respaldos-tope.ts";

function copia(dia: string, n: number): RespaldoCompleto {
  const createdAt = `2026-01-${String(n).padStart(2, "0")}T13:00:00.000Z`;
  return {
    id: idRespaldoAutomatico(dia),
    createdAt,
    origen: "automatico",
    dia,
    resumen: {
      esquemas: n,
      colores: 1,
      tallas: 1,
      especificaciones: 0,
      articulos: 0,
    },
    catalogos: {
      esquemas: [{ id: `esq-${n}`, nombre: `Dia ${n}`, tallas: ["2"] }],
      colores: ["rosa"],
      tallas: ["2"],
      especificaciones: [],
    },
    asignaciones: {},
  };
}

const dataDir = join(process.cwd(), "data");
const paths = [
  join(dataDir, "respaldos.json"),
  join(dataDir, "respaldos-indice.json"),
  join(dataDir, "respaldos"),
];

function limpiar() {
  for (const p of paths) {
    if (existsSync(p)) rmSync(p, { recursive: true, force: true });
  }
}

limpiar();
async function main() {
  const d1 = copia("2026-01-01", 1);
  const d2 = copia("2026-01-02", 2);
  const r1 = await guardarColeccionRespaldos(
    { savedAt: d1.createdAt, items: [d1] },
    { escritos: [d1.id] },
  );
  assert.ok(r1.persistio, "local archivo cuenta como duradero fuera de Vercel");
  const r2 = await guardarColeccionRespaldos(
    { savedAt: d2.createdAt, items: [d2] },
    { escritos: [d2.id] },
  );
  assert.ok(r2.indice.items.length >= 2, "el indice guarda mas de un dia");
  const lista = await leerColeccionRespaldos();
  const autos = lista.items.filter((it) => it.origen === "automatico");
  assert.ok(
    autos.some((it) => it.dia === "2026-01-01"),
    "queda el dia 1",
  );
  assert.ok(
    autos.some((it) => it.dia === "2026-01-02"),
    "queda el dia 2",
  );
  assert.ok(existsSync(join(dataDir, "respaldos", "dias", `${d1.id}.json`)));
  assert.ok(existsSync(join(dataDir, "respaldos", "dias", `${d2.id}.json`)));
  console.log("ok persistir historia de dias");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => {
    limpiar();
  });
