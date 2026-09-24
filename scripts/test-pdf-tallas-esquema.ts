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
  type FilaColorBloque,
} from "../src/lib/tabla-bloques.ts";
import type { Producto } from "../src/lib/types.ts";
import { tituloTalla } from "../src/lib/titulo-etiqueta.ts";

const infantil = ["1", "1X", "2", "4", "6", "8", "10"];
const filasInfantil: FilaColorBloque[] = [
  { keys: ["a"], color: "Negro", porTalla: { "4": 2 } },
];
assert.deepEqual(
  tallasParaPdf(infantil, filasInfantil, ["4", "1"]),
  ["4"],
);
assert.notDeepEqual(
  tallasParaPdf(infantil, filasInfantil, ["4", "1"]),
  ["1", "2", "4", "6", "8", "10", "1X"],
);

const letra = ["Extra chico", "Chico", "Mediano", "Grande", "Extra grande"];
assert.equal(esListaMedidas(letra), true);
assert.equal(esListaMedidas(infantil), false);
assert.equal(tituloEncabezadoTallas(letra), "Medidas");
assert.equal(tituloEncabezadoTallas(infantil), "Tallas");
assert.deepEqual(
  encabezadosColumnaTalla(["4"], tituloTalla),
  ["Tallas"],
);

const filas = filasCompletasEsquema(
  [{ keys: ["a"], color: "Negro", porTalla: { "4": 2 } }],
  ["Blanco", "Negro", "Rosa"],
);
assert.deepEqual(
  filas.map((f) => f.color),
  ["Negro"],
);
assert.equal(filas[0].porTalla["4"], 2);
assert.equal(cantidadPdf(undefined), "");
assert.equal(cantidadPdf(0), "0");
assert.equal(cantidadPdf(null), "");

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
assert.deepEqual(bloques[0].tallas, ["4"]);
assert.deepEqual(
  bloques[0].filas.map((f) => f.color),
  ["Negro"],
);
assert.equal(bloques[0].filas[0].porTalla["4"], 2);
assert.equal(bloques[0].filas[0].porTalla["1"], undefined);

const esquemaColores = [
  "Rojo",
  "Amarillo",
  "Verde",
  "Azul",
  "Blanco",
  "Café",
];
const esquemaTallas = ["0", "1", "2", "3"];
const bloquesVacios = bloquesDesdeCeldas(
  [
    {
      productoId: "p2",
      sku: "DEM-001",
      nombre: "Demo",
      color: "Rojo",
      sucursalId: "s1",
      sucursalNombre: "La Gloria",
      talla: "0",
      cantidad: 4,
    },
    {
      productoId: "p2",
      sku: "DEM-001",
      nombre: "Demo",
      color: "Rojo",
      sucursalId: "s1",
      sucursalNombre: "La Gloria",
      talla: "3",
      cantidad: 0,
    },
    {
      productoId: "p2",
      sku: "DEM-001",
      nombre: "Demo",
      color: "Azul",
      sucursalId: "s1",
      sucursalNombre: "La Gloria",
      talla: "1",
      cantidad: 2,
    },
    {
      productoId: "p2",
      sku: "DEM-001",
      nombre: "Demo",
      color: "Azul",
      sucursalId: "s1",
      sucursalNombre: "La Gloria",
      talla: "3",
      cantidad: 1,
    },
    {
      productoId: "p2",
      sku: "DEM-001",
      nombre: "Demo",
      color: "Café",
      sucursalId: "s1",
      sucursalNombre: "La Gloria",
      talla: "0",
      cantidad: 1,
    },
    {
      productoId: "p2",
      sku: "DEM-001",
      nombre: "Demo",
      color: "Café",
      sucursalId: "s1",
      sucursalNombre: "La Gloria",
      talla: "1",
      cantidad: 0,
    },
  ],
  {
    productos: [
      {
        id: "p2",
        sku: "DEM-001",
        nombre: "Demo",
        categoria: "",
        unidad: "pza",
        existencia: 0,
        minimo: 0,
        ubicacion: "",
        esquemaConteo: "demo",
        colores: esquemaColores,
      },
    ],
    catalogos: normalizarCatalogos({
      esquemas: [
        {
          id: "demo",
          nombre: "Demo",
          tallas: esquemaTallas,
          estiloPdf: "compacto",
        },
      ],
      colores: esquemaColores,
      tallas: esquemaTallas,
      especificaciones: [],
    }),
  },
);
assert.deepEqual(bloquesVacios[0].tallas, ["0", "1", "3"]);
assert.deepEqual(
  bloquesVacios[0].filas.map((f) => f.color),
  ["Rojo", "Azul", "Café"],
);
const rojo = bloquesVacios[0].filas.find((f) => f.color === "Rojo")!;
assert.equal(rojo.porTalla["0"], 4);
assert.equal(rojo.porTalla["1"], undefined);
assert.equal(rojo.porTalla["3"], 0);
assert.equal(cantidadPdf(rojo.porTalla["1"]), "");
assert.equal(cantidadPdf(rojo.porTalla["3"]), "0");

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
  ejemplo: {
    tallas: bloquesVacios[0].tallas,
    colores: bloquesVacios[0].filas.map((f) => f.color),
  },
});
