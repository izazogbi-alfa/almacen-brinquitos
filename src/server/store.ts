import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { pedidosIniciales, recepcionesIniciales } from "@/lib/mock-data";
import { leerCatalogoIza, leerFotosCatalogo } from "@/server/parse-catalogo";
import type {
  CierreDia,
  Guardado,
  ModulosUsuario,
  Movimiento,
  Pedido,
  Producto,
  Recepcion,
  RolUsuario,
} from "@/lib/types";
import { hashPassword, nuevoToken, verifyPassword } from "@/server/passwords";
import { modulosDe } from "@/lib/modulos";

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
  cierres: CierreDia[];
  ultimoGuardado: Guardado | null;
  catalogOrigen?: string;
};

const CATALOG_ORIGEN = "iza-csv-v1";

const DATA_DIR = join(process.cwd(), "data");
const STORE_PATH = join(DATA_DIR, "store.json");

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

function seedStore(): AppStore {
  return {
    users: DEMO_USERS.map((u) => ({
      id: u.id,
      username: u.username,
      nombre: u.nombre,
      rol: u.rol,
      passwordHash: hashPassword(u.password),
      modulos: modulosDe(u),
    })),
    sessions: [],
    productos: leerCatalogoIza(),
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
    cierres: [],
    ultimoGuardado: null,
  };
}

function loadRaw(): AppStore {
  if (!existsSync(STORE_PATH)) {
    mkdirSync(DATA_DIR, { recursive: true });
    const seeded = seedStore();
    writeFileSync(STORE_PATH, JSON.stringify(seeded, null, 2));
    return seeded;
  }
  const parsed = JSON.parse(readFileSync(STORE_PATH, "utf8")) as AppStore;
  if (!parsed.cierres) parsed.cierres = [];
  if (!parsed.movimientos) parsed.movimientos = [];
  let extra = false;
  parsed.users = (parsed.users ?? []).map((u) => {
    if (u.modulos) return u;
    extra = true;
    return { ...u, modulos: modulosDe(u) };
  });
  const catalogo = leerCatalogoIza();
  const yaImportado = parsed.catalogOrigen === CATALOG_ORIGEN;
  if (!yaImportado) {
    parsed.productos = catalogo;
    parsed.pedidos = [];
    parsed.recepciones = [];
    parsed.movimientos = [];
    parsed.cierres = [];
    parsed.catalogOrigen = CATALOG_ORIGEN;
    extra = true;
  } else {
    const prevPorSku = new Map(
      parsed.productos.map((p) => [p.sku.toUpperCase(), p] as const),
    );
    parsed.productos = catalogo.map((c) => {
      const prev = prevPorSku.get(c.sku.toUpperCase());
      if (!prev) {
        extra = true;
        return c;
      }
      return {
        ...c,
        id: prev.id,
        esquemaConteo: prev.esquemaConteo ?? c.esquemaConteo,
        tallas: prev.tallas?.length ? prev.tallas : c.tallas,
        colores: prev.colores?.length ? prev.colores : c.colores,
        existenciasSucursal: prev.existenciasSucursal ?? [],
        existencia: prev.existencia,
        variantes: prev.variantes,
        foto: prev.foto || c.foto,
      };
    });
  }
  const fotos = leerFotosCatalogo();
  parsed.productos = parsed.productos.map((p) => {
    const foto = p.foto || fotos[p.sku] || fotos[p.sku.toUpperCase()];
    if (foto && p.foto !== foto) {
      extra = true;
      return { ...p, foto };
    }
    return p;
  });
  if (extra) saveRaw(parsed);
  return parsed;
}

function saveRaw(store: AppStore) {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

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
    modulos: modulosDe(user),
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
  const sesion = store.sessions.find((s) => s.token === token);
  if (!sesion) return null;
  return store.users.find((u) => u.id === sesion.userId) ?? null;
}

export function login(username: string, password: string) {
  return withStore((store) => {
    const user = store.users.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase(),
    );
    if (!user || !verifyPassword(password, user.passwordHash)) return null;
    const token = nuevoToken();
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
