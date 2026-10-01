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
import { estiloPdfDeArticulo, normalizarCatalogos, orientacionPdfDeArticulo } from "../src/lib/catalogos.ts";
import { FOTO_CLAVE_MM } from "../src/lib/pdf-foto.ts";
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
assert.equal(orientacionPdfDeArticulo(producto, catalogos), "horizontal");
assert.equal(FOTO_CLAVE_MM, 30);

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
assert.equal(bloques[0].orientacionPdf, "horizontal");
assert.equal(bloques[0].foto, undefined);

const catalogoVertical = normalizarCatalogos({
  ...catalogos,
  esquemas: [{ ...catalogos.esquemas[0], orientacionPdf: "vertical" }],
});
const bloquesVertical = bloquesDesdeCeldas(
  [
    {
      productoId: "p-330",
      sku: "330",
      nombre: "Playera básica",
      color: "blanco",
      talla: "2",
      cantidad: 1,
    },
  ],
  { productos: [producto], catalogos: catalogoVertical },
);
assert.equal(bloquesVertical[0].orientacionPdf, "vertical");
assert.equal(catalogoVertical.esquemas[0].orientacionPdf, "vertical");

const conFoto = normalizarCatalogos({
  ...catalogos,
  esquemas: [{ ...catalogos.esquemas[0], fotoEnPdf: true }],
});
assert.equal(conFoto.esquemas[0].fotoEnPdf, true);
const sinBandera = normalizarCatalogos({
  esquemas: [{ ...catalogos.esquemas[0], fotoEnPdf: false }],
  colores: catalogos.colores,
  tallas: catalogos.tallas,
  especificaciones: [],
});
assert.equal(sinBandera.esquemas[0].fotoEnPdf, undefined);
const bloquesFoto = bloquesDesdeCeldas(
  [
    {
      productoId: "p-330",
      sku: "330",
      nombre: "Playera básica",
      color: "blanco",
      talla: "2",
      cantidad: 1,
    },
  ],
  {
    productos: [{ ...producto, foto: "/productos/catalogo/330.jpg" }],
    catalogos: conFoto,
  },
);
assert.equal(bloquesFoto[0].foto, "/productos/catalogo/330.jpg");

const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const conImagen = construirPdfBloques(
  "Existencias",
  [],
  [{ ...bloques[0], foto: PNG }],
  { tituloDoc: "Existencias", claveSolo: true },
);
const sinImagen = construirPdfBloques(
  "Existencias",
  [],
  [{ ...bloques[0], foto: undefined }],
  { tituloDoc: "Existencias", claveSolo: true },
);
assert.ok(
  conImagen.output("arraybuffer").byteLength >
    sinImagen.output("arraybuffer").byteLength,
);

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

const vertical = construirPdfBloques(
  "Existencias",
  [],
  [{ ...bloque, orientacionPdf: "vertical", estiloPdf: "compacto" }],
  { tituloDoc: "Existencias", orientacionPdf: "horizontal" },
);
assert.ok(
  vertical.internal.pageSize.getWidth() < vertical.internal.pageSize.getHeight(),
);
assert.ok(
  compacto.internal.pageSize.getWidth() > compacto.internal.pageSize.getHeight(),
);

const coloresLargos = [
  "Blanco",
  "Hueso",
  "Rosa",
  "Gris",
  "Arena",
  "Mostaza",
  "Vino",
  "Negro",
  "Palo de Rosa",
  "Fiusha",
  "Turquesa",
  "Lila",
  "Coral",
  "Rojo",
  "Menta",
  "Morada",
  "Jade",
  "Petroleo",
  "Gris Oxford",
  "Bugambilia",
  "Aqua",
  "Azul Rey",
  "Mango",
  "Marino",
  "Cafe",
  "Botella",
  "Celeste",
  "Oro",
  "Plata",
  "Champagne",
  "Verde Bandera",
  "Verde Limon",
  "Verde Musgo",
  "Rojo Quemado",
  "Morado",
  "Lila Fuerte",
  "Naranja",
  "Azul Fuerte",
  "Cobre",
  "Cafe Claro",
];
function bloqueColores(sku: string, colores: string[]): BloquePrenda {
  return {
    key: sku,
    productoId: sku,
    sku,
    nombre: "Mono tuxedo",
    sucursalId: "",
    sucursalNombre: "",
    estiloPdf: "compacto",
    orientacionPdf: "vertical",
    foto: PNG,
    tallas: [],
    filas: colores.map((color, i) => ({
      keys: [`${sku}-${i}`],
      color,
      porTalla: { "Cant.": i + 1 },
    })),
  };
}
const muchosColores = construirPdfBloques(
  "Existencias",
  [],
  [
    bloqueColores("SM9111", coloresLargos),
    bloqueColores("SM9113", ["Blanco", "Plata", "Cafe Claro"]),
  ],
  { tituloDoc: "Existencias", claveSolo: true, estiloPdf: "compacto" },
);
assert.ok(muchosColores.getNumberOfPages() >= 2);
assert.ok(
  muchosColores.internal.pageSize.getWidth() <
    muchosColores.internal.pageSize.getHeight(),
);
const textoMuchos = muchosColores.internal.pages.join("\n");
assert.ok(textoMuchos.includes("SM9111"));
assert.ok(textoMuchos.includes("SM9113"));
assert.ok(textoMuchos.includes("Blanco"));
assert.ok(textoMuchos.includes("Cafe Claro"));
assert.ok(textoMuchos.includes("Verde Musgo"));

function textoDe(doc: { internal: { pages: unknown[] } }) {
  return doc.internal.pages.join("\n");
}

const recepcionLarga = construirPdfBloques(
  "Entrada de mercancía",
  [],
  [
    {
      ...bloqueColores("XP2001", coloresLargos),
      sucursalNombre: "La Gloria",
      tallas: ["Chico", "Mediano", "Grande"],
      filas: coloresLargos.map((color, i) => ({
        keys: [`XP2001-${i}`],
        color,
        porTalla: { Chico: i, Mediano: i + 1, Grande: 1 },
      })),
    },
  ],
  {
    tituloDoc: "Entrada de mercancía",
    claveSolo: false,
    estiloPdf: "compacto",
  },
);
assert.ok(recepcionLarga.getNumberOfPages() >= 2);
assert.ok(textoDe(recepcionLarga).includes("Cafe Claro"));
assert.ok(textoDe(recepcionLarga).includes("XP2001"));
assert.ok(textoDe(recepcionLarga).includes("La Gloria"));

const pedidoLargo = construirPdfBloques(
  "Pedido PD-9",
  ["Proveedor: Tela Iza"],
  [
    {
      ...bloqueColores("RN5907", coloresLargos),
      codigoProveedor: "PROV-8841",
      sucursalNombre: "Centro",
    },
  ],
  {
    tituloDoc: "Pedido PD-9",
    claveSolo: false,
    columnaCodProveedor: true,
    estiloPdf: "compacto",
  },
);
assert.ok(pedidoLargo.getNumberOfPages() >= 2);
const textoPedido = textoDe(pedidoLargo);
assert.ok(textoPedido.includes("RN5907"));
assert.ok(textoPedido.includes("Cafe Claro"));
assert.ok(textoPedido.includes("PROV-8841"));
assert.ok(textoPedido.includes("proveedor"));
assert.ok(textoPedido.includes("Tela Iza"));

console.log("ok pdf-estilos", {
  compactoPages: compacto.getNumberOfPages(),
  detalladoPages: det.getNumberOfPages(),
  muchosColoresPages: muchosColores.getNumberOfPages(),
  recepcionPages: recepcionLarga.getNumberOfPages(),
  pedidoPages: pedidoLargo.getNumberOfPages(),
  colorDetallado: detalladoLay.colColor,
  colProveedor: pedidoLay.colProveedor,
});
