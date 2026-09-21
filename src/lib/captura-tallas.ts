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
