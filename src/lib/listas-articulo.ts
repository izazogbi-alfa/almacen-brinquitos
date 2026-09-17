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
