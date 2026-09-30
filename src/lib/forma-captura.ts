export const FORMAS_CAPTURA = ["talla", "color", "especificacion"] as const;

export type FormaCaptura = (typeof FORMAS_CAPTURA)[number];

export function parseFormaCaptura(raw: unknown): FormaCaptura {
  if (raw === "color" || raw === "especificacion" || raw === "talla") {
    return raw;
  }
  return "talla";
}

export function etiquetaFormaCaptura(forma: FormaCaptura): string {
  if (forma === "color") return "Por color";
  if (forma === "especificacion") return "Por especificación";
  return "Por talla";
}

export function ayudaFormaCaptura(forma: FormaCaptura): string {
  if (forma === "color") {
    return "Toca un color. Enter recorre las tallas. En la hoja solo están Regresar color y Saltar color.";
  }
  if (forma === "especificacion") {
    return "Toca una especificación. Enter recorre las tallas. En la hoja solo están Regresar especificación y Saltar especificación.";
  }
  return "Toca una talla. Enter recorre los colores. En la hoja solo están Regresar talla y Saltar talla.";
}

/** La lista que hay que marcar para que esa forma se pueda capturar. */
export function errorFormaCaptura(
  forma: FormaCaptura,
  colores: string[],
  tallas: string[],
  especificaciones: string[],
): string | null {
  if (forma === "talla" && tallas.length === 0) {
    return "Por talla necesita al menos una talla de este artículo.";
  }
  if (forma === "color" && colores.length === 0) {
    return "Por color necesita al menos un color de este artículo.";
  }
  if (forma === "especificacion" && especificaciones.length === 0) {
    return "Por especificación necesita al menos una especificación de este artículo.";
  }
  return null;
}
