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
import {
  mezclarUsuarios,
  type UsuariosPersistidos,
} from "@/lib/usuarios-persist";
import {
  archivoUsuariosEmpaquetado,
  archivoUsuariosLocal,
  guardarUsuariosDuraderos,
  leerUsuariosArchivo,
  leerUsuariosDuraderos,
  mejorUsuarios,
  usuariosDesdeCookies,
} from "@/server/usuarios-persist";
import {
  aplicarMetaAlStore,
  aplicarRegistrosAlStore,
  aplicarStockAlStore,
  leerDocsPostgres,
  persistirStoreEnPostgres,
  postgresTieneDatos,
} from "@/server/store-duradero";
import { hayPostgres } from "@/server/postgres";

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
  usuariosGuardadosEn?: string | null;
};

const CATALOG_ORIGEN = "iza-csv-v1";

const DATA_DIR = process.env.VERCEL
  ? join("/tmp", "almacen-brinquitos")
  : join(process.cwd(), "data");
const STORE_PATH = join(DATA_DIR, "store.json");

let memoryStore: AppStore | null = null;
let postgresListo = false;
let postgresEnCurso: Promise<void> | null = null;
let postgresEstabaVacio = false;

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
    usuariosGuardadosEn: archivosUsuarios()?.savedAt ?? null,
  };
  const asignadas = asignacionesDeArchivos();
  if (asignadas) aplicarAsignacionesAlStore(seeded, asignadas);
  const usuariosArchivo = archivosUsuarios();
  if (usuariosArchivo) aplicarUsuariosAlStore(seeded, usuariosArchivo);
  return seeded;
}

function archivosUsuarios(): UsuariosPersistidos | null {
  return mejorUsuarios(
    leerUsuariosArchivo(archivoUsuariosLocal()),
    leerUsuariosArchivo(archivoUsuariosEmpaquetado()),
  );
}

function aplicarUsuariosAlStore(store: AppStore, data: UsuariosPersistidos) {
  store.users = mezclarUsuarios(data.users, seedUsers());
  store.usuariosGuardadosEn = data.savedAt;
}

function overlayUsuariosDeArchivo(parsed: AppStore) {
  const archivos = archivosUsuarios();
  if (!archivos) return;
  const actual = parsed.usuariosGuardadosEn;
  if (!actual || Date.parse(archivos.savedAt) > Date.parse(actual)) {
    aplicarUsuariosAlStore(parsed, archivos);
  }
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
  overlayUsuariosDeArchivo(parsed);
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
      (parsed.productos ?? []).map((p) => [p.sku.toUpperCase(), p] as const),
    );
    for (const c of catalogo) {
      const sku = c.sku.trim().toUpperCase();
      if (!sku || prevPorSku.has(sku)) continue;
      extra = true;
      const nuevo = sanitizarArticuloSinFabrica(c, parsed.catalogos);
      parsed.productos.push(nuevo);
      prevPorSku.set(sku, nuevo);
    }
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

async function saveStore(store: AppStore) {
  memoryStore = store;
  persistStore(store);
  if (hayPostgres()) {
    await persistirStoreEnPostgres(store);
  }
}

function saveRaw(store: AppStore) {
  memoryStore = store;
  persistStore(store);
  if (hayPostgres()) {
    void persistirStoreEnPostgres(store).catch((error) => {
      console.error("postgres store persist failed", error);
    });
  }
}

async function hidratarPostgres(store: AppStore) {
  if (postgresListo || !hayPostgres()) {
    postgresListo = postgresListo || !hayPostgres();
    return;
  }
  if (!postgresEnCurso) {
    postgresEnCurso = (async () => {
      const docs = await leerDocsPostgres();
      postgresEstabaVacio = !postgresTieneDatos(docs);
      if (postgresEstabaVacio) {
        postgresListo = true;
        return;
      }
      if (docs.usuarios) aplicarUsuariosAlStore(store, docs.usuarios);
      if (docs.catalogos) aplicarCatalogosAlStore(store, docs.catalogos);
      if (docs.stock) aplicarStockAlStore(store, docs.stock);
      if (docs.asignaciones) aplicarAsignacionesAlStore(store, docs.asignaciones);
      if (docs.registros) aplicarRegistrosAlStore(store, docs.registros);
      if (docs.meta) aplicarMetaAlStore(store, docs.meta);
      persistStore(store);
      postgresListo = true;
    })().catch((error) => {
      postgresEnCurso = null;
      console.error("postgres hydrate failed", error);
    });
  }
  await postgresEnCurso;
}

export async function hidratarCatalogos(
  leerCookie: (name: string) => string | undefined,
) {
  const store = loadRaw();
  await hidratarPostgres(store);
  const duraderosCatalogos = await leerCatalogosDuraderos();
  const mejorCatalogo = mejorCatalogos(
    store.catalogosGuardadosEn
      ? {
          catalogos: store.catalogos,
          savedAt: store.catalogosGuardadosEn,
        }
      : null,
    catalogosDesdeCookies(leerCookie),
    duraderosCatalogos,
  );
  if (mejorCatalogo) aplicarCatalogosAlStore(store, mejorCatalogo);
  store.catalogos = normalizarCatalogos(store.catalogos);
  if (
    mejorCatalogo &&
    mejorCatalogo.catalogos.esquemas.length > 0 &&
    (!duraderosCatalogos ||
      duraderosCatalogos.catalogos.esquemas.length === 0 ||
      Date.parse(mejorCatalogo.savedAt) >
        Date.parse(duraderosCatalogos.savedAt))
  ) {
    await guardarCatalogosDuraderos(mejorCatalogo);
  }

  const extraidas = extraerAsignaciones(store.productos);
  const duraderasAsig = await leerAsignacionesDuraderas();
  const mejorAsig = mejorAsignaciones(
    store.asignacionesGuardadosEn && Object.keys(extraidas).length > 0
      ? {
          savedAt: store.asignacionesGuardadosEn,
          asignaciones: extraidas,
        }
      : null,
    asignacionesDesdeCookies(leerCookie),
    duraderasAsig,
  );
  if (mejorAsig) {
    aplicarAsignacionesAlStore(store, mejorAsig);
    if (
      Object.keys(mejorAsig.asignaciones).length > 0 &&
      (!duraderasAsig ||
        Object.keys(duraderasAsig.asignaciones).length === 0 ||
        Date.parse(mejorAsig.savedAt) > Date.parse(duraderasAsig.savedAt))
    ) {
      await guardarAsignacionesDuraderas(mejorAsig);
    }
  } else {
    store.productos = store.productos.map((p) =>
      sanitizarArticuloSinFabrica(p, store.catalogos),
    );
  }

  const mejorUsuariosData = mejorUsuarios(
    store.usuariosGuardadosEn
      ? { savedAt: store.usuariosGuardadosEn, users: store.users }
      : null,
    usuariosDesdeCookies(leerCookie),
    await leerUsuariosDuraderos(),
  );
  if (mejorUsuariosData) aplicarUsuariosAlStore(store, mejorUsuariosData);

  memoryStore = store;
  if (hayPostgres() && postgresEstabaVacio) {
    await persistirStoreEnPostgres(store);
    postgresEstabaVacio = false;
  }
  return store;
}

export async function guardarCatalogosEnStore(catalogos: Catalogos) {
  const data: CatalogosPersistidos = {
    catalogos,
    savedAt: new Date().toISOString(),
  };
  const remoto = await guardarCatalogosDuraderos(data);
  const persistido = remoto.data ?? data;
  const store = await withStore((s) => {
    aplicarCatalogosAlStore(s, persistido);
    return s;
  });
  return { store, data: persistido, remoto };
}

export async function guardarAsignacionesEnStore(
  asignaciones?: Record<string, AsignacionArticulo>,
) {
  const store = loadRaw();
  await hidratarPostgres(store);
  const data: AsignacionesPersistidas = {
    savedAt: new Date().toISOString(),
    asignaciones: asignaciones ?? extraerAsignaciones(store.productos),
  };
  const remoto = await guardarAsignacionesDuraderas(data);
  aplicarAsignacionesAlStore(store, data);
  await saveStore(store);
  return { store, data, remoto };
}

export async function guardarUsuariosEnStore(users?: UsuarioInterno[]) {
  const store = loadRaw();
  await hidratarPostgres(store);
  const data: UsuariosPersistidos = {
    savedAt: new Date().toISOString(),
    users: users ?? store.users,
  };
  const remoto = await guardarUsuariosDuraderos(data);
  aplicarUsuariosAlStore(store, data);
  await saveStore(store);
  return { store, data, remoto };
}

export const ERROR_ESQUEMA_NO_PERSISTIO =
  "No se pudo guardar el esquema. El artículo no quedó persistido. Intenta de nuevo.";

export const ERROR_CLON_NO_PERSISTIO =
  "No se pudo copiar el esquema. Los cambios no quedaron persistidos. Intenta de nuevo.";

export async function hidratarUsuarios(
  leerCookie: (name: string) => string | undefined,
) {
  return hidratarCatalogos(leerCookie);
}

export async function withStore<T>(fn: (store: AppStore) => T): Promise<T> {
  const store = loadRaw();
  await hidratarPostgres(store);
  const result = fn(store);
  await saveStore(store);
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
  const userId = verificarTokenSesion(token);
  if (!userId) return null;
  const store = readStore();
  return store.users.find((u) => u.id === userId) ?? null;
}

export function contrasenaCoincide(userId: string, password: string) {
  const user = readStore().users.find((u) => u.id === userId);
  if (!user) return false;
  return verifyPassword(password, user.passwordHash);
}

/** Cambia el hash. No devuelve hash ni clave. */
export function cambiarContrasenaUsuario(userId: string, nueva: string) {
  return withStore((store) => {
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
  if (!token) return Promise.resolve();
  return withStore((store) => {
    store.sessions = store.sessions.filter((s) => s.token !== token);
  });
}

export function siguienteFolio(pedidos: Pedido[]) {
  const nums = pedidos.map((p) => Number(p.folio.replace("PO-", "")) || 0);
  const max = nums.length ? Math.max(...nums) : 1040;
  return `PO-${max + 1}`;
}
