import { jsPDF } from "jspdf";
import {
  etiquetaColor,
  type BloquePrenda,
} from "@/lib/tabla-bloques";
import {
  layoutCajasTalla,
  PDF_JSPDF,
  PDF_MARGEN_MM,
} from "@/lib/pdf-layout";

function plano(texto: string) {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function nuevoDoc() {
  return new jsPDF(PDF_JSPDF);
}

export function descargarPdf(
  archivo: string,
  titulo: string,
  lineas: string[],
) {
  const doc = nuevoDoc();
  const anchoUtil = doc.internal.pageSize.getWidth() - PDF_MARGEN_MM * 2;
  const altoPagina = doc.internal.pageSize.getHeight();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(plano(titulo), PDF_MARGEN_MM, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  let y = 24;
  for (const linea of lineas) {
    const wrapped = doc.splitTextToSize(plano(linea), anchoUtil);
    for (const row of wrapped) {
      if (y > altoPagina - 12) {
        doc.addPage();
        y = 16;
      }
      doc.text(row, PDF_MARGEN_MM, y);
      y += 6;
    }
  }
  doc.save(archivo);
}

const ALTO_FILA = 8;

function asegurarEspacio(
  doc: jsPDF,
  y: number,
  alto: number,
): number {
  const limite = doc.internal.pageSize.getHeight() - 10;
  if (y + alto <= limite) return y;
  doc.addPage();
  return 14;
}

function dibujarBloque(doc: jsPDF, bloque: BloquePrenda, y0: number) {
  let y = y0;
  const tallas = bloque.tallas.length ? bloque.tallas : ["Cant."];
  const anchoPagina = doc.internal.pageSize.getWidth();
  const layout = layoutCajasTalla(tallas.length, anchoPagina, PDF_MARGEN_MM);
  const { colColor, colTalla } = layout;

  y = asegurarEspacio(doc, y, 16);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(plano(bloque.sku), PDF_MARGEN_MM, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const sub = [bloque.nombre, bloque.sucursalNombre]
    .filter(Boolean)
    .join(" · ");
  if (sub) {
    const wrapped = doc.splitTextToSize(
      plano(sub),
      layout.anchoUtil,
    );
    doc.text(wrapped, PDF_MARGEN_MM, y);
    y += wrapped.length * 4 + 2;
  }

  const altoTabla = ALTO_FILA * (bloque.filas.length + 1);
  y = asegurarEspacio(doc, y, altoTabla + 4);

  const filas = [
    ["Color", ...tallas.map((t) => t || "Cant.")],
    ...bloque.filas.map((f) => [
      etiquetaColor(f),
      ...tallas.map((t) => {
        const n = f.porTalla[t];
        return n == null ? "" : String(n);
      }),
    ]),
  ];

  const fuenteTalla =
    colTalla < 12 ? 6 : colTalla < 18 ? 7 : 8;
  const fuenteColor = colColor < 22 ? 6 : 8;

  filas.forEach((cells, ri) => {
    let x = PDF_MARGEN_MM;
    cells.forEach((cell, ci) => {
      const w = ci === 0 ? colColor : colTalla;
      doc.setDrawColor(40);
      doc.setFillColor(
        ri === 0 ? 230 : 255,
        ri === 0 ? 230 : 255,
        ri === 0 ? 230 : 255,
      );
      doc.rect(x, y, w, ALTO_FILA, "FD");
      doc.setFont(
        "helvetica",
        ri === 0 || ci === 0 ? "bold" : "normal",
      );
      doc.setFontSize(ci === 0 ? fuenteColor : fuenteTalla);
      const txt = plano(cell);
      if (ci === 0) {
        if (w >= 4) {
          doc.text(txt, x + 1.2, y + 5.4, { maxWidth: Math.max(2, w - 2.2) });
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

  return y + 6;
}

export function descargarPdfBloques(
  archivo: string,
  titulo: string,
  notas: string[],
  bloques: BloquePrenda[],
) {
  const doc = nuevoDoc();
  const anchoUtil = doc.internal.pageSize.getWidth() - PDF_MARGEN_MM * 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(plano(titulo), PDF_MARGEN_MM, 14);
  let y = 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  for (const nota of notas) {
    const wrapped = doc.splitTextToSize(plano(nota), anchoUtil);
    for (const row of wrapped) {
      y = asegurarEspacio(doc, y, 5);
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
      y = dibujarBloque(doc, bloque, y);
    }
  }
  doc.save(archivo);
}
