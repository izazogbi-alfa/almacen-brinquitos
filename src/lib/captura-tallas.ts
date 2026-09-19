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
