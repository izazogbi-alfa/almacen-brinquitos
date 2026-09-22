/** US Letter landscape (carta horizontal), medidas en mm. */
export const PDF_MARGEN_MM = 8;
export const ANCHO_TALLA_MIN_MM = 8;
export const ANCHO_TALLA_MAX_MM = 33;
export const ANCHO_COLOR_PREF_MM = 36;
/** Detallado: color + Clave · nombre, tope ~55 mm. */
export const ANCHO_COLOR_DETALLADO_MM = 55;
export const ANCHO_COLOR_MIN_LEIBLE_MM = 12;
export const ANCHO_COD_PROVEEDOR_MM = 22;
export const ANCHO_COD_PROVEEDOR_MIN_MM = 12;

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
  colProveedor: number;
  n: number;
  anchoTabla: number;
};

/**
 * Una sola fila de cajas de talla. Ancho entre 8 mm y 33 mm.
 * Si hay muchas, se encogen hasta 8 mm; no hay segunda fila.
 * extraMm: Cód. proveedor en pedidos. colorPrefMm: 36 compacto / 55 detallado.
 */
export function layoutCajasTalla(
  nTallas: number,
  anchoPagina = PDF_ANCHO_CARTA_HORIZONTAL_MM,
  margen = PDF_MARGEN_MM,
  extraMm = 0,
  colorPrefMm = ANCHO_COLOR_PREF_MM,
): LayoutCajasTalla {
  const anchoUtil = Math.max(0, anchoPagina - margen * 2);
  const n = Math.max(1, nTallas);
  const extraPedido = Math.max(0, extraMm);
  const colorPref = Math.min(ANCHO_COLOR_DETALLADO_MM, Math.max(0, colorPrefMm));
  const preferido = (anchoUtil - colorPref - extraPedido) / n;

  if (preferido >= ANCHO_TALLA_MAX_MM) {
    const colTalla = ANCHO_TALLA_MAX_MM;
    return {
      anchoUtil,
      colColor: colorPref,
      colTalla,
      colProveedor: extraPedido,
      n,
      anchoTabla: colorPref + extraPedido + colTalla * n,
    };
  }

  if (preferido >= ANCHO_TALLA_MIN_MM) {
    const colTalla = preferido;
    return {
      anchoUtil,
      colColor: colorPref,
      colTalla,
      colProveedor: extraPedido,
      n,
      anchoTabla: colorPref + extraPedido + colTalla * n,
    };
  }

  const colTalla = ANCHO_TALLA_MIN_MM;
  const sobra = Math.max(0, anchoUtil - colTalla * n);
  let colProveedor = 0;
  if (extraPedido > 0) {
    const minProv = Math.min(ANCHO_COD_PROVEEDOR_MIN_MM, extraPedido);
    if (sobra >= ANCHO_COLOR_MIN_LEIBLE_MM + minProv) {
      colProveedor = Math.min(extraPedido, sobra - ANCHO_COLOR_MIN_LEIBLE_MM);
    } else if (sobra > ANCHO_COLOR_MIN_LEIBLE_MM) {
      colProveedor = sobra - ANCHO_COLOR_MIN_LEIBLE_MM;
    }
  }
  const colColor = Math.min(colorPref, Math.max(0, sobra - colProveedor));
  return {
    anchoUtil,
    colColor,
    colTalla,
    colProveedor,
    n,
    anchoTabla: colColor + colProveedor + colTalla * n,
  };
}
