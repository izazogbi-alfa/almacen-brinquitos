import assert from "node:assert/strict";
import {
  LIMITE_RESPALDOS,
  parseArchivoRespaldo,
  recortarColeccion,
  snapshotDesdeStore,
  yaHayAutomaticoDelDia,
  type RespaldoCompleto,
} from "../src/lib/respaldos.ts";

const catalogos = {
  esquemas: [{ id: "esq-baccus", nombre: "Baccus", tallas: ["1", "1X"] }],
  colores: ["blanco"],
  tallas: ["1", "1X"],
  especificaciones: ["manga"],
};

const snap = snapshotDesdeStore({
  catalogos,
  productos: [
    {
      id: "p-1",
      sku: "XC1092",
      nombre: "Baccus",
      categoria: "",
      unidad: "pza",
      existencia: 0,
      minimo: 0,
      ubicacion: "",
      esquemaConteo: "esq-baccus",
      tallas: ["1", "1X"],
      colores: ["blanco"],
    },
  ],
  origen: "manual",
  ahora: new Date("2026-09-19T18:00:00.000Z"),
});
assert.equal(snap.resumen.esquemas, 1);
assert.equal(snap.resumen.articulos, 1);
assert.equal(snap.asignaciones.XC1092.esquemaConteo, "esq-baccus");

const round = parseArchivoRespaldo({
  catalogos: snap.catalogos,
  asignaciones: snap.asignaciones,
  createdAt: snap.createdAt,
  origen: snap.origen,
  dia: snap.dia,
});
assert.ok(round);
assert.equal(round.catalogos.esquemas[0].nombre, "Baccus");
assert.equal(round.asignaciones.XC1092.esquemaConteo, "esq-baccus");

function fake(origen: "manual" | "automatico", n: number): RespaldoCompleto {
  const createdAt = new Date(Date.UTC(2026, 0, n, 12)).toISOString();
  return {
    id: `${origen}-${n}`,
    createdAt,
    origen,
    dia: `2026-01-${String(n).padStart(2, "0")}`,
    resumen: {
      esquemas: 1,
      colores: 1,
      tallas: 1,
      especificaciones: 0,
      articulos: 1,
    },
    catalogos,
    asignaciones: {
      XC1092: {
        esquemaConteo: "esq-baccus",
        colores: ["blanco"],
        tallas: ["1"],
        especificaciones: [],
      },
    },
  };
}

const muchosManuales = Array.from({ length: 12 }, (_, i) => fake("manual", i + 1));
const recortadosM = recortarColeccion(muchosManuales);
assert.equal(recortadosM.length, LIMITE_RESPALDOS);
assert.ok(recortadosM.some((x) => x.id === "manual-12"));
assert.ok(!recortadosM.some((x) => x.id === "manual-1"));
assert.ok(!recortadosM.some((x) => x.id === "manual-2"));

const muchosAuto = Array.from({ length: 12 }, (_, i) => fake("automatico", i + 1));
const recortadosA = recortarColeccion(muchosAuto);
assert.equal(recortadosA.length, LIMITE_RESPALDOS);
assert.ok(recortadosA.some((x) => x.id === "automatico-12"));
assert.ok(!recortadosA.some((x) => x.id === "automatico-1"));

const mixto = recortarColeccion([
  ...Array.from({ length: 12 }, (_, i) => fake("manual", i + 1)),
  ...Array.from({ length: 12 }, (_, i) => fake("automatico", i + 1)),
]);
assert.equal(mixto.filter((x) => x.origen === "manual").length, 10);
assert.equal(mixto.filter((x) => x.origen === "automatico").length, 10);
assert.equal(mixto.length, 20);

assert.equal(yaHayAutomaticoDelDia(mixto, "2026-01-12"), true);
assert.equal(yaHayAutomaticoDelDia(mixto, "2026-09-19"), false);

console.log("ok respaldos cap 10");
