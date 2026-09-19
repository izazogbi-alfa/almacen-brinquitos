import { extraerAsignaciones } from "@/lib/asignaciones-articulos";
import { normalizarCatalogos } from "@/lib/catalogos";
import type { Catalogos, Producto } from "@/lib/types";

export const LIMITE_RESPALDOS = 10;
export const KIND_RESPALDO = "brinquitos-respaldo";
export const VERSION_RESPALDO = 1;
export const ZONA_DIA = "America/Mexico_City";

export type OrigenRespaldo = "manual" | "automatico";

export type ResumenRespaldo = {
  esquemas: number;
  colores: number;
  tallas: number;
  especificaciones: number;
  articulos: number;
};

export type RespaldoMeta = {
  id: string;
  createdAt: string;
  origen: OrigenRespaldo;
  dia: string;
  resumen: ResumenRespaldo;
};

export type ContenidoRespaldo = {
  catalogos: Catalogos;
  asignaciones: Record<
    string,
    {
      esquemaConteo: string;
      colores: string[];
      tallas: string[];
      especificaciones: string[];
    }
  >;
};

export type RespaldoCompleto = RespaldoMeta & ContenidoRespaldo;

export type ColeccionRespaldos = {
  savedAt: string;
  items: RespaldoCompleto[];
};

export type ArchivoRespaldo = {
  kind: typeof KIND_RESPALDO;
  version: number;
  createdAt: string;
  origen: OrigenRespaldo;
  dia: string;
  catalogos: Catalogos;
  asignaciones: ContenidoRespaldo["asignaciones"];
};

export function diaCalendario(fecha: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_DIA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(fecha);
}

export function resumenDe(
  catalogos: Catalogos,
  asignaciones: ContenidoRespaldo["asignaciones"],
): ResumenRespaldo {
  return {
    esquemas: catalogos.esquemas.length,
    colores: catalogos.colores.length,
    tallas: catalogos.tallas.length,
    especificaciones: catalogos.especificaciones.length,
    articulos: Object.keys(asignaciones).length,
  };
}

export function recortarPorOrigen(
  items: RespaldoCompleto[],
  origen: OrigenRespaldo,
  limite = LIMITE_RESPALDOS,
): RespaldoCompleto[] {
  const delOrigen = items
    .filter((it) => it.origen === origen)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const keep = new Set(delOrigen.slice(0, limite).map((it) => it.id));
  return items.filter((it) => it.origen !== origen || keep.has(it.id));
}

/** Tope 10 por origen (manual y automático diario por separado). Más viejo se borra. */
export function recortarColeccion(items: RespaldoCompleto[]): RespaldoCompleto[] {
  return recortarPorOrigen(
    recortarPorOrigen(items, "manual"),
    "automatico",
  );
}

export function yaHayAutomaticoDelDia(
  items: RespaldoCompleto[],
  dia: string,
): boolean {
  return items.some((it) => it.origen === "automatico" && it.dia === dia);
}

export function nombreArchivoRespaldo(meta: Pick<RespaldoMeta, "dia" | "origen">) {
  const etiqueta = meta.origen === "automatico" ? "diario" : "manual";
  return `respaldo-brinquitos-${meta.dia}-${etiqueta}.json`;
}

export function aArchivo(respaldo: RespaldoCompleto): ArchivoRespaldo {
  return {
    kind: KIND_RESPALDO,
    version: VERSION_RESPALDO,
    createdAt: respaldo.createdAt,
    origen: respaldo.origen,
    dia: respaldo.dia,
    catalogos: respaldo.catalogos,
    asignaciones: respaldo.asignaciones,
  };
}

export function parseArchivoRespaldo(raw: unknown): ArchivoRespaldo | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const catalogos = normalizarCatalogos(
    (obj.catalogos as Catalogos | undefined) ?? undefined,
  );
  const mapa =
    obj.asignaciones && typeof obj.asignaciones === "object"
      ? (obj.asignaciones as ContenidoRespaldo["asignaciones"])
      : {};
  const asignaciones: ContenidoRespaldo["asignaciones"] = {};
  for (const [clave, valor] of Object.entries(mapa ?? {})) {
    if (!valor || typeof valor !== "object") continue;
    const v = valor as Record<string, unknown>;
    const esquema =
      typeof v.esquemaConteo === "string"
        ? v.esquemaConteo.trim()
        : typeof v.e === "string"
          ? v.e.trim()
          : "";
    if (!esquema) continue;
    const lista = (x: unknown) =>
      Array.isArray(x)
        ? x.filter((i): i is string => typeof i === "string" && Boolean(i.trim()))
        : [];
    asignaciones[clave.trim().toUpperCase()] = {
      esquemaConteo: esquema,
      colores: lista(v.colores ?? v.c),
      tallas: lista(v.tallas ?? v.t),
      especificaciones: lista(v.especificaciones ?? v.s),
    };
  }
  const createdAt =
    typeof obj.createdAt === "string" && obj.createdAt
      ? obj.createdAt
      : new Date().toISOString();
  const origen: OrigenRespaldo =
    obj.origen === "automatico" ? "automatico" : "manual";
  const dia =
    typeof obj.dia === "string" && obj.dia ? obj.dia : diaCalendario(new Date(createdAt));
  return {
    kind: KIND_RESPALDO,
    version: VERSION_RESPALDO,
    createdAt,
    origen,
    dia,
    catalogos,
    asignaciones,
  };
}

export function snapshotDesdeStore(input: {
  catalogos: Catalogos;
  productos: Producto[];
  origen: OrigenRespaldo;
  ahora?: Date;
}): RespaldoCompleto {
  const ahora = input.ahora ?? new Date();
  const catalogos = normalizarCatalogos(input.catalogos);
  const asignaciones = extraerAsignaciones(input.productos);
  const createdAt = ahora.toISOString();
  const dia = diaCalendario(ahora);
  const id = `rb-${ahora.getTime()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    createdAt,
    origen: input.origen,
    dia,
    resumen: resumenDe(catalogos, asignaciones),
    catalogos,
    asignaciones,
  };
}

export function metaPublica(item: RespaldoCompleto): RespaldoMeta {
  return {
    id: item.id,
    createdAt: item.createdAt,
    origen: item.origen,
    dia: item.dia,
    resumen: item.resumen,
  };
}

export function coleccionVacia(): ColeccionRespaldos {
  return { savedAt: new Date(0).toISOString(), items: [] };
}
