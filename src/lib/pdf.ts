import { jsPDF } from "jspdf";
import {
  etiquetaColor,
  type BloquePrenda,
} from "@/lib/tabla-bloques";

function plano(texto: string) {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

export function descargarPdf(
  archivo: string,
  titulo: string,
  lineas: string[],
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(plano(titulo), 14, 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  let y = 28;
  for (const linea of lineas) {
    const wrapped = doc.splitTextToSize(plano(linea), 182);
    for (const row of wrapped) {
      if (y > 280) {
        doc.addPage();
        y = 18;
      }
      doc.text(row, 14, y);
      y += 6;
    }
  }
  doc.save(archivo);
}

const MARGEN = 12;
const ANCHO = 210 - MARGEN * 2;
const ALTO_FILA = 8;
const MAX_TALLAS = 8;

function asegurarEspacio(
  doc: jsPDF,
  y: number,
  alto: number,
): number {
  if (y + alto <= 287) return y;
  doc.addPage();
  return 16;
}

function dibujarBloque(doc: jsPDF, bloque: BloquePrenda, y0: number) {
  let y = y0;
  const chunks: string[][] = [];
  const tallas = bloque.tallas.length ? bloque.tallas : ["Cant."];
  for (let i = 0; i < tallas.length; i += MAX_TALLAS) {
    chunks.push(tallas.slice(i, i + MAX_TALLAS));
  }

  y = asegurarEspacio(doc, y, 16);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(plano(bloque.sku), MARGEN, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const sub = [bloque.nombre, bloque.sucursalNombre]
    .filter(Boolean)
    .join(" · ");
  if (sub) {
    const wrapped = doc.splitTextToSize(plano(sub), ANCHO);
    doc.text(wrapped, MARGEN, y);
    y += wrapped.length * 4 + 2;
  }

  for (const cols of chunks) {
    const colColor = 36;
    const colW = (ANCHO - colColor) / cols.length;
    const altoTabla = ALTO_FILA * (bloque.filas.length + 1);
    y = asegurarEspacio(doc, y, altoTabla + 4);

    const filas = [
      ["Color", ...cols.map((t) => t || "Cant.")],
      ...bloque.filas.map((f) => [
        etiquetaColor(f),
        ...cols.map((t) => {
          const n = f.porTalla[t];
          return n == null ? "" : String(n);
        }),
      ]),
    ];

    filas.forEach((cells, ri) => {
      let x = MARGEN;
      cells.forEach((cell, ci) => {
        const w = ci === 0 ? colColor : colW;
        doc.setDrawColor(40);
        doc.setFillColor(ri === 0 ? 230 : 255, ri === 0 ? 230 : 255, ri === 0 ? 230 : 255);
        doc.rect(x, y, w, ALTO_FILA, "FD");
        doc.setFont("helvetica", ri === 0 || ci === 0 ? "bold" : "normal");
        doc.setFontSize(8);
        const txt = plano(cell);
        if (ci === 0) {
          doc.text(txt, x + 1.5, y + 5.4, { maxWidth: w - 3 });
        } else {
          doc.text(txt, x + w / 2, y + 5.4, { align: "center" });
        }
        x += w;
      });
      y += ALTO_FILA;
    });
    y += 4;
  }

  return y + 2;
}

export function descargarPdfBloques(
  archivo: string,
  titulo: string,
  notas: string[],
  bloques: BloquePrenda[],
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(plano(titulo), MARGEN, 16);
  let y = 22;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  for (const nota of notas) {
    const wrapped = doc.splitTextToSize(plano(nota), ANCHO);
    for (const row of wrapped) {
      y = asegurarEspacio(doc, y, 5);
      doc.text(row, MARGEN, y);
      y += 4.5;
    }
  }
  y += 3;
  if (bloques.length === 0) {
    doc.text(
      plano("Sin lineas en la tabla. Un articulo sin esquema no usa tallas de fabrica."),
      MARGEN,
      y,
    );
  } else {
    for (const bloque of bloques) {
      y = dibujarBloque(doc, bloque, y);
    }
  }
  doc.save(archivo);
}
