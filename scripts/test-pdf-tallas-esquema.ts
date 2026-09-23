import assert from "node:assert/strict";
import {
  cantidadPdf,
  encabezadosColumnaTalla,
  esListaMedidas,
  tituloEncabezadoTallas,
} from "../src/lib/captura-tallas.ts";
import { normalizarCatalogos } from "../src/lib/catalogos.ts";
import { construirPdfBloques } from "../src/lib/pdf.ts";
import {
  bloquesDesdeCeldas,
  filasCompletasEsquema,
  tallasParaPdf,
} from "../src/lib/tabla-bloques.ts";
import type { Producto } from "../src/lib/types.ts";
import { tituloTalla } from "../src/lib/titulo-etiqueta.ts";

const infantil = ["1", "1X", "2", "4", "6", "8", "10"];
assert.deepEqual(
  tallasParaPdf(infantil, ["4", "1"]),
  ["1", "1X", "2", "4", "6", "8", "10"],
);
assert.notDeepEqual(
  tallasParaPdf(infantil, ["4", "1"]),
  ["1", "2", "4", "6", "8", "10", "1X"],
);

const letra = ["Extra chico", "Chico", "Mediano", "Grande", "Extra grande"];
assert.equal(esListaMedidas(letra), true);
assert.equal(esListaMedidas(infantil), false);
assert.equal(tituloEncabezadoTallas(letra), "Medidas");
assert.equal(tituloEncabezadoTallas(infantil), "Tallas");
assert.deepEqual(
  encabezadosColumnaTalla(infantil, tituloTalla),
  ["1", "1X", "2", "4", "6", "8", "10"],
);
assert.deepEqual(encabezadosColumnaTalla(["4"], tituloTalla), ["Tallas"]);

const filas = filasCompletasEsquema(
  [{ keys: ["a"], color: "Negro", porTalla: { "4": 2 } }],
  ["Blanco", "Negro", "Rosa"],
);
assert.deepEqual(
  filas.map((f) => f.color),
  ["Blanco", "Negro", "Rosa"],
);
assert.equal(filas[0].porTalla["4"], undefined);
assert.equal(cantidadPdf(undefined), "0");
assert.equal(cantidadPdf(0), "0");

const catalogos = normalizarCatalogos({
  esquemas: [
    {
      id: "inf",
      nombre: "Infantil",
      tallas: infantil,
      estiloPdf: "compacto",
    },
  ],
  colores: ["Blanco", "Negro", "Rosa"],
  tallas: infantil,
  especificaciones: [],
});
const producto: Producto = {
  id: "p1",
  sku: "BAC-104",
  nombre: "Playera algodón",
  categoria: "",
  unidad: "pza",
  existencia: 0,
  minimo: 0,
  ubicacion: "",
  esquemaConteo: "inf",
  colores: ["Blanco", "Negro", "Rosa"],
};
const bloques = bloquesDesdeCeldas(
  [
    {
      productoId: "p1",
      sku: "BAC-104",
      nombre: "Playera algodón",
      color: "Negro",
      sucursalId: "s1",
      sucursalNombre: "La Gloria",
      talla: "4",
      cantidad: 2,
    },
  ],
  { productos: [producto], catalogos },
);
assert.deepEqual(bloques[0].tallas, ["1", "1X", "2", "4", "6", "8", "10"]);
assert.deepEqual(
  bloques[0].filas.map((f) => f.color),
  ["Blanco", "Negro", "Rosa"],
);
assert.equal(bloques[0].filas[0].porTalla["4"], undefined);
assert.equal(bloques[0].filas[1].porTalla["4"], 2);

const pdf = construirPdfBloques(
  "Existencias",
  [],
  bloques,
  { tituloDoc: "Existencias", claveSolo: true },
);
assert.equal(pdf.getNumberOfPages(), 1);

console.log("ok pdf-tallas-esquema", {
  tallas: bloques[0].tallas.length,
  filas: bloques[0].filas.length,
});
