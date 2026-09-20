import assert from "node:assert/strict";
import {
  catalogosDesdeCookies,
  cookiesCatalogos,
} from "../src/server/catalogos-persist.ts";
import { parseCatalogoCsv } from "../src/server/parse-catalogo.ts";
import {
  ESQUEMAS_INICIALES,
  esquemaPorId,
  normalizarCatalogos,
  sanitizarArticuloSinFabrica,
} from "../src/lib/catalogos.ts";

const vacioArranque = normalizarCatalogos(null);
assert.equal(vacioArranque.esquemas.length, 0);
assert.ok(vacioArranque.colores.length > 0);
assert.ok(vacioArranque.tallas.length > 0);

const conFabrica = normalizarCatalogos({
  esquemas: ESQUEMAS_INICIALES.map((e) => ({ ...e, tallas: [...e.tallas] })),
  colores: ["blanco"],
  tallas: ["4"],
  especificaciones: [],
});
assert.equal(conFabrica.esquemas.length, 0);
assert.deepEqual(conFabrica.colores, ["blanco"]);

const custom = {
  id: "esq-iza",
  nombre: "Ropa de niña Iza",
  tallas: ["2", "4", "6"],
};
const mezclado = normalizarCatalogos({
  esquemas: [
    { ...ESQUEMAS_INICIALES[0], tallas: [...ESQUEMAS_INICIALES[0].tallas] },
    custom,
  ],
  colores: [],
  tallas: [],
  especificaciones: [],
});
assert.equal(mezclado.esquemas.length, 1);
assert.equal(mezclado.esquemas[0].id, "esq-iza");
assert.equal(mezclado.colores.length, 0);
assert.equal(mezclado.tallas.length, 0);

const catalogos = normalizarCatalogos({
  esquemas: [custom],
  colores: ["rosa"],
  tallas: ["2", "4", "6"],
  especificaciones: [],
});
const savedAt = "2026-09-18T12:00:00.000Z";
const cookies = cookiesCatalogos({ catalogos, savedAt });
const map = new Map(cookies.map((c) => [c.name, c.value]));
const round = catalogosDesdeCookies((name) => map.get(name) || undefined);
assert.ok(round, "cookie roundtrip");
assert.equal(round.savedAt, savedAt);
assert.equal(round.catalogos.esquemas[0].nombre, "Ropa de niña Iza");
assert.deepEqual(round.catalogos.esquemas[0].tallas, ["2", "4", "6"]);

assert.equal(esquemaPorId(catalogos, undefined), undefined);
assert.equal(esquemaPorId(catalogos, "nino"), undefined);
assert.equal(esquemaPorId(catalogos, "esq-iza")?.nombre, "Ropa de niña Iza");

const articuloFabrica = sanitizarArticuloSinFabrica(
  {
    id: "p-1",
    sku: "XC1092",
    nombre: "Camisa",
    categoria: "",
    unidad: "pza",
    existencia: 0,
    minimo: 0,
    ubicacion: "",
    esquemaConteo: "nino",
    tallas: ["0", "2", "4"],
    colores: ["Único"],
  },
  catalogos,
);
assert.equal(articuloFabrica.esquemaConteo, undefined);
assert.deepEqual(articuloFabrica.tallas, []);
assert.deepEqual(articuloFabrica.colores, ["Único"]);

const articuloIza = sanitizarArticuloSinFabrica(
  { ...articuloFabrica, esquemaConteo: "esq-iza", tallas: ["2", "4"] },
  catalogos,
);
assert.equal(articuloIza.esquemaConteo, "esq-iza");
assert.deepEqual(articuloIza.tallas, ["2", "4"]);

const csv = parseCatalogoCsv(
  "CAMISA NIÑO EXCHICO\nClave:,XC1092,Existencia,0\n",
);
assert.equal(csv.length, 1);
assert.equal(csv[0].esquemaConteo, undefined);
assert.equal(csv[0].tallas, undefined);

const conMarca = normalizarCatalogos({
  esquemas: [custom],
  colores: ["rosa"],
  tallas: ["2"],
  especificaciones: [],
  empresaNombre: "  Tienda Iza  ",
  logoDataUrl: "data:image/png;base64,aaa",
});
assert.equal(conMarca.empresaNombre, "Tienda Iza");
assert.equal(conMarca.logoDataUrl?.startsWith("data:image/png"), true);
assert.equal(normalizarCatalogos(null).empresaNombre, undefined);

console.log("ok", cookies.filter((c) => c.value).length, "cookies");
