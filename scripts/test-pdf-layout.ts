import assert from "node:assert/strict";
import {
  ANCHO_TALLA_MAX_MM,
  ANCHO_TALLA_MIN_MM,
  layoutCajasTalla,
  PDF_ANCHO_CARTA_HORIZONTAL_MM,
  PDF_MARGEN_MM,
} from "../src/lib/pdf-layout.ts";

const anchoUtil = PDF_ANCHO_CARTA_HORIZONTAL_MM - PDF_MARGEN_MM * 2;

const pocas = layoutCajasTalla(3);
assert.equal(pocas.colTalla, ANCHO_TALLA_MAX_MM);
assert.ok(pocas.colTalla <= ANCHO_TALLA_MAX_MM);
assert.equal(pocas.n, 3);
assert.ok(pocas.anchoTabla <= anchoUtil + 1e-9);

const letra = layoutCajasTalla(6);
assert.ok(letra.colTalla <= ANCHO_TALLA_MAX_MM);
assert.ok(letra.colTalla >= ANCHO_TALLA_MIN_MM);
assert.ok(letra.anchoTabla <= anchoUtil + 1e-9);

const nino = layoutCajasTalla(31);
assert.equal(nino.colTalla, ANCHO_TALLA_MIN_MM);
assert.ok(nino.colColor + nino.colTalla * 31 <= anchoUtil + 1e-9);

const xc = layoutCajasTalla(32);
assert.equal(xc.colTalla, ANCHO_TALLA_MIN_MM);
assert.ok(xc.colColor + xc.colTalla * 32 <= anchoUtil + 1e-9);
assert.equal(xc.n, 32);

const medio = layoutCajasTalla(10);
assert.ok(medio.colTalla >= ANCHO_TALLA_MIN_MM);
assert.ok(medio.colTalla <= ANCHO_TALLA_MAX_MM);
assert.ok(Math.abs(medio.anchoTabla - anchoUtil) < 0.05);

console.log("ok pdf-layout", {
  pocas,
  letra,
  nino,
  xc,
  medio,
  anchoUtil,
});
