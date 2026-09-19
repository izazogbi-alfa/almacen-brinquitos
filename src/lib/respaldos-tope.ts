export const LIMITE_RESPALDOS = 10;

export type OrigenRespaldo = "manual" | "automatico";

export type ItemTopeRespaldo = {
  id: string;
  createdAt: string;
  origen: OrigenRespaldo;
  dia: string;
};

export function recortarPorOrigen<T extends ItemTopeRespaldo>(
  items: T[],
  origen: OrigenRespaldo,
  limite = LIMITE_RESPALDOS,
): T[] {
  const delOrigen = items
    .filter((it) => it.origen === origen)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const keep = new Set(delOrigen.slice(0, limite).map((it) => it.id));
  return items.filter((it) => it.origen !== origen || keep.has(it.id));
}

/** Tope 10 por origen (manual y automático diario por separado). Más viejo se borra. */
export function recortarColeccion<T extends ItemTopeRespaldo>(items: T[]): T[] {
  return recortarPorOrigen(recortarPorOrigen(items, "manual"), "automatico");
}

export function yaHayAutomaticoDelDia(
  items: Array<Pick<ItemTopeRespaldo, "origen" | "dia">>,
  dia: string,
): boolean {
  return items.some((it) => it.origen === "automatico" && it.dia === dia);
}
