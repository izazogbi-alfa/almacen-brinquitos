import type { AsignacionesPersistidas } from "@/lib/asignaciones-articulos";
import type { Catalogos } from "@/lib/types";

export type CatalogosConFecha = {
  catalogos: Catalogos;
  savedAt: string;
};

/** Un catálogo vacío no gana a uno que ya tiene esquemas, aunque la fecha sea más nueva. */
export function mejorCatalogosSinVaciar(
  ...cands: Array<CatalogosConFecha | null | undefined>
): CatalogosConFecha | null {
  let mejor: CatalogosConFecha | null = null;
  for (const c of cands) {
    if (!c) continue;
    mejor = preferirCatalogos(mejor, c);
  }
  return mejor;
}

export function preferirCatalogos(
  a: CatalogosConFecha | null,
  b: CatalogosConFecha | null,
): CatalogosConFecha | null {
  if (!a) return b;
  if (!b) return a;
  const aN = a.catalogos.esquemas?.length ?? 0;
  const bN = b.catalogos.esquemas?.length ?? 0;
  if (aN === 0 && bN > 0) return b;
  if (bN === 0 && aN > 0) return a;
  return Date.parse(a.savedAt) >= Date.parse(b.savedAt) ? a : b;
}

/** Replay del celular (objeto completo) con esquemas [] no debe borrar los del servidor. */
export function esquemasTrasReplay(
  body: Partial<Catalogos>,
  base: Catalogos,
): Catalogos["esquemas"] | "usar-body" | "usar-base" {
  if (!Array.isArray(body.esquemas)) return "usar-base";
  const replayCompleto =
    Array.isArray(body.colores) && Array.isArray(body.tallas);
  if (
    replayCompleto &&
    body.esquemas.length === 0 &&
    (base.esquemas?.length ?? 0) > 0
  ) {
    return "usar-base";
  }
  return "usar-body";
}

export function esReplayCatalogoVacio(
  body: Partial<Catalogos>,
  base: Catalogos,
): boolean {
  return esquemasTrasReplay(body, base) === "usar-base" &&
    Array.isArray(body.esquemas) &&
    Array.isArray(body.colores) &&
    Array.isArray(body.tallas);
}

export function contarAsignaciones(
  data: AsignacionesPersistidas | null | undefined,
) {
  return Object.keys(data?.asignaciones ?? {}).length;
}

export function noPisarAsignacionesVacias(
  existente: AsignacionesPersistidas | null | undefined,
  incoming: AsignacionesPersistidas,
): AsignacionesPersistidas {
  if (contarAsignaciones(incoming) === 0 && contarAsignaciones(existente) > 0) {
    return existente!;
  }
  return incoming;
}

export function preferirAsignaciones(
  a: AsignacionesPersistidas | null,
  b: AsignacionesPersistidas | null,
): AsignacionesPersistidas | null {
  if (!a) return b;
  if (!b) return a;
  const nA = contarAsignaciones(a);
  const nB = contarAsignaciones(b);
  if (nA === 0 && nB > 0) return b;
  if (nB === 0 && nA > 0) return a;
  return Date.parse(a.savedAt) >= Date.parse(b.savedAt) ? a : b;
}

export function mejorAsignacionesSinVaciar(
  ...cands: Array<AsignacionesPersistidas | null | undefined>
): AsignacionesPersistidas | null {
  let mejor: AsignacionesPersistidas | null = null;
  for (const c of cands) mejor = preferirAsignaciones(mejor, c ?? null);
  return mejor;
}

export function localNoDebeEmpujarCatalogos(opts: {
  localEsquemas: number;
  serverEsquemas: number;
  localSavedAt: string;
  serverSavedAt: string;
}): boolean {
  if (opts.localEsquemas > 0 && opts.serverEsquemas === 0) return true;
  if (opts.localEsquemas === 0 && opts.serverEsquemas > 0) return false;
  if (!opts.serverSavedAt) return true;
  return Date.parse(opts.localSavedAt) > Date.parse(opts.serverSavedAt);
}

export function localNoDebeEmpujarAsignaciones(opts: {
  localCount: number;
  serverCount: number;
  localSavedAt: string;
  serverSavedAt: string;
}): boolean {
  if (opts.localCount > 0 && opts.serverCount === 0) return true;
  if (opts.localCount === 0 && opts.serverCount > 0) return false;
  if (!opts.serverSavedAt) return true;
  return Date.parse(opts.localSavedAt) > Date.parse(opts.serverSavedAt);
}
