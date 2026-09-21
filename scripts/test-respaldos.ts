import assert from "node:assert/strict";
import {
  LIMITE_RESPALDOS,
  idRespaldoAutomatico,
  incorporarRespaldo,
  mezclarItemsTope,
  recortarColeccion,
  yaHayAutomaticoDelDia,
} from "../src/lib/respaldos-tope.ts";
import {
  KIND_RESPALDO,
  aplicarExistenciasRespaldo,
  extraerExistencias,
  parseArchivoRespaldo,
  parseColeccionRespaldos,
  parseIndiceRespaldos,
} from "../src/lib/respaldos.ts";
import type { Producto } from "../src/lib/types.ts";

function fake(origen: "manual" | "automatico", n: number) {
  const createdAt = new Date(Date.UTC(2026, 0, n, 12)).toISOString();
  return {
    id: `${origen}-${n}`,
    createdAt,
    origen,
    dia: `2026-01-${String(n).padStart(2, "0")}`,
  };
}

const recortadosM = recortarColeccion(
  Array.from({ length: 12 }, (_, i) => fake("manual", i + 1)),
);
assert.equal(recortadosM.length, LIMITE_RESPALDOS);
assert.ok(recortadosM.some((x) => x.id === "manual-12"));
assert.ok(!recortadosM.some((x) => x.id === "manual-1"));
assert.ok(!recortadosM.some((x) => x.id === "manual-2"));

const recortadosA = recortarColeccion(
  Array.from({ length: 12 }, (_, i) => fake("automatico", i + 1)),
);
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

const d1 = fake("automatico", 1);
const d2 = fake("automatico", 2);
const d3 = fake("automatico", 3);
const soloHoy = mezclarItemsTope([[d3], [d1, d2]]);
assert.equal(soloHoy.length, 3);
assert.ok(soloHoy.some((x) => x.dia === "2026-01-01"));
assert.ok(soloHoy.some((x) => x.dia === "2026-01-02"));
assert.ok(soloHoy.some((x) => x.dia === "2026-01-03"));

const pisaHoy = incorporarRespaldo(
  [d1, d2, { ...d3, id: "automatico-viejo" }],
  { ...d3, id: idRespaldoAutomatico("2026-01-03"), createdAt: "2026-01-03T20:00:00.000Z" },
);
assert.equal(pisaHoy.filter((x) => x.origen === "automatico" && x.dia === "2026-01-03").length, 1);
assert.ok(pisaHoy.some((x) => x.dia === "2026-01-01"));
assert.equal(idRespaldoAutomatico("2026-09-21"), "rb-auto-2026-09-21");

const onceDias = incorporarRespaldo(
  Array.from({ length: 10 }, (_, i) => fake("automatico", i + 1)),
  fake("automatico", 11),
);
assert.equal(onceDias.length, LIMITE_RESPALDOS);
assert.ok(onceDias.some((x) => x.dia === "2026-01-11"));
assert.ok(!onceDias.some((x) => x.dia === "2026-01-01"));

console.log("ok respaldos historia de dias");

const legadoUno = parseColeccionRespaldos({
  kind: KIND_RESPALDO,
  version: 2,
  id: "rb-auto-2026-01-01",
  createdAt: "2026-01-01T13:00:00.000Z",
  origen: "automatico",
  dia: "2026-01-01",
  catalogos: {
    esquemas: [{ id: "esq-iza", nombre: "Niña", tallas: ["2"] }],
    colores: ["rosa"],
    tallas: ["2"],
    especificaciones: [],
  },
  asignaciones: {},
});
assert.ok(legadoUno);
assert.equal(legadoUno.items.length, 1);
assert.equal(legadoUno.items[0].dia, "2026-01-01");

const indiceDos = parseIndiceRespaldos({
  savedAt: "2026-01-02T13:00:00.000Z",
  items: [
    { id: "rb-auto-2026-01-01", createdAt: "2026-01-01T13:00:00.000Z", origen: "automatico", dia: "2026-01-01", resumen: { esquemas: 1, colores: 1, tallas: 1, especificaciones: 0, articulos: 0 } },
    { id: "rb-auto-2026-01-02", createdAt: "2026-01-02T13:00:00.000Z", origen: "automatico", dia: "2026-01-02", resumen: { esquemas: 1, colores: 1, tallas: 1, especificaciones: 0, articulos: 0 } },
  ],
});
assert.ok(indiceDos);
assert.equal(indiceDos.items.length, 2);

console.log("ok parse coleccion e indice");

assert.equal(parseArchivoRespaldo({ hola: 1 }), null);
assert.equal(parseArchivoRespaldo(null), null);

const viejo = parseArchivoRespaldo({
  kind: KIND_RESPALDO,
  version: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
  origen: "manual",
  dia: "2026-01-01",
  catalogos: {
    esquemas: [{ id: "esq-iza", nombre: "Niña", tallas: ["2"] }],
    colores: ["rosa"],
    tallas: ["2"],
    especificaciones: [],
  },
  asignaciones: {
    XC1: { esquemaConteo: "esq-iza", colores: ["rosa"], tallas: ["2"], especificaciones: [] },
  },
});
assert.ok(viejo);
assert.equal(viejo.existencias, undefined);
assert.equal(viejo.sesiones, undefined);
assert.equal(viejo.asignaciones.XC1.esquemaConteo, "esq-iza");

const nuevo = parseArchivoRespaldo({
  ...viejo,
  existencias: [
    {
      sku: "xc1",
      existenciasSucursal: [
        { sucursalId: "gloria", talla: "2", color: "rosa", cantidad: 4 },
      ],
      existencia: 4,
    },
  ],
  sesiones: [
    {
      id: "ss-1",
      modulo: "existencias",
      abiertaEn: "2026-01-01T00:00:00.000Z",
      ultimaActividad: "2026-01-01T00:00:00.000Z",
      userId: "u-iza",
      userName: "Iza",
      conteos: 1,
      entradas: 0,
      pedidos: 0,
    },
  ],
});
assert.ok(nuevo);
assert.equal(nuevo.existencias?.length, 1);
assert.equal(nuevo.existencias?.[0].sku, "XC1");
assert.equal(nuevo.sesiones?.[0].id, "ss-1");

assert.equal(
  parseArchivoRespaldo({ ...viejo, existencias: "no" }),
  null,
);

const productos: Producto[] = [
  {
    id: "p1",
    sku: "XC1",
    nombre: "Uno",
    categoria: "",
    unidad: "pza",
    existencia: 9,
    minimo: 0,
    ubicacion: "",
    existenciasSucursal: [
      { sucursalId: "gloria", talla: "2", color: "rosa", cantidad: 9 },
    ],
  },
  {
    id: "p2",
    sku: "XC2",
    nombre: "Dos",
    categoria: "",
    unidad: "pza",
    existencia: 3,
    minimo: 0,
    ubicacion: "",
    existenciasSucursal: [
      { sucursalId: "gloria", talla: "2", color: "azul", cantidad: 3 },
    ],
  },
];
const extraidas = extraerExistencias(productos);
assert.equal(extraidas.length, 2);
const aplicadas = aplicarExistenciasRespaldo(productos, extraidas.filter((e) => e.sku === "XC1"));
assert.equal(aplicadas[0].existencia, 9);
assert.equal(aplicadas[1].existencia, 0);
assert.deepEqual(aplicadas[1].existenciasSucursal, []);
assert.equal(productos[1].existencia, 3);

console.log("ok restaurar respaldo parse");
