import assert from "node:assert/strict";
import { PDF_COLORES } from "../src/lib/pdf-colores.ts";
import {
  layoutCajasTalla,
  PDF_ANCHO_CARTA_HORIZONTAL_MM,
  PDF_JSPDF,
} from "../src/lib/pdf-layout.ts";

assert.equal(PDF_JSPDF.orientation, "landscape");
assert.equal(PDF_JSPDF.format, "letter");

const distinct = new Set(
  [
    PDF_COLORES.tituloFondo,
    PDF_COLORES.claveFondo,
    PDF_COLORES.headerFondo,
    PDF_COLORES.tallaHeaderFondo,
    PDF_COLORES.totalFondo,
    PDF_COLORES.colorColFondo,
  ].map((c) => c.join(",")),
);
assert.equal(distinct.size, 6);

assert.ok(PDF_COLORES.tituloFondo[1] > 100, "teal header");
assert.ok(PDF_COLORES.tallaHeaderFondo[0] > 180, "amber size boxes");
assert.ok(PDF_COLORES.totalFondo[1] < PDF_COLORES.claveFondo[1]);

const xc = layoutCajasTalla(32, PDF_ANCHO_CARTA_HORIZONTAL_MM);
assert.equal(xc.colTalla, 8);

console.log("ok pdf-colores", {
  titulo: PDF_COLORES.tituloFondo,
  clave: PDF_COLORES.claveFondo,
  header: PDF_COLORES.headerFondo,
  tallas: PDF_COLORES.tallaHeaderFondo,
  total: PDF_COLORES.totalFondo,
});
