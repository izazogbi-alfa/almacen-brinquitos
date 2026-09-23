/** Orden del esquema: siguiente talla, o null si ya es la última (o no hay tallas). */
export function siguienteTallaEnEsquema(
  tallas: string[],
  actual: string,
): string | null {
  const lista = tallas.filter((t) => t !== "");
  if (lista.length === 0) return null;
  const i = lista.indexOf(actual);
  if (i < 0) return lista[0] ?? null;
  if (i + 1 >= lista.length) return null;
  return lista[i + 1];
}

/** Siguiente color de la lista, o null si ya es el último. */
export function siguienteColorEnLista(
  colores: string[],
  actual: string,
): string | null {
  if (colores.length === 0) return null;
  const i = colores.indexOf(actual);
  if (i < 0) return colores[0] ?? null;
  if (i + 1 >= colores.length) return null;
  return colores[i + 1];
}

/** Color anterior, o null si ya es el primero. */
export function colorAnteriorEnLista(
  colores: string[],
  actual: string,
): string | null {
  if (colores.length === 0) return null;
  const i = colores.indexOf(actual);
  if (i <= 0) return null;
  return colores[i - 1];
}

/** Talla anterior del esquema, o null si ya es la primera. */
export function tallaAnteriorEnEsquema(
  tallas: string[],
  actual: string,
): string | null {
  const lista = tallas.filter((t) => t !== "");
  if (lista.length === 0) return null;
  const i = lista.indexOf(actual);
  if (i <= 0) return null;
  return lista[i - 1];
}

export type EjeCapturaTallas = "talla" | "color";

export type CeldaCapturaTallas = { color: string; talla: string };

/**
 * Saltar color: siguiente color. En Por talla se queda en la misma talla
 * (no recorre el resto de tallas de ese color). En Por color arranca en
 * la primera talla del siguiente color.
 */
export function destinoSaltarColor(opts: {
  eje: EjeCapturaTallas;
  colores: string[];
  color: string;
  tallas: string[];
  talla: string;
}): CeldaCapturaTallas | null {
  const color = siguienteColorEnLista(opts.colores, opts.color);
  if (!color) return null;
  if (opts.eje === "talla") return { color, talla: opts.talla };
  const primera = opts.tallas.filter((t) => t !== "")[0] ?? "";
  return { color, talla: primera };
}

/** Regresar color: color anterior. Misma talla en Por talla. */
export function destinoRegresarColor(opts: {
  eje: EjeCapturaTallas;
  colores: string[];
  color: string;
  tallas: string[];
  talla: string;
}): CeldaCapturaTallas | null {
  const color = colorAnteriorEnLista(opts.colores, opts.color);
  if (!color) return null;
  if (opts.eje === "talla") return { color, talla: opts.talla };
  const primera = opts.tallas.filter((t) => t !== "")[0] ?? "";
  return { color, talla: primera };
}
