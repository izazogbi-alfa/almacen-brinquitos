import assert from "node:assert/strict";
import {
  esTodoMayusculas,
  listaTallas,
  listaTitulo,
  nombreArticuloAlGuardar,
  tituloEtiqueta,
  tituloNombreArticulo,
  tituloTalla,
} from "../src/lib/titulo-etiqueta.ts";

assert.equal(tituloEtiqueta("blanco"), "Blanco");
assert.equal(tituloEtiqueta("ROJO"), "Rojo");
assert.equal(tituloEtiqueta("cuello en v"), "Cuello en V");
assert.equal(tituloEtiqueta("ropa de niña iza"), "Ropa de Niña Iza");
assert.equal(tituloEtiqueta("Único"), "Único");
assert.equal(tituloEtiqueta("  azul marino  "), "Azul Marino");

assert.equal(tituloTalla("8"), "8");
assert.equal(tituloTalla("10"), "10");
assert.equal(tituloTalla("1x"), "1X");
assert.equal(tituloTalla("1X"), "1X");
assert.equal(tituloTalla("CHICO"), "Chico");
assert.equal(tituloTalla("EXCHICO"), "Exchico");

assert.deepEqual(listaTitulo(["blanco", "Blanco", "rojo"]), ["Blanco", "Rojo"]);
assert.deepEqual(listaTallas(["8", "1x", "10"]), ["8", "1X", "10"]);

assert.equal(esTodoMayusculas("CAMISA C/ PALOMA"), true);
assert.equal(esTodoMayusculas("Camisa"), false);
assert.equal(
  nombreArticuloAlGuardar("CAMISA C/ PALOMA 44 AL 50"),
  "Camisa C/ Paloma 44 al 50",
);
assert.equal(nombreArticuloAlGuardar("Camisa nueva"), "Camisa nueva");
assert.equal(tituloNombreArticulo("CAMISA NIÑO"), "Camisa Niño");
assert.equal(tituloNombreArticulo("Camisa de niño"), "Camisa de Niño");

console.log("ok titulo-etiqueta");
