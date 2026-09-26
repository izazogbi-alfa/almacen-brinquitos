import assert from "node:assert/strict";
import {
  esReplayCatalogoVacio,
  esquemasTrasReplay,
  localNoDebeEmpujarAsignaciones,
  localNoDebeEmpujarCatalogos,
  mejorAsignacionesSinVaciar,
  mejorCatalogosSinVaciar,
  noPisarAsignacionesVacias,
} from "../src/lib/persist-merge.ts";
import type { Catalogos } from "../src/lib/types.ts";

const conEsquemas: Catalogos = {
  esquemas: [{ id: "esq-1", nombre: "Camisas", tallas: ["1", "1X"] }],
  colores: ["Blanco"],
  tallas: ["1"],
  especificaciones: [],
};
const vacio: Catalogos = {
  esquemas: [],
  colores: ["Blanco"],
  tallas: ["1"],
  especificaciones: [],
};

const viejo = {
  savedAt: "2026-09-20T00:00:00.000Z",
  catalogos: conEsquemas,
};
const nuevoVacio = {
  savedAt: "2026-09-26T00:00:00.000Z",
  catalogos: vacio,
};

const mejor = mejorCatalogosSinVaciar(viejo, nuevoVacio);
assert.equal(mejor?.catalogos.esquemas[0]?.id, "esq-1");

assert.equal(
  esquemasTrasReplay(
    { esquemas: [], colores: [], tallas: [] },
    conEsquemas,
  ),
  "usar-base",
);
assert.equal(
  esReplayCatalogoVacio(
    { esquemas: [], colores: ["Blanco"], tallas: ["1"] },
    conEsquemas,
  ),
  true,
);
assert.equal(
  esReplayCatalogoVacio({ colores: ["Blanco"] }, conEsquemas),
  false,
  "guardar solo colores no es un replay vacío",
);
assert.equal(
  esReplayCatalogoVacio({ esquemas: [] }, conEsquemas),
  false,
  "borrar el último esquema desde el editor no es replay",
);

assert.equal(
  localNoDebeEmpujarCatalogos({
    localEsquemas: 2,
    serverEsquemas: 0,
    localSavedAt: "2026-09-20T00:00:00.000Z",
    serverSavedAt: "2026-09-26T00:00:00.000Z",
  }),
  true,
  "si el servidor quedó vacío, Iza puede reenviar sus esquemas",
);
assert.equal(
  localNoDebeEmpujarCatalogos({
    localEsquemas: 0,
    serverEsquemas: 2,
    localSavedAt: "2026-09-26T00:00:00.000Z",
    serverSavedAt: "2026-09-20T00:00:00.000Z",
  }),
  false,
);
assert.equal(
  localNoDebeEmpujarAsignaciones({
    localCount: 0,
    serverCount: 4,
    localSavedAt: "2026-09-26T00:00:00.000Z",
    serverSavedAt: "2026-09-20T00:00:00.000Z",
  }),
  false,
);

const asigVieja = {
  savedAt: "2026-09-20T00:00:00.000Z",
  asignaciones: {
    XC1092: {
      esquemaConteo: "esq-1",
      colores: ["Blanco"],
      tallas: ["1"],
      especificaciones: [],
    },
  },
};
const asigVacia = {
  savedAt: "2026-09-26T00:00:00.000Z",
  asignaciones: {},
};
assert.equal(
  mejorAsignacionesSinVaciar(asigVieja, asigVacia)?.asignaciones.XC1092
    ?.esquemaConteo,
  "esq-1",
);
assert.equal(
  noPisarAsignacionesVacias(asigVieja, asigVacia).asignaciones.XC1092
    ?.esquemaConteo,
  "esq-1",
);

console.log("ok persist-merge");
