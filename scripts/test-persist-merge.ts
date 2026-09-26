import assert from "node:assert/strict";
import {
  esReplayCatalogoVacio,
  esquemasTrasReplay,
  fuentesAlGuardarCatalogos,
  localNoDebeEmpujarAsignaciones,
  localNoDebeEmpujarCatalogos,
  mejorAsignacionesSinVaciar,
  mejorCatalogosSinVaciar,
  noPisarAsignacionesVacias,
  preferirCatalogos,
} from "../src/lib/persist-merge.ts";
import {
  catalogosVacios,
  esColoresDeFabrica,
  esTallasDeFabrica,
} from "../src/lib/catalogos.ts";
import type { Catalogos } from "../src/lib/types.ts";

const semilla = catalogosVacios();
assert.equal(semilla.esquemas.length, 0);
assert.equal(semilla.colores.length, 10);
assert.equal(semilla.tallas.length, 38);
assert.equal(esColoresDeFabrica(semilla.colores), true);
assert.equal(esTallasDeFabrica(semilla.tallas), true);

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

const fuentesColor = fuentesAlGuardarCatalogos(
  { colores: [...semilla.colores, "Lila"] },
  conEsquemas,
);
assert.equal(fuentesColor.esquemas, "base", "un color no borra esquemas");
assert.equal(fuentesColor.colores, "body");
assert.equal(fuentesColor.tallas, "base");

const replaySemilla = fuentesAlGuardarCatalogos(semilla, {
  esquemas: [{ id: "esq-1", nombre: "Camisa", tallas: ["1"] }],
  colores: [...semilla.colores, "Lila"],
  tallas: [...semilla.tallas, "70"],
  especificaciones: ["Cuello"],
});
assert.equal(replaySemilla.esquemas, "base");
assert.equal(replaySemilla.colores, "base");
assert.equal(replaySemilla.tallas, "base");

const replayColorNuevo = fuentesAlGuardarCatalogos(
  {
    esquemas: [],
    colores: [...semilla.colores, "Lila"],
    tallas: semilla.tallas,
  },
  {
    esquemas: [{ id: "esq-9", nombre: "Niña", tallas: ["2"] }],
    colores: semilla.colores,
    tallas: semilla.tallas,
    especificaciones: [],
  },
);
assert.equal(replayColorNuevo.esquemas, "base", "esquemas [] del replay no pisa");
assert.equal(replayColorNuevo.colores, "body", "el color extra sí se aplica");
assert.equal(replayColorNuevo.tallas, "body");

const ricoColores = {
  savedAt: "2026-09-20T00:00:00.000Z",
  catalogos: {
    esquemas: [] as Catalogos["esquemas"],
    colores: [...semilla.colores, "Lila"],
    tallas: [...semilla.tallas, "70"],
    especificaciones: [],
  },
};
const semillaNueva = {
  savedAt: "2026-09-26T16:00:00.000Z",
  catalogos: semilla,
};
const noPisaPaleta = preferirCatalogos(ricoColores, semillaNueva);
assert.ok(noPisaPaleta?.catalogos.colores.includes("Lila"));
assert.ok(noPisaPaleta?.catalogos.tallas.includes("70"));
assert.equal(noPisaPaleta?.savedAt, ricoColores.savedAt);

assert.equal(
  localNoDebeEmpujarCatalogos({
    localEsquemas: 2,
    serverEsquemas: 0,
    localSavedAt: "2026-09-20T00:00:00.000Z",
    serverSavedAt: "2026-09-26T00:00:00.000Z",
  }),
  false,
  "fábrica con fecha real: el celular no reenvía esquemas viejos",
);
assert.equal(
  localNoDebeEmpujarCatalogos({
    localEsquemas: 2,
    serverEsquemas: 0,
    localSavedAt: "2026-09-20T00:00:00.000Z",
    serverSavedAt: "1970-01-01T00:00:00.000Z",
  }),
  true,
  "servidor nunca guardado: sí se puede recuperar del celular",
);
assert.equal(
  localNoDebeEmpujarCatalogos({
    localEsquemas: 0,
    serverEsquemas: 2,
    localSavedAt: "2026-09-26T00:00:00.000Z",
    serverSavedAt: "2026-09-20T00:00:00.000Z",
    localEsSemilla: true,
    serverEsSemilla: false,
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

const editorBorraEsquemas = fuentesAlGuardarCatalogos(
  { esquemas: [] },
  conEsquemas,
);
assert.equal(
  editorBorraEsquemas.esquemas,
  "body",
  "en Configuración sí puede vaciar esquemas a propósito",
);

console.log("ok persist-merge");
