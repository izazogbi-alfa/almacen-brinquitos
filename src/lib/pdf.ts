import { jsPDF } from "jspdf";
import {
  etiquetaColor,
  totalesDeBloque,
  type BloquePrenda,
  type FilaColorBloque,
} from "@/lib/tabla-bloques";
import { PDF_COLORES } from "@/lib/pdf-colores";
import {
  ANCHO_COD_PROVEEDOR_MM,
  ANCHO_COLOR_DETALLADO_MM,
  ANCHO_COLOR_PREF_MM,
  layoutCajasTalla,
  PDF_JSPDF,
  PDF_MARGEN_MM,
} from "@/lib/pdf-layout";
import { esPdfExistencias, notasPdfInforme } from "@/lib/pdf-clave";
import {
  fuenteParaAncho,
  lineaClaveNombre,
  textoParaAncho,
} from "@/lib/pdf-celda";
import type { EstiloPdf } from "@/lib/pdf-estilo";
import { tituloTalla } from "@/lib/titulo-etiqueta";

export { esPdfExistencias } from "@/lib/pdf-clave";

export type EncabezadoInforme = {
  tituloDoc: string;
  empresa?: string;
  logoDataUrl?: string;
  sucursal?: string;
  fecha?: string;
  quien?: string;
  /** Existencias: franja verde solo con la Clave, sin nombre ni esquema. */
  claveSolo?: boolean;
  estiloPdf?: EstiloPdf;
  /** Pedidos: columna Cód. proveedor junto al color. */
  columnaCodProveedor?: boolean;
};

export function encabezadoInforme(
  ident: { empresaNombre?: string; logoDataUrl?: string } | null | undefined,
  extra: {
    tituloDoc: string;
    sucursal?: string;
    fecha?: string;
    quien?: string;
    claveSolo?: boolean;
    estiloPdf?: EstiloPdf;
    columnaCodProveedor?: boolean;
  },
): EncabezadoInforme {
  const empresa = ident?.empresaNombre?.trim();
  return {
    tituloDoc: extra.tituloDoc,
    empresa: empresa || "Brinquitos",
    logoDataUrl: ident?.logoDataUrl,
    sucursal: extra.sucursal,
    fecha: extra.fecha,
    quien: extra.quien,
    claveSolo: extra.claveSolo ?? esPdfExistencias(extra.tituloDoc),
    estiloPdf: extra.estiloPdf ?? "compacto",
    columnaCodProveedor:
      extra.columnaCodProveedor ?? /pedido/i.test(extra.tituloDoc),
  };
}

function plano(texto: string) {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function fill(doc: jsPDF, rgb: readonly [number, number, number]) {
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
}

function stroke(doc: jsPDF, rgb: readonly [number, number, number]) {
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
}

function ink(doc: jsPDF, rgb: readonly [number, number, number]) {
  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
}

function nuevoDoc() {
  return new jsPDF(PDF_JSPDF);
}

export function descargarPdf(
  archivo: string,
  titulo: string,
  lineas: string[],
) {
  construirPdfLineas(titulo, lineas).save(archivo);
}

export function construirPdfLineas(
  titulo: string,
  lineas: string[],
  encabezado?: Partial<EncabezadoInforme>,
) {
  const doc = nuevoDoc();
  const cabe: EncabezadoInforme = {
    tituloDoc: encabezado?.tituloDoc ?? titulo,
    empresa: encabezado?.empresa,
    logoDataUrl: encabezado?.logoDataUrl,
    sucursal: encabezado?.sucursal,
    fecha: encabezado?.fecha,
    quien: encabezado?.quien,
  };
  const anchoUtil = doc.internal.pageSize.getWidth() - PDF_MARGEN_MM * 2;
  const altoPagina = doc.internal.pageSize.getHeight();
  const y0 = dibujarEncabezadoPagina(doc, cabe);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  ink(doc, PDF_COLORES.nota);
  let y = y0;
  for (const linea of lineas) {
    const wrapped = doc.splitTextToSize(plano(linea), anchoUtil);
    for (const row of wrapped) {
      if (y > altoPagina - 12) {
        doc.addPage();
        y = dibujarEncabezadoPagina(doc, cabe);
        ink(doc, PDF_COLORES.nota);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
      }
      doc.text(row, PDF_MARGEN_MM, y);
      y += 6;
    }
  }
  return doc;
}

const ALTO_FILA = 8;
const ALTO_FILA_DATOS_DETALLE = 12;
const ALTO_CLAVE = 12;

function asegurarEspacio(
  doc: jsPDF,
  y: number,
  alto: number,
  encabezado: EncabezadoInforme,
): number {
  const limite = doc.internal.pageSize.getHeight() - 10;
  if (y + alto <= limite) return y;
  doc.addPage();
  return dibujarEncabezadoPagina(doc, encabezado);
}

function dibujarEncabezadoPagina(doc: jsPDF, encabezado: EncabezadoInforme) {
  const w = doc.internal.pageSize.getWidth();
  const margen = PDF_MARGEN_MM;
  const empresa = plano(encabezado.empresa?.trim() || "Brinquitos");
  const titulo = plano(encabezado.tituloDoc);
  let xTexto = margen;
  const yLogo = 7;
  const altoLogo = 14;
  if (encabezado.logoDataUrl) {
    try {
      const fmt = encabezado.logoDataUrl.includes("image/jpeg")
        ? "JPEG"
        : "PNG";
      doc.addImage(encabezado.logoDataUrl, fmt, margen, yLogo, 16, altoLogo);
      xTexto = margen + 19;
    } catch {
      xTexto = margen;
    }
  }
  ink(doc, [15, 23, 42]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(empresa, xTexto, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(titulo, w - margen, 12, { align: "right" });
  const metaIzq = [encabezado.sucursal, encabezado.fecha]
    .map((s) => s?.trim())
    .filter(Boolean)
    .join("  ·  ");
  const quien = encabezado.quien?.trim();
  doc.setFontSize(9);
  ink(doc, [51, 65, 85]);
  if (metaIzq) {
    doc.text(plano(metaIzq), xTexto, 18);
  }
  if (quien) {
    const esPedido = /pedido/i.test(encabezado.tituloDoc);
    doc.setFont("helvetica", esPedido ? "bold" : "normal");
    doc.setFontSize(esPedido ? 10 : 9);
    doc.text(plano(`Hecho por: ${quien}`), w - margen, 18, {
      align: "right",
    });
  }
  stroke(doc, [203, 213, 225]);
  doc.setLineWidth(0.35);
  doc.line(margen, 22, w - margen, 22);
  ink(doc, [15, 23, 42]);
  return 28;
}

function pintarCaja(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  fondo: readonly [number, number, number],
) {
  fill(doc, fondo);
  stroke(doc, PDF_COLORES.borde);
  doc.rect(x, y, w, h, "FD");
}

function dibujarCeldaColor(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  fila: FilaColorBloque,
  bloque: BloquePrenda,
  detallado: boolean,
) {
  pintarCaja(doc, x, y, w, h, PDF_COLORES.colorColFondo);
  if (w < 4) return;
  const pad = 1.4;
  const anchoTxt = Math.max(2, w - pad * 2);
  const color = plano(etiquetaColor(fila));
  ink(doc, [15, 23, 42]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(w < 22 ? 7 : 8);
  if (detallado) {
    doc.text(textoParaAncho(doc, color, anchoTxt), x + pad, y + 4.2, {
      maxWidth: anchoTxt,
    });
    const identidad = plano(lineaClaveNombre(bloque.sku, bloque.nombre));
    doc.setFont("helvetica", "normal");
    const fuenteNom = fuenteParaAncho(doc, identidad, anchoTxt);
    doc.setFontSize(fuenteNom);
    doc.text(textoParaAncho(doc, identidad, anchoTxt), x + pad, y + h - 2.4, {
      maxWidth: anchoTxt,
    });
    return;
  }
  doc.text(textoParaAncho(doc, color, anchoTxt), x + pad, y + h / 2 + 1.1, {
    maxWidth: anchoTxt,
  });
}

function dibujarBloque(
  doc: jsPDF,
  bloque: BloquePrenda,
  y0: number,
  encabezado: EncabezadoInforme,
) {
  let y = y0;
  const tallas = bloque.tallas.length ? bloque.tallas : ["Cant."];
  const detallado = (bloque.estiloPdf ?? encabezado.estiloPdf) === "detallado";
  const pideProveedor = Boolean(encabezado.columnaCodProveedor);
  const anchoPagina = doc.internal.pageSize.getWidth();
  const layout = layoutCajasTalla(
    tallas.length,
    anchoPagina,
    PDF_MARGEN_MM,
    pideProveedor ? ANCHO_COD_PROVEEDOR_MM : 0,
    detallado ? ANCHO_COLOR_DETALLADO_MM : ANCHO_COLOR_PREF_MM,
  );
  const { colColor, colTalla, colProveedor, anchoTabla } = layout;
  const conProveedor = pideProveedor && colProveedor >= 8;
  const totales = totalesDeBloque({ ...bloque, tallas });
  const altoDatos = detallado ? ALTO_FILA_DATOS_DETALLE : ALTO_FILA;
  const altoTabla = ALTO_FILA + altoDatos * bloque.filas.length + ALTO_FILA;
  const identidad = plano(lineaClaveNombre(bloque.sku, bloque.nombre));

  y = asegurarEspacio(doc, y, ALTO_CLAVE + 10 + altoTabla, encabezado);
  fill(doc, PDF_COLORES.claveFondo);
  stroke(doc, PDF_COLORES.borde);
  const soloClave = Boolean(encabezado.claveSolo);
  const altoBanda = soloClave ? 10 : ALTO_CLAVE;
  doc.rect(PDF_MARGEN_MM, y - 4, anchoTabla, altoBanda, "FD");
  ink(doc, PDF_COLORES.claveTexto);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(soloClave ? 13 : 11);
  doc.text(plano(bloque.sku), PDF_MARGEN_MM + 2, y + 2, {
    maxWidth: Math.max(8, anchoTabla - 4),
  });
  y += 6;
  if (!soloClave && bloque.sucursalNombre?.trim()) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    ink(doc, PDF_COLORES.subClave);
    doc.text(plano(bloque.sucursalNombre), PDF_MARGEN_MM + 2, y + 1, {
      maxWidth: Math.max(8, anchoTabla - 4),
    });
    y += 5;
  }
  y += 4;

  if (!detallado && identidad) {
    ink(doc, [15, 23, 42]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(identidad, PDF_MARGEN_MM, y, {
      maxWidth: Math.max(8, anchoTabla),
    });
    y += 5;
  }

  const fuenteTalla = colTalla < 12 ? 6 : colTalla < 18 ? 7 : 8;
  const headersTalla = tallas.map((t) =>
    t && t !== "Cant." ? tituloTalla(t) : t || "Cant.",
  );

  function celdasTalla(
    valores: string[],
    alto: number,
    fondoTalla: () => readonly [number, number, number],
    tinta: readonly [number, number, number],
    negrita: boolean,
  ) {
    let x = PDF_MARGEN_MM + colColor + (conProveedor ? colProveedor : 0);
    valores.forEach((cell) => {
      pintarCaja(doc, x, y, colTalla, alto, fondoTalla());
      ink(doc, tinta);
      doc.setFont("helvetica", negrita ? "bold" : "normal");
      doc.setFontSize(fuenteTalla);
      doc.text(plano(cell), x + colTalla / 2, y + alto / 2 + 1.1, {
        align: "center",
        maxWidth: Math.max(2, colTalla - 1),
      });
      x += colTalla;
    });
  }

  pintarCaja(doc, PDF_MARGEN_MM, y, colColor, ALTO_FILA, PDF_COLORES.headerFondo);
  ink(doc, PDF_COLORES.headerTexto);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Color", PDF_MARGEN_MM + 1.4, y + 5.4);
  if (conProveedor) {
    pintarCaja(
      doc,
      PDF_MARGEN_MM + colColor,
      y,
      colProveedor,
      ALTO_FILA,
      PDF_COLORES.headerFondo,
    );
    doc.text("Cod. proveedor", PDF_MARGEN_MM + colColor + colProveedor / 2, y + 5.4, {
      align: "center",
      maxWidth: Math.max(4, colProveedor - 1.5),
    });
  }
  celdasTalla(
    headersTalla,
    ALTO_FILA,
    () => PDF_COLORES.tallaHeaderFondo,
    PDF_COLORES.tallaHeaderTexto,
    true,
  );
  y += ALTO_FILA;

  bloque.filas.forEach((fila, ri) => {
    dibujarCeldaColor(
      doc,
      PDF_MARGEN_MM,
      y,
      colColor,
      altoDatos,
      fila,
      bloque,
      detallado,
    );
    if (conProveedor) {
      pintarCaja(
        doc,
        PDF_MARGEN_MM + colColor,
        y,
        colProveedor,
        altoDatos,
        ri % 2 === 0 ? PDF_COLORES.tallaPar : PDF_COLORES.tallaImpar,
      );
      const cod = plano(bloque.codigoProveedor ?? "");
      ink(doc, [15, 23, 42]);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      if (cod) {
        doc.text(
          textoParaAncho(doc, cod, colProveedor - 2),
          PDF_MARGEN_MM + colColor + colProveedor / 2,
          y + altoDatos / 2 + 1.1,
          {
            align: "center",
            maxWidth: Math.max(3, colProveedor - 2),
          },
        );
      }
    }
    celdasTalla(
      tallas.map((t) => {
        const n = fila.porTalla[t];
        return n == null ? "" : String(n);
      }),
      altoDatos,
      () => (ri % 2 === 0 ? PDF_COLORES.tallaPar : PDF_COLORES.tallaImpar),
      [15, 23, 42],
      false,
    );
    y += altoDatos;
  });

  pintarCaja(doc, PDF_MARGEN_MM, y, colColor, ALTO_FILA, PDF_COLORES.totalFondo);
  ink(doc, PDF_COLORES.totalTexto);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Total", PDF_MARGEN_MM + 1.4, y + 5.4);
  if (conProveedor) {
    pintarCaja(
      doc,
      PDF_MARGEN_MM + colColor,
      y,
      colProveedor,
      ALTO_FILA,
      PDF_COLORES.totalFondo,
    );
  }
  celdasTalla(
    tallas.map((t) => String(totales.porTalla[t] ?? 0)),
    ALTO_FILA,
    () => PDF_COLORES.totalFondo,
    PDF_COLORES.totalTexto,
    true,
  );
  y += ALTO_FILA;

  ink(doc, PDF_COLORES.nota);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  y += 4;
  doc.text(plano(`Total piezas: ${totales.piezas}`), PDF_MARGEN_MM, y);
  return y + 6;
}

export function construirPdfBloques(
  titulo: string,
  notas: string[],
  bloques: BloquePrenda[],
  encabezado?: Partial<EncabezadoInforme>,
) {
  const doc = nuevoDoc();
  const cabe: EncabezadoInforme = {
    tituloDoc: encabezado?.tituloDoc ?? titulo,
    empresa: encabezado?.empresa,
    logoDataUrl: encabezado?.logoDataUrl,
    sucursal: encabezado?.sucursal,
    fecha: encabezado?.fecha,
    quien: encabezado?.quien,
    claveSolo:
      encabezado?.claveSolo ??
      esPdfExistencias(encabezado?.tituloDoc ?? titulo),
    estiloPdf: encabezado?.estiloPdf ?? "compacto",
    columnaCodProveedor:
      encabezado?.columnaCodProveedor ??
      /pedido/i.test(encabezado?.tituloDoc ?? titulo),
  };
  const anchoUtil = doc.internal.pageSize.getWidth() - PDF_MARGEN_MM * 2;
  let y = dibujarEncabezadoPagina(doc, cabe);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  ink(doc, PDF_COLORES.nota);
  const notasVisibles = notasPdfInforme(notas, Boolean(cabe.claveSolo));
  for (const nota of notasVisibles) {
    const wrapped = doc.splitTextToSize(plano(nota), anchoUtil);
    for (const row of wrapped) {
      y = asegurarEspacio(doc, y, 5, cabe);
      ink(doc, PDF_COLORES.nota);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(row, PDF_MARGEN_MM, y);
      y += 4.5;
    }
  }
  y += 3;
  if (bloques.length === 0) {
    doc.text(
      plano(
        cabe.claveSolo
          ? "Sin lineas en la tabla."
          : "Sin lineas en la tabla. Un articulo sin esquema no usa tallas de fabrica.",
      ),
      PDF_MARGEN_MM,
      y,
    );
  } else {
    for (const bloque of bloques) {
      y = dibujarBloque(doc, bloque, y, cabe);
    }
  }
  return doc;
}

export function descargarPdfBloques(
  archivo: string,
  titulo: string,
  notas: string[],
  bloques: BloquePrenda[],
  encabezado?: Partial<EncabezadoInforme>,
) {
  construirPdfBloques(titulo, notas, bloques, encabezado).save(archivo);
}

export function blobPdfBloques(
  titulo: string,
  notas: string[],
  bloques: BloquePrenda[],
  encabezado?: Partial<EncabezadoInforme>,
) {
  return construirPdfBloques(titulo, notas, bloques, encabezado).output("blob");
}
