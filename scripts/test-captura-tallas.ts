import assert from "node:assert/strict";
import { coloresDeCaptura } from "../src/lib/asignacion-articulo.ts";
import {
  siguienteColorEnLista,
  siguienteTallaEnEsquema,
  colorAnteriorEnLista,
  colorEnLista,
  tallaAnteriorEnEsquema,
  destinoSaltarColor,
  destinoRegresarColor,
} from "../src/lib/captura-tallas.ts";
import type { Catalogos, Producto } from "../src/lib/types.ts";

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
assert.equal(siguienteColorEnLista(["Blanco", "Negro"], "blanco"), "Negro");
assert.equal(siguienteColorEnLista(["Blanco"], "Rosa"), null);
assert.equal(colorEnLista(["Blanco"], "blanco"), "Blanco");
assert.equal(colorEnLista(["Blanco"], "Rosa"), null);

const catalogos: Catalogos = {
  esquemas: [],
  colores: ["Único", "Blanco", "Rosa", "Azul", "Rojo", "Negro"],
  tallas: [],
  especificaciones: [],
};
const base = {
  id: "p-yt7772",
  sku: "YT7772",
  nombre: "Portatraje",
  categoria: "",
  unidad: "pza",
  existencia: 0,
  minimo: 0,
  ubicacion: "",
} satisfies Producto;
assert.deepEqual(
  coloresDeCaptura({ ...base, colores: ["Negro"] }, catalogos),
  ["Negro"],
);
assert.deepEqual(coloresDeCaptura({ ...base, colores: [] }, catalogos), [
  "Único",
]);
assert.deepEqual(coloresDeCaptura(base, catalogos), ["Único"]);

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
