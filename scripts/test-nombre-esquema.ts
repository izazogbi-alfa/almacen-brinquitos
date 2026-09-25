import assert from "node:assert/strict";
import {
  claveNombreEsquema,
  esquemaConNombreRepetido,
  mensajeNombreEsquemaDuplicado,
  nombreEsquemaDuplicado,
} from "../src/lib/catalogos.ts";
import { tituloEtiqueta } from "../src/lib/titulo-etiqueta.ts";
import type { EsquemaCatalogo } from "../src/lib/types.ts";

function esq(id: string, nombre: string): EsquemaCatalogo {
  return { id, nombre, tallas: [] };
}

assert.equal(tituloEtiqueta("camisas"), "Camisas");
assert.equal(tituloEtiqueta("camisa"), "Camisa");
assert.equal(tituloEtiqueta("  CAMISAS  "), "Camisas");
assert.equal(tituloEtiqueta("CAMISA"), "Camisa");
assert.equal(claveNombreEsquema("  Camisas "), claveNombreEsquema("CAMISAS"));

const vacio: EsquemaCatalogo[] = [];
assert.equal(nombreEsquemaDuplicado(vacio, "camisas"), false);
assert.equal(nombreEsquemaDuplicado(vacio, "camisa"), false);

const draftNuevo = [esq("esq-nuevo", "Camisas")];
assert.equal(
  nombreEsquemaDuplicado(draftNuevo, "camisas"),
  true,
  "sin exceptoId el borrador se cuenta a sí mismo (el bug)",
);
assert.equal(
  nombreEsquemaDuplicado(draftNuevo, "camisas", "esq-nuevo"),
  false,
  "al crear hay que ignorar el id del borrador",
);
assert.equal(
  nombreEsquemaDuplicado(draftNuevo, "  CAMISAS  ", "esq-nuevo"),
  false,
);
assert.equal(
  nombreEsquemaDuplicado(draftNuevo, "camisa", "esq-nuevo"),
  false,
  "camisa y camisas no son el mismo nombre",
);

const conCamisa = [esq("esq-1", "Camisa")];
assert.equal(nombreEsquemaDuplicado(conCamisa, "camisas", "esq-nuevo"), false);
assert.equal(nombreEsquemaDuplicado(conCamisa, "CAMISA", "esq-nuevo"), true);
assert.equal(nombreEsquemaDuplicado(conCamisa, "  camisa", "esq-nuevo"), true);
assert.equal(nombreEsquemaDuplicado(conCamisa, "Camisá", "esq-nuevo"), false);

const dos = [esq("esq-1", "Camisas"), esq("esq-nuevo", "Camisas")];
const otro = esquemaConNombreRepetido(dos, "camisas", "esq-nuevo");
assert.equal(otro?.id, "esq-1");
assert.equal(
  mensajeNombreEsquemaDuplicado(dos, "Camisas", "esq-nuevo"),
  "Ya hay un esquema llamado «Camisas». Ábrelo en la lista o elige otro nombre.",
);
assert.equal(
  mensajeNombreEsquemaDuplicado(draftNuevo, "Camisas", "esq-nuevo"),
  null,
);

console.log("ok nombre-esquema");
