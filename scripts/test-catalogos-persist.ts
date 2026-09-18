import assert from "node:assert/strict";
import {
  catalogosDesdeCookies,
  cookiesCatalogos,
} from "../src/server/catalogos-persist.ts";
import { normalizarCatalogos } from "../src/lib/catalogos.ts";

const catalogos = normalizarCatalogos(null);
catalogos.esquemas[0] = {
  ...catalogos.esquemas[0],
  nombre: "Ropa de niña Iza",
  tallas: ["2", "4", "6"],
};

const savedAt = "2026-09-18T12:00:00.000Z";
const cookies = cookiesCatalogos({ catalogos, savedAt });
const map = new Map(cookies.map((c) => [c.name, c.value]));
const round = catalogosDesdeCookies((name) => map.get(name) || undefined);
assert.ok(round, "cookie roundtrip");
assert.equal(round.savedAt, savedAt);
assert.equal(round.catalogos.esquemas[0].nombre, "Ropa de niña Iza");
assert.deepEqual(round.catalogos.esquemas[0].tallas, ["2", "4", "6"]);

const vacio = normalizarCatalogos({
  esquemas: [{ id: "nino", nombre: "Solo color", tallas: [] }],
  colores: [],
  tallas: [],
  especificaciones: [],
});
assert.equal(vacio.esquemas[0].tallas.length, 0);
assert.equal(vacio.colores.length, 0);
assert.equal(vacio.tallas.length, 0);
console.log("ok", cookies.filter((c) => c.value).length, "cookies");
