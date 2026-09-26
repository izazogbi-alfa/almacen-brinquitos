import {
  esColoresDeFabrica,
  esTallasDeFabrica,
} from "@/lib/catalogos";
import type { AsignacionesPersistidas } from "@/lib/asignaciones-articulos";
import type { Catalogos, EsquemaCatalogo } from "@/lib/types";

export type CatalogosConFecha = {
  catalogos: Catalogos;
  savedAt: string;
};

export type FuentesListasCatalogo = {
  esquemas: "body" | "base";
  colores: "body" | "base";
  tallas: "body" | "base";
  especificaciones: "body" | "base";
};

export function esDocumentoCatalogoCompleto(body: Partial<Catalogos>): boolean {
  return (
    Array.isArray(body.esquemas) &&
    Array.isArray(body.colores) &&
    Array.isArray(body.tallas)
  );
}

export function esCatalogoSemilla(catalogos: Catalogos): boolean {
  return (
    (catalogos.esquemas?.length ?? 0) === 0 &&
    esColoresDeFabrica(catalogos.colores ?? []) &&
    esTallasDeFabrica(catalogos.tallas ?? [])
  );
}

function pobreEsquemas(
  incoming: EsquemaCatalogo[],
  base: EsquemaCatalogo[],
): boolean {
  return incoming.length === 0 && base.length > 0;
}

function pobreColores(incoming: string[], base: string[]): boolean {
  if (incoming.length === 0 && base.length > 0) return true;
  return esColoresDeFabrica(incoming) && !esColoresDeFabrica(base);
}

function pobreTallas(incoming: string[], base: string[]): boolean {
  if (incoming.length === 0 && base.length > 0) return true;
  return esTallasDeFabrica(incoming) && !esTallasDeFabrica(base);
}

function pobreEspecificaciones(incoming: string[], base: string[]): boolean {
  return incoming.length === 0 && base.length > 0;
}

/** Un documento semilla o con listas vacías no gana a uno más rico, aunque la fecha sea más nueva. */
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
  const aNuevo = Date.parse(a.savedAt) >= Date.parse(b.savedAt);
  const newer = aNuevo ? a : b;
  const older = aNuevo ? b : a;
  if (esCatalogoSemilla(newer.catalogos) && !esCatalogoSemilla(older.catalogos)) {
    return older;
  }
  const fusion = fusionarListasCatalogo(newer.catalogos, older.catalogos);
  const usoOlder =
    fusion.esquemas === older.catalogos.esquemas ||
    fusion.colores === older.catalogos.colores ||
    fusion.tallas === older.catalogos.tallas;
  return {
    catalogos: {
      ...newer.catalogos,
      ...fusion,
      empresaNombre: newer.catalogos.empresaNombre ?? older.catalogos.empresaNombre,
      logoDataUrl: newer.catalogos.logoDataUrl ?? older.catalogos.logoDataUrl,
    },
    savedAt: usoOlder && esCatalogoSemilla(newer.catalogos)
      ? older.savedAt
      : newer.savedAt,
  };
}

function fusionarListasCatalogo(newer: Catalogos, older: Catalogos) {
  return {
    esquemas: pobreEsquemas(newer.esquemas ?? [], older.esquemas ?? [])
      ? older.esquemas
      : newer.esquemas,
    colores: pobreColores(newer.colores ?? [], older.colores ?? [])
      ? older.colores
      : newer.colores,
    tallas: pobreTallas(newer.tallas ?? [], older.tallas ?? [])
      ? older.tallas
      : newer.tallas,
    especificaciones: pobreEspecificaciones(
      newer.especificaciones ?? [],
      older.especificaciones ?? [],
    )
      ? older.especificaciones
      : newer.especificaciones,
  };
}

export function fuentesAlGuardarCatalogos(
  body: Partial<Catalogos>,
  base: Catalogos,
): FuentesListasCatalogo {
  const completo = esDocumentoCatalogoCompleto(body);
  const esquemas: "body" | "base" = !Array.isArray(body.esquemas)
    ? "base"
    : completo && pobreEsquemas(body.esquemas, base.esquemas)
      ? "base"
      : "body";
  const colores: "body" | "base" = !Array.isArray(body.colores)
    ? "base"
    : completo && pobreColores(body.colores, base.colores)
      ? "base"
      : "body";
  const tallas: "body" | "base" = !Array.isArray(body.tallas)
    ? "base"
    : completo && pobreTallas(body.tallas, base.tallas)
      ? "base"
      : "body";
  const especificaciones: "body" | "base" = !Array.isArray(
    body.especificaciones,
  )
    ? "base"
    : completo &&
        pobreEspecificaciones(body.especificaciones, base.especificaciones ?? [])
      ? "base"
      : "body";
  return { esquemas, colores, tallas, especificaciones };
}

/** Replay del celular (objeto completo) con esquemas [] no debe borrar los del servidor. */
export function esquemasTrasReplay(
  body: Partial<Catalogos>,
  base: Catalogos,
): Catalogos["esquemas"] | "usar-body" | "usar-base" {
  return fuentesAlGuardarCatalogos(body, base).esquemas === "base"
    ? "usar-base"
    : Array.isArray(body.esquemas)
      ? "usar-body"
      : "usar-base";
}

export function esReplayCatalogoVacio(
  body: Partial<Catalogos>,
  base: Catalogos,
): boolean {
  return (
    esDocumentoCatalogoCompleto(body) &&
    fuentesAlGuardarCatalogos(body, base).esquemas === "base" &&
    Array.isArray(body.esquemas) &&
    body.esquemas.length === 0
  );
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

/**
 * true = el cliente puede POST (local más rico y no es semilla/vacío).
 * Un celular con esquemas viejos no rellena un servidor en fábrica (0 esquemas).
 */
export function localNoDebeEmpujarCatalogos(opts: {
  localEsquemas: number;
  serverEsquemas: number;
  localSavedAt: string;
  serverSavedAt: string;
  localColores?: number;
  serverColores?: number;
  localTallas?: number;
  serverTallas?: number;
  localEsSemilla?: boolean;
  serverEsSemilla?: boolean;
}): boolean {
  if (opts.localEsSemilla && !opts.serverEsSemilla) return false;
  if (opts.localEsquemas === 0 && opts.serverEsquemas > 0) return false;
  if (
    opts.serverEsquemas === 0 &&
    opts.localEsquemas > 0 &&
    Date.parse(opts.serverSavedAt) > 0
  ) {
    return false;
  }
  if (
    opts.localEsquemas > 0 &&
    opts.serverEsquemas === 0 &&
    !(Date.parse(opts.serverSavedAt) > 0)
  ) {
    return true;
  }
  if (!opts.serverSavedAt) return true;
  if (opts.localEsSemilla && opts.serverEsSemilla) return false;
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

export function debeReescribirCatalogosDuraderos(
  mejor: CatalogosConFecha,
  actual: CatalogosConFecha | null,
): boolean {
  if (!actual) return !esCatalogoSemilla(mejor.catalogos) || Date.parse(mejor.savedAt) > 0;
  if (esCatalogoSemilla(mejor.catalogos) && !esCatalogoSemilla(actual.catalogos)) {
    return false;
  }
  if (
    (mejor.catalogos.esquemas?.length ?? 0) >
    (actual.catalogos.esquemas?.length ?? 0)
  ) {
    return true;
  }
  if (esCatalogoSemilla(mejor.catalogos) && esCatalogoSemilla(actual.catalogos)) {
    return Date.parse(mejor.savedAt) > Date.parse(actual.savedAt);
  }
  return Date.parse(mejor.savedAt) > Date.parse(actual.savedAt);
}
