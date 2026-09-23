import type { jsPDF } from "jspdf";
import { tituloNombreArticulo } from "@/lib/titulo-etiqueta";

export const FUENTE_NOMBRE_MAX_PT = 8;
export const FUENTE_NOMBRE_MIN_PT = 7;

/** Clave · nombre en una línea. */
export function lineaClaveNombre(sku: string, nombre: string) {
  const clave = sku.trim();
  const nom = tituloNombreArticulo(nombre);
  if (clave && nom) return `${clave} · ${nom}`;
  return clave || nom;
}

export function fuenteParaAncho(
  doc: jsPDF,
  texto: string,
  anchoMm: number,
  maxPt = FUENTE_NOMBRE_MAX_PT,
  minPt = FUENTE_NOMBRE_MIN_PT,
) {
  if (!texto || anchoMm <= 0) return minPt;
  let size = maxPt;
  while (size > minPt + 1e-6) {
    doc.setFontSize(size);
    if (doc.getTextWidth(texto) <= anchoMm) return size;
    size -= 0.5;
  }
  return minPt;
}

export function textoParaAncho(doc: jsPDF, texto: string, anchoMm: number) {
  if (!texto || anchoMm <= 0) return "";
  if (doc.getTextWidth(texto) <= anchoMm) return texto;
  const ellipsis = "...";
  let t = texto;
  while (t.length > 1 && doc.getTextWidth(`${t}${ellipsis}`) > anchoMm) {
    t = t.slice(0, -1);
  }
  return t ? `${t}${ellipsis}` : "";
}
