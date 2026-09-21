export const LIMITE_RESPALDOS = 10;

export type OrigenRespaldo = "manual" | "automatico";

export type ItemTopeRespaldo = {
  id: string;
  createdAt: string;
  origen: OrigenRespaldo;
  dia: string;
};

/** Un archivo / id por día automático. No se pisa el de ayer. */
export function idRespaldoAutomatico(dia: string) {
  return `rb-auto-${dia}`;
}

export function claveTopeRespaldo(item: Pick<ItemTopeRespaldo, "id" | "origen" | "dia">) {
  return item.origen === "automatico" ? `auto:${item.dia}` : `id:${item.id}`;
}

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

/**
 * Junta copias de varios lados (blob, KV, GitHub, archivo).
 * El automático se identifica por día: no se queda solo “el de hoy”.
 */
export function mezclarItemsTope<T extends ItemTopeRespaldo>(listas: T[][]): T[] {
  const map = new Map<string, T>();
  for (const lista of listas) {
    for (const it of lista) {
      const clave = claveTopeRespaldo(it);
      const prev = map.get(clave);
      if (!prev || Date.parse(it.createdAt) >= Date.parse(prev.createdAt)) {
        map.set(clave, it);
      }
    }
  }
  return recortarColeccion([...map.values()]);
}

/** Suma un respaldo y respeta tope 10. El automático del mismo día sustituye el de ese día. */
export function incorporarRespaldo<T extends ItemTopeRespaldo>(
  items: T[],
  nuevo: T,
): T[] {
  const claveNuevo = claveTopeRespaldo(nuevo);
  const sinMismo = items.filter((it) => claveTopeRespaldo(it) !== claveNuevo);
  return recortarColeccion([nuevo, ...sinMismo]);
}
