import {
  extraerAsignaciones,
  parseAsignacionesPersistidas,
  preferirAsignaciones,
} from "@/lib/asignaciones-articulos";
import {
  mejorCatalogos,
  parseCatalogosPersistidos,
  type CatalogosPersistidos,
} from "@/server/catalogos-persist";
import { parseUsuariosPersistidos } from "@/lib/usuarios-persist";
import type {
  Catalogos,
  Pedido,
  Producto,
  Recepcion,
  Movimiento,
  Guardado,
  ModulosUsuario,
  RolUsuario,
} from "@/lib/types";
import type { SesionCaptura } from "@/lib/sesion-captura";
import {
  DOC_ASIGNACIONES,
  DOC_CATALOGOS,
  DOC_META,
  DOC_REGISTROS,
  DOC_STOCK,
  DOC_USUARIOS,
  hayPostgres,
  leerDoc,
  escribirDoc,
} from "@/server/postgres";

type UsuarioInterno = {
  id: string;
  username: string;
  nombre: string;
  rol: RolUsuario;
  passwordHash: string;
  modulos: ModulosUsuario;
};

type SesionLogin = { token: string; userId: string; createdAt: string };

export type StoreDuradero = {
  users: UsuarioInterno[];
  sessions: SesionLogin[];
  productos: Producto[];
  pedidos: Pedido[];
  recepciones: Recepcion[];
  movimientos: Movimiento[];
  sesiones: SesionCaptura[];
  ultimoGuardado: Guardado | null;
  catalogOrigen?: string;
  catalogos: Catalogos;
  catalogosGuardadosEn?: string | null;
  asignacionesGuardadosEn?: string | null;
  usuariosGuardadosEn?: string | null;
};

export type StockPersistido = {
  savedAt: string;
  productos: Producto[];
};

export type RegistrosPersistidos = {
  savedAt: string;
  sesiones: SesionCaptura[];
  pedidos: Pedido[];
  recepciones: Recepcion[];
  movimientos: Movimiento[];
};

export type MetaPersistida = {
  savedAt: string;
  ultimoGuardado: Guardado | null;
  catalogOrigen?: string;
  sessions: SesionLogin[];
};

function esProducto(raw: unknown): raw is Producto {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Producto;
  return typeof o.id === "string" && typeof o.sku === "string";
}

function parseStock(raw: unknown): StockPersistido | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as { savedAt?: unknown; productos?: unknown };
  if (!Array.isArray(o.productos)) return null;
  const productos = o.productos.filter(esProducto);
  const savedAt =
    typeof o.savedAt === "string" && o.savedAt
      ? o.savedAt
      : new Date(0).toISOString();
  return { savedAt, productos };
}

function parseRegistros(raw: unknown): RegistrosPersistidos | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const savedAt =
    typeof o.savedAt === "string" && o.savedAt
      ? o.savedAt
      : new Date(0).toISOString();
  return {
    savedAt,
    sesiones: Array.isArray(o.sesiones) ? (o.sesiones as SesionCaptura[]) : [],
    pedidos: Array.isArray(o.pedidos) ? (o.pedidos as Pedido[]) : [],
    recepciones: Array.isArray(o.recepciones)
      ? (o.recepciones as Recepcion[])
      : [],
    movimientos: Array.isArray(o.movimientos)
      ? (o.movimientos as Movimiento[])
      : [],
  };
}

function parseMeta(raw: unknown): MetaPersistida | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const savedAt =
    typeof o.savedAt === "string" && o.savedAt
      ? o.savedAt
      : new Date(0).toISOString();
  return {
    savedAt,
    ultimoGuardado:
      o.ultimoGuardado && typeof o.ultimoGuardado === "object"
        ? (o.ultimoGuardado as Guardado)
        : null,
    catalogOrigen:
      typeof o.catalogOrigen === "string" ? o.catalogOrigen : undefined,
    sessions: Array.isArray(o.sessions)
      ? (o.sessions as SesionLogin[])
      : [],
  };
}

async function catalogosParaPostgres(
  store: StoreDuradero,
  savedAt: string,
): Promise<CatalogosPersistidos> {
  const incoming: CatalogosPersistidos = {
    savedAt: store.catalogosGuardadosEn ?? savedAt,
    catalogos: store.catalogos,
  };
  const actual = parseCatalogosPersistidos(await leerDoc(DOC_CATALOGOS));
  return mejorCatalogos(actual, incoming) ?? incoming;
}

async function asignacionesParaPostgres(store: StoreDuradero, savedAt: string) {
  const incoming = {
    savedAt: store.asignacionesGuardadosEn ?? savedAt,
    asignaciones: extraerAsignaciones(store.productos),
  };
  const actual = parseAsignacionesPersistidas(await leerDoc(DOC_ASIGNACIONES));
  return preferirAsignaciones(actual, incoming) ?? incoming;
}

export async function persistirStoreEnPostgres(
  store: StoreDuradero,
): Promise<{ vias: string[]; persistio: boolean }> {
  if (!hayPostgres()) return { vias: [], persistio: false };
  const savedAt = new Date().toISOString();
  const catalogos = await catalogosParaPostgres(store, savedAt);
  const asignaciones = await asignacionesParaPostgres(store, savedAt);
  const intentos: Array<[string, unknown]> = [
    [
      DOC_USUARIOS,
      {
        savedAt: store.usuariosGuardadosEn ?? savedAt,
        users: store.users,
      },
    ],
    [
      DOC_CATALOGOS,
      {
        savedAt: catalogos.savedAt,
        catalogos: catalogos.catalogos,
      },
    ],
    [
      DOC_ASIGNACIONES,
      {
        savedAt: asignaciones.savedAt,
        asignaciones: asignaciones.asignaciones,
      },
    ],
    [DOC_STOCK, { savedAt, productos: store.productos } satisfies StockPersistido],
    [
      DOC_REGISTROS,
      {
        savedAt,
        sesiones: store.sesiones,
        pedidos: store.pedidos,
        recepciones: store.recepciones,
        movimientos: store.movimientos,
      } satisfies RegistrosPersistidos,
    ],
    [
      DOC_META,
      {
        savedAt,
        ultimoGuardado: store.ultimoGuardado,
        catalogOrigen: store.catalogOrigen,
        sessions: store.sessions,
      } satisfies MetaPersistida,
    ],
  ];
  const ok = await Promise.all(
    intentos.map(async ([key, payload]) => escribirDoc(key, payload)),
  );
  if (ok.every(Boolean)) return { vias: ["postgres"], persistio: true };
  if (ok.some(Boolean)) return { vias: ["postgres"], persistio: true };
  return { vias: [], persistio: false };
}

export async function leerDocsPostgres() {
  if (!hayPostgres()) {
    return {
      usuarios: null,
      catalogos: null,
      asignaciones: null,
      stock: null,
      registros: null,
      meta: null,
    };
  }
  const [usuarios, catalogos, asignaciones, stock, registros, meta] =
    await Promise.all([
      leerDoc(DOC_USUARIOS),
      leerDoc(DOC_CATALOGOS),
      leerDoc(DOC_ASIGNACIONES),
      leerDoc(DOC_STOCK),
      leerDoc(DOC_REGISTROS),
      leerDoc(DOC_META),
    ]);
  return {
    usuarios: parseUsuariosPersistidos(usuarios),
    catalogos: parseCatalogosPersistidos(catalogos),
    asignaciones: parseAsignacionesPersistidas(asignaciones),
    stock: parseStock(stock),
    registros: parseRegistros(registros),
    meta: parseMeta(meta),
  };
}

export function postgresTieneDatos(docs: Awaited<ReturnType<typeof leerDocsPostgres>>) {
  return Boolean(
    docs.usuarios ||
      docs.catalogos ||
      docs.asignaciones ||
      docs.stock ||
      docs.registros ||
      docs.meta,
  );
}

export function aplicarStockAlStore(store: StoreDuradero, stock: StockPersistido) {
  if (!stock.productos.length) return;
  const porSku = new Map(
    store.productos.map((p) => [p.sku.toUpperCase(), p] as const),
  );
  for (const p of stock.productos) {
    const sku = p.sku.toUpperCase();
    const prev = porSku.get(sku);
    if (prev) {
      const esquema = prev.esquemaConteo;
      const colores = prev.colores;
      const tallas = prev.tallas;
      const especificaciones = prev.especificaciones;
      Object.assign(prev, p);
      if (!prev.esquemaConteo?.trim() && esquema) {
        prev.esquemaConteo = esquema;
        if (!prev.colores?.length && colores?.length) prev.colores = colores;
        if (!prev.tallas?.length && tallas?.length) prev.tallas = tallas;
        if (!prev.especificaciones?.length && especificaciones?.length) {
          prev.especificaciones = especificaciones;
        }
      }
    } else {
      store.productos.push(p);
      porSku.set(sku, p);
    }
  }
}

export function aplicarRegistrosAlStore(
  store: StoreDuradero,
  data: RegistrosPersistidos,
) {
  store.sesiones = data.sesiones;
  store.pedidos = data.pedidos;
  store.recepciones = data.recepciones;
  store.movimientos = data.movimientos;
}

export function aplicarMetaAlStore(store: StoreDuradero, data: MetaPersistida) {
  if (data.ultimoGuardado) store.ultimoGuardado = data.ultimoGuardado;
  if (data.catalogOrigen) store.catalogOrigen = data.catalogOrigen;
  if (data.sessions?.length) store.sessions = data.sessions;
}

