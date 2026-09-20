import assert from "node:assert/strict";
import {
  aplicarExistencias,
  KIND_RESPALDO,
  parseArchivoRespaldo,
  parseExistenciasRespaldo,
  parseSesionesRespaldo,
} from "../src/lib/respaldos.ts";

assert.equal(parseArchivoRespaldo({ hola: 1 }), null);
assert.equal(parseArchivoRespaldo(null), null);

const viejo = parseArchivoRespaldo({
  kind: KIND_RESPALDO,
  catalogos: {
    esquemas: [],
    colores: ["rojo"],
    tallas: ["1"],
    especificaciones: [],
  },
  asignaciones: {
    XC1: {
      esquemaConteo: "letra",
      colores: ["rojo"],
      tallas: [],
      especificaciones: [],
    },
  },
});
assert.ok(viejo);
assert.equal(viejo?.existencias, undefined);
assert.equal(viejo?.sesiones, undefined);
assert.equal(viejo?.asignaciones?.XC1.esquemaConteo, "letra");

const conStock = parseArchivoRespaldo({
  kind: KIND_RESPALDO,
  catalogos: { esquemas: [], colores: [], tallas: [], especificaciones: [] },
  existencias: [
    {
      sku: "xc9",
      existencia: 4,
      existenciasSucursal: [
        { sucursalId: "s-gloria", talla: "4", color: "rojo", cantidad: 4 },
      ],
    },
  ],
  sesiones: [
    {
      id: "ss-1",
      modulo: "existencias",
      abiertaEn: "2026-09-20T00:00:00.000Z",
      ultimaActividad: "2026-09-20T00:00:00.000Z",
      userId: "u-iza",
      userName: "Iza",
      conteos: 2,
      entradas: 0,
      pedidos: 0,
    },
  ],
});
assert.ok(conStock);
assert.equal(conStock?.existencias?.[0].sku, "XC9");
assert.equal(conStock?.sesiones?.[0].id, "ss-1");
assert.equal(parseSesionesRespaldo(undefined), undefined);
assert.equal(parseExistenciasRespaldo(undefined), undefined);

const aplicados = aplicarExistencias(
  [
    {
      id: "p1",
      sku: "XC9",
      nombre: "Prueba",
      categoria: "",
      unidad: "pza",
      existencia: 0,
      minimo: 0,
      ubicacion: "",
      existenciasSucursal: [],
    },
    {
      id: "p2",
      sku: "OTRO",
      nombre: "Otro",
      categoria: "",
      unidad: "pza",
      existencia: 9,
      minimo: 0,
      ubicacion: "",
      existenciasSucursal: [
        { sucursalId: "s-modelo", talla: "1", color: "azul", cantidad: 9 },
      ],
    },
  ],
  conStock!.existencias!,
);
assert.equal(aplicados[0].existencia, 4);
assert.equal(aplicados[0].existenciasSucursal?.[0].cantidad, 4);
assert.equal(aplicados[1].existencia, 9);

console.log("ok restaurar parse y existencias");
