import { extraerAsignaciones } from "./asignaciones-articulos";
import { normalizarCatalogos } from "./catalogos";
import {
  esModuloSesion,
  sanitizarBorrador,
  type SesionCaptura,
} from "./sesion-captura";
import type { Catalogos, ExistenciaSucursal, Producto, Variante } from "./types";
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
export const VERSION_RESPALDO = 2;
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
  existenciasSucursal: ExistenciaSucursal[];
  existencia: number;
  variantes?: Variante[];
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
  /** Solo si la copia lo trajo. Restaurar no inventa existencias. */
  existencias?: ExistenciaRespaldo[];
  /** Solo si la copia lo trajo. Restaurar no inventa sesiones. */
  sesiones?: SesionCaptura[];
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

export function nombreArchivoRespaldo(meta: Pick<RespaldoMeta, "dia" | "origen">) {
  const etiqueta = meta.origen === "automatico" ? "diario" : "manual";
  return `respaldo-brinquitos-${meta.dia}-${etiqueta}.json`;
}

export function extraerExistencias(productos: Producto[]): ExistenciaRespaldo[] {
  const out: ExistenciaRespaldo[] = [];
  for (const producto of productos) {
    const existenciasSucursal = (producto.existenciasSucursal ?? []).filter(
      (c) =>
        typeof c.sucursalId === "string" &&
        typeof c.talla === "string" &&
        typeof c.color === "string" &&
        Number.isFinite(c.cantidad),
    );
    const variantes = producto.variantes?.filter(
      (v) => typeof v.talla === "string" && Number.isFinite(v.existencia),
    );
    const hay =
      existenciasSucursal.some((c) => c.cantidad !== 0) ||
      (variantes?.some((v) => v.existencia !== 0) ?? false) ||
      producto.existencia !== 0;
    if (!hay) continue;
    out.push({
      sku: producto.sku.trim().toUpperCase(),
      existenciasSucursal,
      existencia: producto.existencia,
      variantes: variantes?.length ? variantes : undefined,
    });
  }
  return out;
}

export function aplicarExistenciasRespaldo(
  productos: Producto[],
  existencias: ExistenciaRespaldo[],
): Producto[] {
  const mapa = new Map(
    existencias.map((e) => [e.sku.trim().toUpperCase(), e] as const),
  );
  return productos.map((producto) => {
    const e = mapa.get(producto.sku.trim().toUpperCase());
    if (!e) {
      return {
        ...producto,
        existenciasSucursal: [],
        existencia: 0,
        variantes: undefined,
      };
    }
    return {
      ...producto,
      existenciasSucursal: e.existenciasSucursal,
      existencia: e.existencia,
      variantes: e.variantes,
    };
  });
}

function parseExistenciasCampo(raw: unknown): ExistenciaRespaldo[] | null {
  if (!Array.isArray(raw)) return null;
  const out: ExistenciaRespaldo[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const sku =
      typeof o.sku === "string" ? o.sku.trim().toUpperCase() : "";
    if (!sku) continue;
    const filas = Array.isArray(o.existenciasSucursal)
      ? o.existenciasSucursal
      : [];
    const existenciasSucursal: ExistenciaSucursal[] = [];
    for (const fila of filas) {
      if (!fila || typeof fila !== "object") continue;
      const f = fila as Record<string, unknown>;
      const cantidad = Number(f.cantidad);
      if (!Number.isFinite(cantidad)) continue;
      if (typeof f.sucursalId !== "string" || typeof f.talla !== "string") {
        continue;
      }
      existenciasSucursal.push({
        sucursalId: f.sucursalId,
        talla: f.talla,
        color: typeof f.color === "string" ? f.color : "",
        cantidad,
      });
    }
    const varsIn = Array.isArray(o.variantes) ? o.variantes : [];
    const variantes: Variante[] = [];
    for (const v of varsIn) {
      if (!v || typeof v !== "object") continue;
      const vr = v as Record<string, unknown>;
      const existencia = Number(vr.existencia);
      if (!Number.isFinite(existencia) || typeof vr.talla !== "string") continue;
      variantes.push({
        talla: vr.talla,
        color: typeof vr.color === "string" ? vr.color : "",
        existencia,
      });
    }
    const existencia = Number(o.existencia);
    out.push({
      sku,
      existenciasSucursal,
      existencia: Number.isFinite(existencia) ? existencia : 0,
      variantes: variantes.length ? variantes : undefined,
    });
  }
  return out;
}

function parseSesionesCampo(raw: unknown): SesionCaptura[] | null {
  if (!Array.isArray(raw)) return null;
  const out: SesionCaptura[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    if (typeof o.id !== "string" || !o.id.trim()) continue;
    if (!esModuloSesion(o.modulo)) continue;
    const abiertaEn =
      typeof o.abiertaEn === "string" && o.abiertaEn
        ? o.abiertaEn
        : new Date(0).toISOString();
    const ultimaActividad =
      typeof o.ultimaActividad === "string" && o.ultimaActividad
        ? o.ultimaActividad
        : abiertaEn;
    out.push({
      id: o.id.trim(),
      modulo: o.modulo,
      abiertaEn,
      ultimaActividad,
      cerradaEn: typeof o.cerradaEn === "string" ? o.cerradaEn : undefined,
      userId: typeof o.userId === "string" ? o.userId : "",
      userName: typeof o.userName === "string" ? o.userName : "",
      motivoCierre:
        o.motivoCierre === "pagina" || o.motivoCierre === "inactividad"
          ? o.motivoCierre
          : undefined,
      pendiente: Boolean(o.pendiente),
      conteos: Number(o.conteos) || 0,
      entradas: Number(o.entradas) || 0,
      pedidos: Number(o.pedidos) || 0,
      borrador: sanitizarBorrador(o.borrador),
    });
  }
  return out;
}

function opcionalDesdeArchivo<T>(
  obj: Record<string, unknown>,
  clave: "existencias" | "sesiones",
  parsear: (raw: unknown) => T[] | null,
): { ok: true; valor?: T[] } | { ok: false } {
  if (!Object.prototype.hasOwnProperty.call(obj, clave)) {
    return { ok: true };
  }
  const valor = parsear(obj[clave]);
  if (!valor) return { ok: false };
  return { ok: true, valor };
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
  const tieneKind = obj.kind === KIND_RESPALDO;
  const tieneCatalogos = obj.catalogos && typeof obj.catalogos === "object";
  if (!tieneKind && !tieneCatalogos) return null;

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
  const existenciasOpt = opcionalDesdeArchivo(
    obj,
    "existencias",
    parseExistenciasCampo,
  );
  const sesionesOpt = opcionalDesdeArchivo(obj, "sesiones", parseSesionesCampo);
  if (!existenciasOpt.ok || !sesionesOpt.ok) return null;

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
    version: typeof obj.version === "number" ? obj.version : VERSION_RESPALDO,
    createdAt,
    origen,
    dia,
    catalogos,
    asignaciones,
  };
  if (existenciasOpt.valor) archivo.existencias = existenciasOpt.valor;
  if (sesionesOpt.valor) archivo.sesiones = sesionesOpt.valor;
  return archivo;
}

export function snapshotDesdeStore(input: {
  catalogos: Catalogos;
  productos: Producto[];
  sesiones?: SesionCaptura[];
  origen: OrigenRespaldo;
  ahora?: Date;
}): RespaldoCompleto {
  const ahora = input.ahora ?? new Date();
  const catalogos = normalizarCatalogos(input.catalogos);
  const asignaciones = extraerAsignaciones(input.productos);
  const existencias = extraerExistencias(input.productos);
  const sesiones = input.sesiones ? [...input.sesiones] : [];
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

export function completoDesdeArchivo(
  archivo: ArchivoRespaldo,
  id: string,
): RespaldoCompleto {
  return {
    id,
    createdAt: archivo.createdAt,
    origen: archivo.origen,
    dia: archivo.dia,
    resumen: resumenDe(archivo.catalogos, archivo.asignaciones),
    catalogos: archivo.catalogos,
    asignaciones: archivo.asignaciones,
    existencias: archivo.existencias,
    sesiones: archivo.sesiones,
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
