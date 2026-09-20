import { extraerAsignaciones } from "./asignaciones-articulos";
import { normalizarCatalogos } from "./catalogos";
import {
  esModuloSesion,
  sanitizarBorrador,
  type SesionCaptura,
} from "./sesion-captura";
import type { Catalogos, ExistenciaSucursal, Producto } from "./types";
import {
  LIMITE_RESPALDOS,
  recortarColeccion,
  recortarPorOrigen,
  yaHayAutomaticoDelDia,
  type OrigenRespaldo,
} from "./respaldos-tope";

export {
  LIMITE_RESPALDOS,
  recortarColeccion,
  recortarPorOrigen,
  yaHayAutomaticoDelDia,
};
export type { OrigenRespaldo };

export const KIND_RESPALDO = "brinquitos-respaldo";
export const VERSION_RESPALDO = 1;
export const ZONA_DIA = "America/Mexico_City";

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

export type ExistenciaRespaldo = {
  sku: string;
  existencia: number;
  existenciasSucursal: ExistenciaSucursal[];
};

export type ContenidoRespaldo = {
  catalogos?: Catalogos;
  asignaciones?: Record<
    string,
    {
      esquemaConteo: string;
      colores: string[];
      tallas: string[];
      especificaciones: string[];
    }
  >;
  existencias?: ExistenciaRespaldo[];
  sesiones?: SesionCaptura[];
};

export type RespaldoCompleto = RespaldoMeta & {
  catalogos: Catalogos;
  asignaciones: NonNullable<ContenidoRespaldo["asignaciones"]>;
} & Pick<ContenidoRespaldo, "existencias" | "sesiones">;

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
  catalogos?: Catalogos;
  asignaciones?: ContenidoRespaldo["asignaciones"];
  existencias?: ExistenciaRespaldo[];
  sesiones?: SesionCaptura[];
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
  asignaciones: ContenidoRespaldo["asignaciones"] = {},
): ResumenRespaldo {
  return {
    esquemas: catalogos.esquemas.length,
    colores: catalogos.colores.length,
    tallas: catalogos.tallas.length,
    especificaciones: catalogos.especificaciones.length,
    articulos: Object.keys(asignaciones ?? {}).length,
  };
}

export function nombreArchivoRespaldo(meta: Pick<RespaldoMeta, "dia" | "origen">) {
  const etiqueta = meta.origen === "automatico" ? "diario" : "manual";
  return `respaldo-brinquitos-${meta.dia}-${etiqueta}.json`;
}

function listaTextos(x: unknown) {
  return Array.isArray(x)
    ? x.filter((i): i is string => typeof i === "string" && Boolean(i.trim()))
    : [];
}

export function parseAsignacionesRespaldo(
  raw: unknown,
): NonNullable<ContenidoRespaldo["asignaciones"]> | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== "object") return {};
  const asignaciones: NonNullable<ContenidoRespaldo["asignaciones"]> = {};
  for (const [clave, valor] of Object.entries(
    raw as Record<string, unknown>,
  )) {
    if (!valor || typeof valor !== "object") continue;
    const v = valor as Record<string, unknown>;
    const esquema =
      typeof v.esquemaConteo === "string"
        ? v.esquemaConteo.trim()
        : typeof v.e === "string"
          ? v.e.trim()
          : "";
    if (!esquema) continue;
    const id = clave.trim().toUpperCase();
    if (!id) continue;
    asignaciones[id] = {
      esquemaConteo: esquema,
      colores: listaTextos(v.colores ?? v.c),
      tallas: listaTextos(v.tallas ?? v.t),
      especificaciones: listaTextos(v.especificaciones ?? v.s),
    };
  }
  return asignaciones;
}

function parseFilaExistencia(raw: unknown): ExistenciaSucursal | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const sucursalId =
    typeof o.sucursalId === "string" ? o.sucursalId.trim() : "";
  if (!sucursalId) return null;
  const cantidad = Number(o.cantidad);
  if (!Number.isFinite(cantidad) || cantidad < 0) return null;
  return {
    sucursalId,
    talla: typeof o.talla === "string" ? o.talla : "",
    color: typeof o.color === "string" ? o.color : "",
    cantidad,
  };
}

export function extraerExistencias(productos: Producto[]): ExistenciaRespaldo[] {
  return productos
    .map((p) => {
      const sku = p.sku?.trim().toUpperCase() ?? "";
      if (!sku) return null;
      return {
        sku,
        existencia: Number.isFinite(p.existencia) ? p.existencia : 0,
        existenciasSucursal: (p.existenciasSucursal ?? [])
          .map(parseFilaExistencia)
          .filter((x): x is ExistenciaSucursal => Boolean(x)),
      };
    })
    .filter((x): x is ExistenciaRespaldo => Boolean(x));
}

export function parseExistenciasRespaldo(
  raw: unknown,
): ExistenciaRespaldo[] | undefined {
  if (raw === undefined || raw === null) return undefined;
  const filas: unknown[] = Array.isArray(raw)
    ? raw
    : typeof raw === "object"
      ? Object.entries(raw as Record<string, unknown>).map(([sku, valor]) =>
          valor && typeof valor === "object"
            ? { sku, ...(valor as object) }
            : null,
        )
      : [];
  const out: ExistenciaRespaldo[] = [];
  const seen = new Set<string>();
  for (const item of filas) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const sku = typeof o.sku === "string" ? o.sku.trim().toUpperCase() : "";
    if (!sku || seen.has(sku)) continue;
    seen.add(sku);
    const existencia = Number(o.existencia);
    out.push({
      sku,
      existencia: Number.isFinite(existencia) && existencia >= 0 ? existencia : 0,
      existenciasSucursal: Array.isArray(o.existenciasSucursal)
        ? o.existenciasSucursal
            .map(parseFilaExistencia)
            .filter((x): x is ExistenciaSucursal => Boolean(x))
        : [],
    });
  }
  return out;
}

export function aplicarExistencias(
  productos: Producto[],
  existencias: ExistenciaRespaldo[],
): Producto[] {
  const mapa = new Map(existencias.map((e) => [e.sku.toUpperCase(), e]));
  return productos.map((p) => {
    const hit = mapa.get(p.sku.trim().toUpperCase());
    if (!hit) return p;
    return {
      ...p,
      existencia: hit.existencia,
      existenciasSucursal: hit.existenciasSucursal.map((f) => ({ ...f })),
    };
  });
}

export function parseSesionesRespaldo(
  raw: unknown,
): SesionCaptura[] | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!Array.isArray(raw)) return [];
  const out: SesionCaptura[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    if (!esModuloSesion(o.modulo)) continue;
    const id = typeof o.id === "string" ? o.id.trim() : "";
    if (!id) continue;
    const abiertaEn =
      typeof o.abiertaEn === "string" && o.abiertaEn
        ? o.abiertaEn
        : new Date(0).toISOString();
    const ultimaActividad =
      typeof o.ultimaActividad === "string" && o.ultimaActividad
        ? o.ultimaActividad
        : abiertaEn;
    const num = (x: unknown) => {
      const n = Number(x);
      return Number.isFinite(n) && n >= 0 ? n : 0;
    };
    const sesion: SesionCaptura = {
      id,
      modulo: o.modulo,
      abiertaEn,
      ultimaActividad,
      userId: typeof o.userId === "string" ? o.userId : "",
      userName: typeof o.userName === "string" ? o.userName : "",
      conteos: num(o.conteos),
      entradas: num(o.entradas),
      pedidos: num(o.pedidos),
    };
    if (typeof o.cerradaEn === "string" && o.cerradaEn) {
      sesion.cerradaEn = o.cerradaEn;
    }
    if (o.motivoCierre === "inactividad" || o.motivoCierre === "pagina") {
      sesion.motivoCierre = o.motivoCierre;
    }
    if (o.pendiente === true) sesion.pendiente = true;
    const borrador = sanitizarBorrador(o.borrador);
    if (borrador) sesion.borrador = borrador;
    out.push(sesion);
  }
  return out;
}

export function aArchivo(respaldo: RespaldoCompleto): ArchivoRespaldo {
  const archivo: ArchivoRespaldo = {
    kind: KIND_RESPALDO,
    version: VERSION_RESPALDO,
    createdAt: respaldo.createdAt,
    origen: respaldo.origen,
    dia: respaldo.dia,
    catalogos: respaldo.catalogos,
    asignaciones: respaldo.asignaciones,
  };
  if (respaldo.existencias) archivo.existencias = respaldo.existencias;
  if (respaldo.sesiones) archivo.sesiones = respaldo.sesiones;
  return archivo;
}

export function parseArchivoRespaldo(raw: unknown): ArchivoRespaldo | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (obj.kind !== undefined && obj.kind !== KIND_RESPALDO) return null;
  const tieneCatalogos = obj.catalogos !== undefined && typeof obj.catalogos === "object";
  const tieneAsignaciones =
    obj.asignaciones !== undefined && typeof obj.asignaciones === "object";
  const tieneExistencias = obj.existencias !== undefined;
  const tieneSesiones = obj.sesiones !== undefined;
  if (obj.kind !== KIND_RESPALDO && !(tieneCatalogos && tieneAsignaciones)) {
    return null;
  }
  const createdAt =
    typeof obj.createdAt === "string" && obj.createdAt
      ? obj.createdAt
      : new Date().toISOString();
  const origen: OrigenRespaldo =
    obj.origen === "automatico" ? "automatico" : "manual";
  const dia =
    typeof obj.dia === "string" && obj.dia
      ? obj.dia
      : diaCalendario(new Date(createdAt));
  const archivo: ArchivoRespaldo = {
    kind: KIND_RESPALDO,
    version: VERSION_RESPALDO,
    createdAt,
    origen,
    dia,
  };
  if (tieneCatalogos) {
    archivo.catalogos = normalizarCatalogos(obj.catalogos as Catalogos);
  }
  if (tieneAsignaciones) {
    archivo.asignaciones = parseAsignacionesRespaldo(obj.asignaciones) ?? {};
  }
  if (tieneExistencias) {
    archivo.existencias = parseExistenciasRespaldo(obj.existencias) ?? [];
  }
  if (tieneSesiones) {
    archivo.sesiones = parseSesionesRespaldo(obj.sesiones) ?? [];
  }
  if (
    archivo.catalogos === undefined &&
    archivo.asignaciones === undefined &&
    archivo.existencias === undefined &&
    archivo.sesiones === undefined
  ) {
    return null;
  }
  return archivo;
}

export function respaldoTieneDatos(archivo: ArchivoRespaldo) {
  return (
    archivo.catalogos !== undefined ||
    archivo.asignaciones !== undefined ||
    archivo.existencias !== undefined ||
    archivo.sesiones !== undefined
  );
}

export function snapshotDesdeStore(input: {
  catalogos: Catalogos;
  productos: Producto[];
  origen: OrigenRespaldo;
  ahora?: Date;
  sesiones?: SesionCaptura[];
}): RespaldoCompleto {
  const ahora = input.ahora ?? new Date();
  const catalogos = normalizarCatalogos(input.catalogos);
  const asignaciones = extraerAsignaciones(input.productos);
  const existencias = extraerExistencias(input.productos);
  const sesiones = parseSesionesRespaldo(input.sesiones ?? []) ?? [];
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
    existencias,
    sesiones,
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
