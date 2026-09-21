import assert from "node:assert/strict";
import {
  siguienteColorEnLista,
  siguienteTallaEnEsquema,
} from "../src/lib/captura-tallas.ts";

assert.equal(siguienteTallaEnEsquema(["8", "10", "12"], "8"), "10");
assert.equal(siguienteTallaEnEsquema(["8", "10", "12"], "10"), "12");
assert.equal(siguienteTallaEnEsquema(["8", "10", "12"], "12"), null);
assert.equal(siguienteTallaEnEsquema([], "8"), null);
assert.equal(siguienteTallaEnEsquema([""], ""), null);
assert.equal(siguienteTallaEnEsquema(["2", "4", "6"], "4"), "6");

assert.equal(siguienteColorEnLista(["rojo", "azul", "verde"], "rojo"), "azul");
assert.equal(siguienteColorEnLista(["rojo", "azul", "verde"], "verde"), null);
assert.equal(siguienteColorEnLista([], "rojo"), null);
assert.equal(siguienteColorEnLista(["rojo"], "rojo"), null);

console.log("ok captura-tallas");
