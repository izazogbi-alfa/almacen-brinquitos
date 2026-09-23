import assert from "node:assert/strict";
import {
  siguienteColorEnLista,
  siguienteTallaEnEsquema,
  colorAnteriorEnLista,
  tallaAnteriorEnEsquema,
  destinoSaltarColor,
  destinoRegresarColor,
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

assert.equal(colorAnteriorEnLista(["rojo", "azul", "verde"], "azul"), "rojo");
assert.equal(colorAnteriorEnLista(["rojo", "azul", "verde"], "rojo"), null);
assert.equal(colorAnteriorEnLista(["rojo"], "rojo"), null);

assert.equal(tallaAnteriorEnEsquema(["8", "10", "12"], "10"), "8");
assert.equal(tallaAnteriorEnEsquema(["8", "10", "12"], "8"), null);
assert.equal(tallaAnteriorEnEsquema(["8", "10", "12"], "12"), "10");
assert.equal(tallaAnteriorEnEsquema([], "8"), null);

const tallas = ["8", "10", "12"];
const colores = ["blanco", "negro", "rojo"];
assert.deepEqual(
  destinoSaltarColor({
    eje: "talla",
    colores,
    color: "blanco",
    tallas,
    talla: "10",
  }),
  { color: "negro", talla: "10" },
);
assert.equal(
  destinoSaltarColor({
    eje: "talla",
    colores,
    color: "rojo",
    tallas,
    talla: "10",
  }),
  null,
);
assert.deepEqual(
  destinoRegresarColor({
    eje: "talla",
    colores,
    color: "negro",
    tallas,
    talla: "12",
  }),
  { color: "blanco", talla: "12" },
);
assert.deepEqual(
  destinoSaltarColor({
    eje: "color",
    colores,
    color: "blanco",
    tallas,
    talla: "12",
  }),
  { color: "negro", talla: "8" },
);

console.log("ok captura-tallas");
