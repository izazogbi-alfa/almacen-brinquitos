/** US Letter landscape (carta horizontal), medidas en mm. */
export const PDF_MARGEN_MM = 8;
export const ANCHO_TALLA_MIN_MM = 8;
export const ANCHO_TALLA_MAX_MM = 33;
export const ANCHO_COLOR_PREF_MM = 36;
export const ANCHO_COLOR_MIN_LEIBLE_MM = 12;

/** Ancho y alto de carta US en horizontal, según jsPDF. */
export const PDF_ANCHO_CARTA_HORIZONTAL_MM = 279.4;
export const PDF_ALTO_CARTA_HORIZONTAL_MM = 215.9;

export const PDF_JSPDF = {
  unit: "mm" as const,
  format: "letter" as const,
  orientation: "landscape" as const,
};

export type LayoutCajasTalla = {
  anchoUtil: number;
  colColor: number;
  colTalla: number;
  n: number;
  anchoTabla: number;
};

/**
 * Una sola fila de cajas de talla. Ancho entre 8 mm y 33 mm.
 * Si hay muchas, se encogen hasta 8 mm; no hay segunda fila.
 * Si ni a 8 mm caben con la columna de color preferida, se estrecha el color
 * para que la fila quepa dentro de los márgenes.
 */
export function layoutCajasTalla(
  nTallas: number,
  anchoPagina = PDF_ANCHO_CARTA_HORIZONTAL_MM,
  margen = PDF_MARGEN_MM,
): LayoutCajasTalla {
  const anchoUtil = Math.max(0, anchoPagina - margen * 2);
  const n = Math.max(1, nTallas);
  const preferido = (anchoUtil - ANCHO_COLOR_PREF_MM) / n;

  if (preferido >= ANCHO_TALLA_MAX_MM) {
    const colTalla = ANCHO_TALLA_MAX_MM;
    const colColor = ANCHO_COLOR_PREF_MM;
    return {
      anchoUtil,
      colColor,
      colTalla,
      n,
      anchoTabla: colColor + colTalla * n,
    };
  }

  if (preferido >= ANCHO_TALLA_MIN_MM) {
    const colTalla = preferido;
    const colColor = ANCHO_COLOR_PREF_MM;
    return {
      anchoUtil,
      colColor,
      colTalla,
      n,
      anchoTabla: colColor + colTalla * n,
    };
  }

  const colTalla = ANCHO_TALLA_MIN_MM;
  const sobra = anchoUtil - colTalla * n;
  const colColor = Math.max(0, sobra);
  return {
    anchoUtil,
    colColor,
    colTalla,
    n,
    anchoTabla: colColor + colTalla * n,
  };
}
