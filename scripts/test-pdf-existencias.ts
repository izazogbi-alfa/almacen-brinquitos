import assert from "node:assert/strict";
import { esPdfExistencias, notasPdfInforme } from "../src/lib/pdf-clave.ts";

assert.equal(esPdfExistencias("Existencias"), true);
assert.equal(esPdfExistencias("Brinquitos · Existencias"), true);
assert.equal(esPdfExistencias("Entrada de mercancía"), false);
assert.equal(esPdfExistencias("Brinquitos · Pedido"), false);

assert.deepEqual(
  notasPdfInforme(["Esquema: Ropa de niña Iza. Tallas del esquema: 2, 4", "Claves: XC1092"], true),
  ["Claves: XC1092"],
);
assert.deepEqual(
  notasPdfInforme(["Esquema: Ropa de niña Iza", "Artículos: XC1092 Camisa"], false),
  ["Esquema: Ropa de niña Iza", "Artículos: XC1092 Camisa"],
);

console.log("ok pdf existencias clave-only");
