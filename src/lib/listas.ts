export function parseLista(valor?: string | null): string[] {
  if (typeof valor !== "string") return [];
  return valor
    .split(/[,;\n]/)
    .map((c) => c.trim())
    .filter(Boolean);
}

export function unirLista(items: string[]): string {
  return items.join(", ");
}

export function agregarUnicos(base: string[], extra: string[]): string[] {
  const salida = [...base];
  const visto = new Set(base.map((x) => x.toLocaleLowerCase("es")));
  for (const item of extra) {
    const clave = item.toLocaleLowerCase("es");
    if (visto.has(clave)) continue;
    visto.add(clave);
    salida.push(item);
  }
  return salida;
}

export function quitarDeLista(items: string[], valor: string): string[] {
  const clave = valor.toLocaleLowerCase("es");
  return items.filter((x) => x.toLocaleLowerCase("es") !== clave);
}

export function moverEnLista<T>(
  items: T[],
  indice: number,
  direccion: -1 | 1,
): T[] {
  return moverAIndice(items, indice, indice + direccion);
}

export function moverAIndice<T>(
  items: T[],
  desde: number,
  hacia: number,
): T[] {
  if (
    desde === hacia ||
    desde < 0 ||
    hacia < 0 ||
    desde >= items.length ||
    hacia >= items.length
  ) {
    return items;
  }
  const siguiente = [...items];
  const [item] = siguiente.splice(desde, 1);
  siguiente.splice(hacia, 0, item);
  return siguiente;
}
