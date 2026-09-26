import assert from "node:assert/strict";
import {
  aplicarAsignaciones,
  extraerAsignaciones,
  parseAsignacionesPersistidas,
  preferirAsignaciones,
} from "../src/lib/asignaciones-articulos.ts";
import {
  ESQUEMAS_INICIALES,
  normalizarCatalogos,
  sanitizarArticuloSinFabrica,
} from "../src/lib/catalogos.ts";
import {
  asignacionesDesdeCookies,
  cookiesAsignaciones,
} from "../src/server/asignaciones-persist.ts";
import type { Producto } from "../src/lib/types.ts";

const custom = {
  id: "esq-baccus",
  nombre: "Camisas Baccus",
  tallas: ["1", "1X", "2"],
};
const catalogos = normalizarCatalogos({
  esquemas: [custom],
  colores: ["blanco", "azul"],
  tallas: ["1", "1X", "2"],
  especificaciones: [],
});

const base: Producto = {
  id: "p-1",
  sku: "XC1092",
  nombre: "Camisa Baccus",
  categoria: "",
  unidad: "pza",
  existencia: 0,
  minimo: 0,
  ubicacion: "",
};

const fabrica = sanitizarArticuloSinFabrica(
  { ...base, esquemaConteo: "nino", tallas: [...ESQUEMAS_INICIALES[0].tallas] },
  catalogos,
);
assert.equal(fabrica.esquemaConteo, undefined);

const deIza = sanitizarArticuloSinFabrica(
  {
    ...base,
    esquemaConteo: "esq-baccus",
    colores: ["blanco"],
    tallas: ["1", "1X"],
  },
  catalogos,
);
assert.equal(deIza.esquemaConteo, "esq-baccus");
assert.deepEqual(deIza.colores, ["Blanco"]);

const sinCatalogoAun = sanitizarArticuloSinFabrica(
  { ...base, esquemaConteo: "esq-baccus", tallas: ["1"] },
  normalizarCatalogos(null),
);
assert.equal(
  sinCatalogoAun.esquemaConteo,
  "esq-baccus",
  "no borrar asignación de Iza si el catálogo aún no cargó",
);

const csvVacio: Producto[] = [{ ...base }];
const overlay = extraerAsignaciones([deIza]);
assert.equal(overlay.XC1092.esquemaConteo, "esq-baccus");

const hidratado = aplicarAsignaciones(csvVacio, overlay, catalogos);
assert.equal(hidratado[0].esquemaConteo, "esq-baccus");
assert.deepEqual(hidratado[0].tallas, ["1", "1X"]);

const savedAt = "2026-09-19T12:00:00.000Z";
const persistido = parseAsignacionesPersistidas({
  savedAt,
  a: {
    xc1092: { e: "esq-baccus", c: ["blanco"], t: ["1"], s: [] },
  },
});
assert.ok(persistido);
assert.equal(persistido.asignaciones.XC1092.esquemaConteo, "esq-baccus");
assert.deepEqual(persistido.asignaciones.XC1092.colores, ["Blanco"]);

const cookies = cookiesAsignaciones({
  savedAt,
  asignaciones: overlay,
});
const map = new Map(cookies.map((c) => [c.name, c.value]));
const round = asignacionesDesdeCookies((name) => map.get(name) || undefined);
assert.ok(round, "cookie roundtrip asignaciones");
assert.equal(round.asignaciones.XC1092.esquemaConteo, "esq-baccus");
assert.deepEqual(round.asignaciones.XC1092.tallas, ["1", "1X"]);
assert.deepEqual(round.asignaciones.XC1092.colores, ["Blanco"]);

const llenas = {
  savedAt: "2026-09-20T00:00:00.000Z",
  asignaciones: overlay,
};
const vaciasNuevas = {
  savedAt: "2026-09-26T00:00:00.000Z",
  asignaciones: {},
};
const noPisa = preferirAsignaciones(llenas, vaciasNuevas);
assert.equal(
  noPisa?.asignaciones.XC1092.esquemaConteo,
  "esq-baccus",
  "un login o usuario nuevo no debe borrar esquemas ya asignados",
);

console.log("ok asignaciones", cookies.filter((c) => c.value).length, "cookies");
