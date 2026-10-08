import assert from "node:assert/strict";
import {
  aplicarFilasCatalogo,
  diffCatalogo,
  parseAnclasDibujo,
  parseRelsDibujo,
  parseTablaCatalogo,
  tipoColumna,
} from "../src/lib/actualizar-catalogo.ts";
import { SECCIONES_CONFIGURACION } from "../src/lib/secciones-configuracion.ts";
import type { Producto } from "../src/lib/types.ts";

assert.equal(SECCIONES_CONFIGURACION[0].titulo, "Actualizar catálogo");
assert.equal(SECCIONES_CONFIGURACION[0].soloAdmin, true);
assert.equal(
  SECCIONES_CONFIGURACION[0].href,
  "/admin/configuracion/actualizar-catalogo",
);

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

const conExtra: Producto[] = [
  {
    ...base[0],
    fotos: ["/extra.jpg"],
    especificaciones: ["algodon"],
  },
];
const aplicadoExtra = aplicarFilasCatalogo(conExtra, [
  { clave: "XC1", nombre: "Camisa nueva", foto: "https://cdn.example/b.jpg" },
]);
const extra = aplicadoExtra[0];
assert.equal(extra?.nombre, "Camisa nueva");
assert.equal(extra?.foto, "https://cdn.example/b.jpg");
assert.deepEqual(extra?.fotos, ["/extra.jpg"]);
assert.deepEqual(extra?.colores, ["rojo"]);
assert.deepEqual(extra?.tallas, ["4", "6"]);
assert.deepEqual(extra?.especificaciones, ["algodon"]);
assert.equal(extra?.esquemaConteo, "esq-iza");
assert.equal(extra?.existencia, 12);

const soloNuevo = aplicarFilasCatalogo(base, [
  { clave: "ZZ9", nombre: "Prenda nueva", foto: "/z.jpg" },
]);
const zz = soloNuevo.find((p) => p.sku === "ZZ9");
assert.equal(zz?.esquemaConteo, undefined);
assert.equal(zz?.existencia, 0);
assert.equal(zz?.foto, "/z.jpg");
assert.equal(soloNuevo.find((p) => p.sku === "KEEP")?.nombre, "Se queda");
assert.equal(soloNuevo.find((p) => p.sku === "XC1")?.nombre, "Camisa vieja");

const autorizado: Producto[] = [{ ...base[0], nombreAutorizado: true }];
const soloNombre = diffCatalogo(autorizado, [
  { clave: "XC1", nombre: "Otro nombre" },
]);
assert.equal(soloNombre.actualizar.length, 0);
assert.equal(soloNombre.sinCambio.length, 1);
const diffAutorizado = diffCatalogo(autorizado, [
  { clave: "XC1", nombre: "Otro nombre", foto: "https://cdn.example/b.jpg" },
]);
assert.equal(diffAutorizado.actualizar.length, 1);
assert.equal(diffAutorizado.actualizar[0]?.nombre, "Otro nombre");
assert.equal(
  diffAutorizado.actualizar.some((f) => f.nombre === "Otro nombre" && f.foto),
  true,
);
const aplicadoAutorizado = aplicarFilasCatalogo(autorizado, [
  { clave: "XC1", nombre: "Otro nombre", foto: "https://cdn.example/b.jpg" },
]);
assert.equal(aplicadoAutorizado[0]?.nombre, "Camisa vieja");
assert.equal(aplicadoAutorizado[0]?.nombreAutorizado, true);
assert.equal(aplicadoAutorizado[0]?.foto, "https://cdn.example/b.jpg");
assert.equal(aplicadoAutorizado[0]?.esquemaConteo, "esq-iza");

console.log("ok actualizar-catalogo");
