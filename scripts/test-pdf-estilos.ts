import assert from "node:assert/strict";
import { lineaClaveNombre } from "../src/lib/pdf-celda.ts";
import {
  elegirEstiloPdf,
  exigirEstiloPdf,
  MENSAJE_ESTILO_PDF_OBLIGATORIO,
  parseEstiloPdf,
} from "../src/lib/pdf-estilo.ts";
import { construirPdfBloques } from "../src/lib/pdf.ts";
import {
  ANCHO_COLOR_DETALLADO_MM,
  ANCHO_COD_PROVEEDOR_MM,
  layoutCajasTalla,
} from "../src/lib/pdf-layout.ts";
import { estiloPdfDeArticulo, normalizarCatalogos } from "../src/lib/catalogos.ts";
import { bloquesDesdeCeldas } from "../src/lib/tabla-bloques.ts";
import type { BloquePrenda } from "../src/lib/tabla-bloques.ts";
import type { Producto } from "../src/lib/types.ts";

assert.equal(elegirEstiloPdf(undefined), undefined);
assert.equal(elegirEstiloPdf("compacto"), "compacto");
assert.equal(parseEstiloPdf(undefined), "compacto");
assert.equal(parseEstiloPdf("detallado"), "detallado");
assert.throws(
  () => exigirEstiloPdf(undefined),
  (err: unknown) =>
    err instanceof Error && err.message === MENSAJE_ESTILO_PDF_OBLIGATORIO,
);
assert.equal(exigirEstiloPdf("compacto"), "compacto");
assert.equal(lineaClaveNombre("330", "playera básica"), "330 · Playera Básica");

const detalladoLay = layoutCajasTalla(6, undefined, undefined, 0, ANCHO_COLOR_DETALLADO_MM);
assert.equal(detalladoLay.colColor, ANCHO_COLOR_DETALLADO_MM);
assert.ok(detalladoLay.colColor <= 55);

const pedidoLay = layoutCajasTalla(
  6,
  undefined,
  undefined,
  ANCHO_COD_PROVEEDOR_MM,
  ANCHO_COLOR_DETALLADO_MM,
);
assert.equal(pedidoLay.colProveedor, ANCHO_COD_PROVEEDOR_MM);
assert.ok(pedidoLay.anchoTabla <= pedidoLay.anchoUtil + 1e-9);

const catalogos = normalizarCatalogos({
  esquemas: [
    {
      id: "esq-d",
      nombre: "Prueba",
      tallas: ["2", "4", "6"],
      estiloPdf: "detallado",
    },
  ],
  colores: ["blanco"],
  tallas: ["2", "4", "6"],
  especificaciones: [],
});
const producto: Producto = {
  id: "p-330",
  sku: "330",
  nombre: "Playera básica",
  categoria: "",
  unidad: "pza",
  existencia: 0,
  minimo: 0,
  ubicacion: "",
  esquemaConteo: "esq-d",
};
assert.equal(estiloPdfDeArticulo(producto, catalogos), "detallado");

const bloques = bloquesDesdeCeldas(
  [
    {
      productoId: "p-330",
      sku: "330",
      nombre: "Playera básica",
      color: "blanco",
      sucursalId: "s1",
      sucursalNombre: "La Gloria",
      talla: "2",
      cantidad: 3,
    },
  ],
  { productos: [producto], catalogos },
);
assert.equal(bloques[0].estiloPdf, "detallado");

const bloque: BloquePrenda = {
  ...bloques[0],
  codigoProveedor: "PROV-9",
};

const compacto = construirPdfBloques(
  "Existencias",
  ["Esquema: no debe salir"],
  [{ ...bloque, estiloPdf: "compacto" }],
  { tituloDoc: "Existencias", claveSolo: true, estiloPdf: "compacto" },
);
assert.equal(compacto.getNumberOfPages(), 1);

const det = construirPdfBloques(
  "Existencias",
  [],
  [{ ...bloque, estiloPdf: "detallado" }],
  { tituloDoc: "Existencias", claveSolo: true, estiloPdf: "detallado" },
);
assert.equal(det.getNumberOfPages(), 1);

const pedido = construirPdfBloques(
  "Pedido PD-1",
  ["Proveedor: Tela Iza"],
  [{ ...bloque, estiloPdf: "compacto" }],
  {
    tituloDoc: "Pedido PD-1",
    claveSolo: false,
    columnaCodProveedor: true,
  },
);
assert.equal(pedido.getNumberOfPages(), 1);

console.log("ok pdf-estilos", {
  compactoPages: compacto.getNumberOfPages(),
  detalladoPages: det.getNumberOfPages(),
  colorDetallado: detalladoLay.colColor,
  colProveedor: pedidoLay.colProveedor,
});
