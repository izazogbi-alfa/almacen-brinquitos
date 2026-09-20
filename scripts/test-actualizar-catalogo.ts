import assert from "node:assert/strict";
import {
  aplicarFilasCatalogo,
  diffCatalogo,
  parseAnclasDibujo,
  parseRelsDibujo,
  parseTablaCatalogo,
  tipoColumna,
} from "../src/lib/actualizar-catalogo.ts";
import type { Producto } from "../src/lib/types.ts";

assert.equal(tipoColumna("Clave"), "clave");
assert.equal(tipoColumna("SKU"), "clave");
assert.equal(tipoColumna("Nombre"), "nombre");
assert.equal(tipoColumna("Fotos"), "foto");
assert.equal(tipoColumna("Foto"), "foto");
assert.equal(tipoColumna("URL"), "foto");
assert.equal(tipoColumna("Precio"), null);

const vacio = parseTablaCatalogo([]);
assert.equal(vacio.error?.includes("vacío"), true);

const sinClave = parseTablaCatalogo([["Nombre", "Color"], ["Camisa", "rojo"]]);
assert.ok(sinClave.error?.includes("Clave"));

const parsed = parseTablaCatalogo([
  ["Clave", "Nombre", "Color", "Fotos"],
  ["XC1", "Camisa vieja", "rojo", "https://cdn.example/a.jpg"],
  ["", "Sin clave", "azul", ""],
  ["XC2", "Nueva", "verde", ""],
  ["XC1", "Camisa nueva", "rojo", "https://cdn.example/b.jpg"],
]);
assert.equal(parsed.error, undefined);
assert.equal(parsed.filas.length, 2);
assert.equal(parsed.tieneColumnaFoto, true);
assert.equal(parsed.sinClave, 1);
assert.equal(parsed.duplicadas, 1);
const xc1 = parsed.filas.find((f) => f.clave === "XC1");
assert.equal(xc1?.nombre, "Camisa nueva");
assert.equal(xc1?.foto, "https://cdn.example/b.jpg");
assert.equal(parsed.filas.find((f) => f.clave === "XC2")?.foto, undefined);

const base: Producto[] = [
  {
    id: "p-XC1",
    sku: "XC1",
    nombre: "Camisa vieja",
    categoria: "",
    unidad: "pza",
    existencia: 12,
    minimo: 0,
    ubicacion: "",
    foto: "https://cdn.example/a.jpg",
    esquemaConteo: "esq-iza",
    tallas: ["4", "6"],
    colores: ["rojo"],
    existenciasSucursal: [{ sucursalId: "s1", talla: "4", color: "rojo", cantidad: 12 }],
  },
  {
    id: "p-KEEP",
    sku: "KEEP",
    nombre: "Se queda",
    categoria: "",
    unidad: "pza",
    existencia: 3,
    minimo: 0,
    ubicacion: "",
    foto: "/keep.png",
    esquemaConteo: "esq-iza",
    existenciasSucursal: [{ sucursalId: "s1", talla: "4", color: "rojo", cantidad: 3 }],
  },
];

const d = diffCatalogo(base, parsed.filas);
assert.equal(d.actualizar.length, 1);
assert.equal(d.nuevos.length, 1);
assert.equal(d.sinCambio.length, 0);
assert.equal(d.fotosCambian.length, 1);
assert.equal(d.fotosCambian[0].clave, "XC1");

const sinFotoCol = parseTablaCatalogo([
  ["Clave", "Nombre"],
  ["XC1", "Camisa vieja"],
]);
const d2 = diffCatalogo(base, sinFotoCol.filas);
assert.equal(d2.fotosCambian.length, 0);
assert.equal(d2.sinCambio.length, 1);

const aplicado = aplicarFilasCatalogo(base, parsed.filas);
assert.equal(aplicado.length, 3);
const keep = aplicado.find((p) => p.sku === "KEEP");
assert.equal(keep?.nombre, "Se queda");
assert.equal(keep?.foto, "/keep.png");
assert.equal(keep?.existencia, 3);
assert.equal(keep?.esquemaConteo, "esq-iza");
assert.equal(keep?.existenciasSucursal?.[0]?.cantidad, 3);
const camisa = aplicado.find((p) => p.sku === "XC1");
assert.equal(camisa?.nombre, "Camisa nueva");
assert.equal(camisa?.foto, "https://cdn.example/b.jpg");
assert.equal(camisa?.existencia, 12);
assert.equal(camisa?.esquemaConteo, "esq-iza");
assert.equal(camisa?.existenciasSucursal?.[0]?.cantidad, 12);
const nueva = aplicado.find((p) => p.sku === "XC2");
assert.equal(nueva?.nombre, "Nueva");
assert.equal(nueva?.existencia, 0);

const vaciaFoto = aplicarFilasCatalogo(base, [
  { clave: "XC1", nombre: "Camisa vieja" },
]);
assert.equal(vaciaFoto.find((p) => p.sku === "XC1")?.foto, "https://cdn.example/a.jpg");

const anclas = parseAnclasDibujo(
  `<xdr:twoCellAnchor><xdr:from><xdr:col>3</xdr:col><xdr:row>2</xdr:row></xdr:from><a:blip r:embed="rId2"/></xdr:twoCellAnchor>`,
);
assert.equal(anclas[0]?.row, 2);
assert.equal(anclas[0]?.embed, "rId2");
const rels = parseRelsDibujo(
  `<Relationship Id="rId2" Type="http://x" Target="../media/image1.png"/>`,
);
assert.equal(rels.rId2, "../media/image1.png");

const conEmpotrada = parseTablaCatalogo(
  [
    ["Clave", "Nombre"],
    ["KEEP", "Se queda"],
  ],
  new Map([[1, "https://cdn.example/emb.jpg"]]),
);
assert.equal(conEmpotrada.filas[0]?.foto, "https://cdn.example/emb.jpg");
const dFoto = diffCatalogo(base, conEmpotrada.filas);
assert.equal(dFoto.fotosCambian.length, 1);

console.log("ok actualizar-catalogo");
