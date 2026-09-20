import { jsPDF } from "jspdf";
import {
  etiquetaColor,
  totalesDeBloque,
  type BloquePrenda,
} from "@/lib/tabla-bloques";
import { PDF_COLORES } from "@/lib/pdf-colores";
import {
  layoutCajasTalla,
  PDF_JSPDF,
  PDF_MARGEN_MM,
} from "@/lib/pdf-layout";

export type EncabezadoInforme = {
  tituloDoc: string;
  empresa?: string;
  logoDataUrl?: string;
  sucursal?: string;
  fecha?: string;
  quien?: string;
};

export function encabezadoInforme(
  ident: { empresaNombre?: string; logoDataUrl?: string } | null | undefined,
  extra: {
    tituloDoc: string;
    sucursal?: string;
    fecha?: string;
    quien?: string;
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

function dibujarBloque(
  doc: jsPDF,
  bloque: BloquePrenda,
  y0: number,
  encabezado: EncabezadoInforme,
) {
  let y = y0;
  const tallas = bloque.tallas.length ? bloque.tallas : ["Cant."];
  const anchoPagina = doc.internal.pageSize.getWidth();
  const layout = layoutCajasTalla(tallas.length, anchoPagina, PDF_MARGEN_MM);
  const { colColor, colTalla, anchoTabla } = layout;
  const totales = totalesDeBloque({ ...bloque, tallas });

  y = asegurarEspacio(doc, y, ALTO_CLAVE + 8, encabezado);
  fill(doc, PDF_COLORES.claveFondo);
  stroke(doc, PDF_COLORES.borde);
  doc.rect(PDF_MARGEN_MM, y - 4, anchoTabla, ALTO_CLAVE + 2, "FD");
  ink(doc, PDF_COLORES.claveTexto);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(plano(bloque.sku), PDF_MARGEN_MM + 2, y + 2, {
    maxWidth: Math.max(8, anchoTabla - 4),
  });
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  ink(doc, PDF_COLORES.subClave);
  const sub = [bloque.nombre, bloque.sucursalNombre]
    .filter(Boolean)
    .join(" · ");
  if (sub) {
    const wrapped = doc.splitTextToSize(plano(sub), Math.max(8, anchoTabla - 4));
    doc.text(wrapped[0] ?? "", PDF_MARGEN_MM + 2, y + 1, {
      maxWidth: Math.max(8, anchoTabla - 4),
    });
    y += 5;
  }
  y += 4;

  const filasDatos = bloque.filas.map((f) => [
    etiquetaColor(f),
    ...tallas.map((t) => {
      const n = f.porTalla[t];
      return n == null ? "" : String(n);
    }),
  ]);
  const filaHeader = ["Color", ...tallas.map((t) => t || "Cant.")];
  const filaTotal = [
    "Total",
    ...tallas.map((t) => String(totales.porTalla[t] ?? 0)),
  ];
  const filas = [filaHeader, ...filasDatos, filaTotal];
  const altoTabla = ALTO_FILA * filas.length;
  y = asegurarEspacio(doc, y, altoTabla + 6, encabezado);

  const fuenteTalla = colTalla < 12 ? 6 : colTalla < 18 ? 7 : 8;
  const fuenteColor = colColor < 22 ? 6 : 8;

  filas.forEach((cells, ri) => {
    const esHeader = ri === 0;
    const esTotal = ri === filas.length - 1;
    let x = PDF_MARGEN_MM;
    cells.forEach((cell, ci) => {
      const w = ci === 0 ? colColor : colTalla;
      stroke(doc, PDF_COLORES.borde);
      if (esHeader && ci === 0) fill(doc, PDF_COLORES.headerFondo);
      else if (esHeader) fill(doc, PDF_COLORES.tallaHeaderFondo);
      else if (esTotal) fill(doc, PDF_COLORES.totalFondo);
      else if (ci === 0) fill(doc, PDF_COLORES.colorColFondo);
      else fill(doc, ri % 2 === 0 ? PDF_COLORES.tallaPar : PDF_COLORES.tallaImpar);
      doc.rect(x, y, w, ALTO_FILA, "FD");
      if (esHeader && ci === 0) ink(doc, PDF_COLORES.headerTexto);
      else if (esHeader) ink(doc, PDF_COLORES.tallaHeaderTexto);
      else if (esTotal) ink(doc, PDF_COLORES.totalTexto);
      else ink(doc, [15, 23, 42]);
      doc.setFont(
        "helvetica",
        esHeader || esTotal || ci === 0 ? "bold" : "normal",
      );
      doc.setFontSize(ci === 0 ? fuenteColor : fuenteTalla);
      const txt = plano(cell);
      if (ci === 0) {
        if (w >= 4) {
          doc.text(txt, x + 1.2, y + 5.4, {
            maxWidth: Math.max(2, w - 2.2),
          });
        }
      } else {
        doc.text(txt, x + w / 2, y + 5.4, {
          align: "center",
          maxWidth: Math.max(2, w - 1),
        });
      }
      x += w;
    });
    y += ALTO_FILA;
  });

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
  };
  const anchoUtil = doc.internal.pageSize.getWidth() - PDF_MARGEN_MM * 2;
  let y = dibujarEncabezadoPagina(doc, cabe);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  ink(doc, PDF_COLORES.nota);
  for (const nota of notas) {
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
      plano("Sin lineas en la tabla. Un articulo sin esquema no usa tallas de fabrica."),
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
