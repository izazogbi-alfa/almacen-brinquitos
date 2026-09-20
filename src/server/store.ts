import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { pedidosIniciales, recepcionesIniciales } from "@/lib/mock-data";
import { leerCatalogoIza, leerFotosCatalogo } from "@/server/parse-catalogo";
import type {
  Catalogos,
  Guardado,
  ModulosUsuario,
  Movimiento,
  Pedido,
  Producto,
  Recepcion,
  RolUsuario,
} from "@/lib/types";
import type { SesionCaptura } from "@/lib/sesion-captura";
import { migrarSesiones } from "@/lib/sesion-store";
import {
  aplicarExistencias,
  type ExistenciaRespaldo,
} from "@/lib/respaldos";
import {
  aplicarAsignaciones,
  extraerAsignaciones,
  type AsignacionArticulo,
  type AsignacionesPersistidas,
} from "@/lib/asignaciones-articulos";
import {
  normalizarCatalogos,
  sanitizarArticuloSinFabrica,
} from "@/lib/catalogos";
import { hashPassword, verifyPassword } from "@/server/passwords";
import { firmarTokenSesion, verificarTokenSesion } from "@/server/session-token";
import { completarModulos } from "@/lib/modulos";
import {
  archivoAsignacionesEmpaquetado,
  archivoAsignacionesLocal,
  asignacionesDesdeCookies,
  guardarAsignacionesDuraderas,
  leerAsignacionesArchivo,
  leerAsignacionesDuraderas,
  mejorAsignaciones,
} from "@/server/asignaciones-persist";
import {
  archivoCatalogosEmpaquetado,
  archivoCatalogosLocal,
  aplicarCatalogosAlStore,
  catalogosDesdeCookies,
  guardarCatalogosDuraderos,
  leerCatalogosArchivo,
  leerCatalogosDuraderos,
  mejorCatalogos,
  type CatalogosPersistidos,
} from "@/server/catalogos-persist";

export type UsuarioInterno = {
  id: string;
  username: string;
  nombre: string;
  rol: RolUsuario;
  passwordHash: string;
  modulos: ModulosUsuario;
};

type Sesion = { token: string; userId: string; createdAt: string };

export type AppStore = {
  users: UsuarioInterno[];
  sessions: Sesion[];
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
};

const CATALOG_ORIGEN = "iza-csv-v1";

const DATA_DIR = process.env.VERCEL
  ? join("/tmp", "almacen-brinquitos")
  : join(process.cwd(), "data");
const STORE_PATH = join(DATA_DIR, "store.json");

let memoryStore: AppStore | null = null;

const DEMO_USERS: {
  id: string;
  username: string;
  password: string;
  nombre: string;
  rol: RolUsuario;
}[] = [
  {
    id: "u-iza",
    username: "iza",
    password: "iza",
    nombre: "Iza Zogbi",
    rol: "admin",
  },
  {
    id: "u-almacen1",
    username: "almacen1",
    password: "almacen1",
    nombre: "Ana López",
    rol: "operador",
  },
  {
    id: "u-almacen2",
    username: "almacen2",
    password: "almacen2",
    nombre: "Carlos Méndez",
    rol: "operador",
  },
];

function seedUsers(): UsuarioInterno[] {
  return DEMO_USERS.map((u) => ({
    id: u.id,
    username: u.username,
    nombre: u.nombre,
    rol: u.rol,
    passwordHash: hashPassword(u.password),
    modulos: completarModulos(u),
  }));
}

function seedStore(): AppStore {
  const archivos = catalogosDeArchivos();
  const catalogos = normalizarCatalogos(archivos?.catalogos ?? null);
  let productos: Producto[] = [];
  try {
    productos = leerCatalogoIza().map((p) =>
      sanitizarArticuloSinFabrica(p, catalogos),
    );
  } catch (error) {
    console.error("catalog seed skipped", error);
  }
  const seeded: AppStore = {
    users: seedUsers(),
    sessions: [],
    productos,
    catalogOrigen: CATALOG_ORIGEN,
    pedidos: pedidosIniciales.map((p) => ({
      ...p,
      userId: "seed",
      userName: "Carga inicial",
    })),
    recepciones: recepcionesIniciales.map((r) => ({
      ...r,
      userId: "seed",
      userName: "Carga inicial",
    })),
    movimientos: [],
    sesiones: [],
    ultimoGuardado: null,
    catalogos,
    catalogosGuardadosEn: archivos?.savedAt ?? null,
    asignacionesGuardadosEn: null,
  };
  const asignadas = asignacionesDeArchivos();
  if (asignadas) aplicarAsignacionesAlStore(seeded, asignadas);
  return seeded;
}

function catalogosDeArchivos(): CatalogosPersistidos | null {
  return mejorCatalogos(
    leerCatalogosArchivo(archivoCatalogosLocal()),
    leerCatalogosArchivo(archivoCatalogosEmpaquetado()),
  );
}

function asignacionesDeArchivos(): AsignacionesPersistidas | null {
  return mejorAsignaciones(
    leerAsignacionesArchivo(archivoAsignacionesLocal()),
    leerAsignacionesArchivo(archivoAsignacionesEmpaquetado()),
  );
}

function aplicarAsignacionesAlStore(
  store: AppStore,
  data: AsignacionesPersistidas,
) {
  store.productos = aplicarAsignaciones(
    store.productos,
    data.asignaciones,
    store.catalogos,
  );
  store.asignacionesGuardadosEn = data.savedAt;
}

function overlayCatalogosDeArchivo(parsed: AppStore) {
  const archivos = catalogosDeArchivos();
  if (!archivos) return;
  if (!parsed.catalogos) {
    aplicarCatalogosAlStore(parsed, archivos);
    return;
  }
  const actual = parsed.catalogosGuardadosEn;
  if (!actual) return;
  if (Date.parse(archivos.savedAt) > Date.parse(actual)) {
    aplicarCatalogosAlStore(parsed, archivos);
  }
}

function loadRaw(): AppStore {
  if (memoryStore) return memoryStore;
  if (!existsSync(STORE_PATH)) {
    const seeded = seedStore();
    memoryStore = seeded;
    persistStore(seeded);
    return seeded;
  }
  let parsed: AppStore;
  try {
    parsed = JSON.parse(readFileSync(STORE_PATH, "utf8")) as AppStore;
  } catch (error) {
    console.error("store read failed", error);
    const seeded = seedStore();
    memoryStore = seeded;
    return seeded;
  }
  if (!parsed.movimientos) parsed.movimientos = [];
  let extra = migrarSesiones(parsed);
  const catalogosAntes = parsed.catalogos;
  parsed.catalogos = normalizarCatalogos(parsed.catalogos);
  if (!catalogosAntes) extra = true;
  if (
    catalogosAntes &&
    JSON.stringify(catalogosAntes.esquemas ?? null) !==
      JSON.stringify(parsed.catalogos.esquemas)
  ) {
    extra = true;
  }
  overlayCatalogosDeArchivo(parsed);
  parsed.users = (parsed.users ?? []).map((u) => {
    const modulos = completarModulos(u);
    const iguales =
      u.modulos &&
      u.modulos.existencias === modulos.existencias &&
      u.modulos.recepcion === modulos.recepcion &&
      u.modulos.pedidos === modulos.pedidos &&
      u.modulos.articulos === modulos.articulos &&
      u.modulos.configuracion === modulos.configuracion;
    if (!iguales) extra = true;
    return { ...u, modulos };
  });
  if (!parsed.users.length) {
    parsed.users = seedUsers();
    extra = true;
  }
  let catalogo: Producto[] = [];
  try {
    catalogo = leerCatalogoIza();
  } catch (error) {
    console.error("catalog read skipped", error);
  }
  const yaImportado = parsed.catalogOrigen === CATALOG_ORIGEN;
  if (!yaImportado) {
    parsed.productos = catalogo.map((c) =>
      sanitizarArticuloSinFabrica(c, parsed.catalogos),
    );
    parsed.pedidos = [];
    parsed.recepciones = [];
    parsed.movimientos = [];
    parsed.sesiones = [];
    parsed.catalogOrigen = CATALOG_ORIGEN;
    extra = true;
  } else if (catalogo.length) {
    const prevPorSku = new Map(
      parsed.productos.map((p) => [p.sku.toUpperCase(), p] as const),
    );
    parsed.productos = catalogo.map((c) => {
      const prev = prevPorSku.get(c.sku.toUpperCase());
      if (!prev) {
        extra = true;
        return sanitizarArticuloSinFabrica(c, parsed.catalogos);
      }
      return sanitizarArticuloSinFabrica(
        {
          ...c,
          id: prev.id,
          esquemaConteo: prev.esquemaConteo,
          tallas: prev.tallas?.length ? prev.tallas : undefined,
          colores: prev.colores?.length ? prev.colores : c.colores,
          especificaciones: prev.especificaciones?.length
            ? prev.especificaciones
            : c.especificaciones,
          existenciasSucursal: prev.existenciasSucursal ?? [],
          existencia: prev.existencia,
          variantes: prev.variantes,
          foto: prev.foto || c.foto,
        },
        parsed.catalogos,
      );
    });
  }
  let fotos: Record<string, string> = {};
  try {
    fotos = leerFotosCatalogo();
  } catch (error) {
    console.error("catalog photos skipped", error);
  }
  parsed.productos = (parsed.productos ?? []).map((p) => {
    const foto = p.foto || fotos[p.sku] || fotos[p.sku.toUpperCase()];
    const limpio = sanitizarArticuloSinFabrica(
      foto && p.foto !== foto ? { ...p, foto } : p,
      parsed.catalogos,
    );
    if (
      limpio.esquemaConteo !== p.esquemaConteo ||
      (limpio.tallas?.length ?? 0) !== (p.tallas?.length ?? 0) ||
      (foto && p.foto !== foto)
    ) {
      extra = true;
    }
    return limpio;
  });
  const asignadasArchivo = asignacionesDeArchivos();
  if (asignadasArchivo) {
    const actual = parsed.asignacionesGuardadosEn;
    if (
      !actual ||
      Date.parse(asignadasArchivo.savedAt) >= Date.parse(actual)
    ) {
      aplicarAsignacionesAlStore(parsed, asignadasArchivo);
      extra = true;
    }
  }
  if (extra) saveRaw(parsed);
  memoryStore = parsed;
  return parsed;
}

function persistStore(store: AppStore) {
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
  } catch (error) {
    if (!process.env.VERCEL) throw error;
  }
}

function saveRaw(store: AppStore) {
  memoryStore = store;
  persistStore(store);
}

export async function hidratarCatalogos(
  leerCookie: (name: string) => string | undefined,
) {
  const store = loadRaw();
  const mejorCatalogo = mejorCatalogos(
    store.catalogosGuardadosEn
      ? {
          catalogos: store.catalogos,
          savedAt: store.catalogosGuardadosEn,
        }
      : null,
    catalogosDesdeCookies(leerCookie),
    await leerCatalogosDuraderos(),
  );
  if (mejorCatalogo) aplicarCatalogosAlStore(store, mejorCatalogo);
  store.catalogos = normalizarCatalogos(store.catalogos);

  const mejorAsig = mejorAsignaciones(
    store.asignacionesGuardadosEn
      ? {
          savedAt: store.asignacionesGuardadosEn,
          asignaciones: extraerAsignaciones(store.productos),
        }
      : null,
    asignacionesDesdeCookies(leerCookie),
    await leerAsignacionesDuraderas(),
  );
  if (mejorAsig) {
    aplicarAsignacionesAlStore(store, mejorAsig);
  } else {
    store.productos = store.productos.map((p) =>
      sanitizarArticuloSinFabrica(p, store.catalogos),
    );
  }
  memoryStore = store;
  return store;
}

export async function guardarCatalogosEnStore(catalogos: Catalogos) {
  const data: CatalogosPersistidos = {
    catalogos,
    savedAt: new Date().toISOString(),
  };
  const remoto = await guardarCatalogosDuraderos(data);
  const store = withStore((s) => {
    aplicarCatalogosAlStore(s, data);
    return s;
  });
  return { store, data, remoto };
}

export function aplicarCargaRespaldo(input: {
  existencias?: ExistenciaRespaldo[];
  sesiones?: SesionCaptura[];
}) {
  if (input.existencias === undefined && input.sesiones === undefined) {
    return loadRaw();
  }
  return withStore((store) => {
    if (input.existencias) {
      store.productos = aplicarExistencias(store.productos, input.existencias);
    }
    if (input.sesiones) {
      store.sesiones = input.sesiones;
    }
    return store;
  });
}

export async function guardarAsignacionesEnStore(
  asignaciones?: Record<string, AsignacionArticulo>,
) {
  const store = loadRaw();
  const data: AsignacionesPersistidas = {
    savedAt: new Date().toISOString(),
    asignaciones: asignaciones ?? extraerAsignaciones(store.productos),
  };
  const remoto = await guardarAsignacionesDuraderas(data);
  aplicarAsignacionesAlStore(store, data);
  saveRaw(store);
  return { store, data, remoto };
}

export const ERROR_ESQUEMA_NO_PERSISTIO =
  "No se pudo guardar el esquema. El artículo no quedó persistido. Intenta de nuevo.";

export const ERROR_CLON_NO_PERSISTIO =
  "No se pudo copiar el esquema. Los cambios no quedaron persistidos. Intenta de nuevo.";

export function withStore<T>(fn: (store: AppStore) => T): T {
  const store = loadRaw();
  const result = fn(store);
  saveRaw(store);
  return result;
}

export function readStore(): AppStore {
  return loadRaw();
}

export function publicoDe(user: UsuarioInterno) {
  return {
    id: user.id,
    username: user.username,
    nombre: user.nombre,
    rol: user.rol,
    modulos: completarModulos(user),
  };
}

export function marcarGuardado(store: AppStore, user: UsuarioInterno) {
  store.ultimoGuardado = {
    timestamp: new Date().toISOString(),
    userId: user.id,
    userName: user.nombre,
  };
}

export function agregarMovimiento(
  store: AppStore,
  user: UsuarioInterno,
  partial: Omit<Movimiento, "id" | "userId" | "userName" | "timestamp">,
) {
  store.movimientos.unshift({
    id: `mv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    userId: user.id,
    userName: user.nombre,
    timestamp: new Date().toISOString(),
    ...partial,
  });
}

export function usuarioPorSesion(token: string | undefined) {
  if (!token) return null;
  const store = readStore();
  const firmado = verificarTokenSesion(token);
  if (firmado) {
    return store.users.find((u) => u.id === firmado) ?? null;
  }
  const sesion = store.sessions.find((s) => s.token === token);
  if (!sesion) return null;
  return store.users.find((u) => u.id === sesion.userId) ?? null;
}

export function contrasenaCoincide(userId: string, password: string) {
  const user = readStore().users.find((u) => u.id === userId);
  if (!user) return false;
  return verifyPassword(password, user.passwordHash);
}

/** Cambia el hash. No devuelve hash ni clave. */
export function cambiarContrasenaUsuario(userId: string, nueva: string) {
  withStore((store) => {
    const dest = store.users.find((u) => u.id === userId);
    if (!dest) throw new Error("Usuario no encontrado.");
    dest.passwordHash = hashPassword(nueva);
  });
}

export function login(username: string, password: string) {
  return withStore((store) => {
    const user = store.users.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase(),
    );
    if (!user || !verifyPassword(password, user.passwordHash)) return null;
    const token = firmarTokenSesion(user.id);
    store.sessions.push({
      token,
      userId: user.id,
      createdAt: new Date().toISOString(),
    });
    if (store.sessions.length > 80) {
      store.sessions = store.sessions.slice(-80);
    }
    return { token, user };
  });
}

export function logout(token: string | undefined) {
  if (!token) return;
  withStore((store) => {
    store.sessions = store.sessions.filter((s) => s.token !== token);
  });
}

export function siguienteFolio(pedidos: Pedido[]) {
  const nums = pedidos.map((p) => Number(p.folio.replace("PO-", "")) || 0);
  const max = nums.length ? Math.max(...nums) : 1040;
  return `PO-${max + 1}`;
}
