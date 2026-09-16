import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  pedidosIniciales,
  productosIniciales,
  recepcionesIniciales,
} from "@/lib/mock-data";
import type {
  CierreDia,
  Guardado,
  Movimiento,
  Pedido,
  Producto,
  Recepcion,
  RolUsuario,
} from "@/lib/types";
import { hashPassword, nuevoToken, verifyPassword } from "@/server/passwords";

export type UsuarioInterno = {
  id: string;
  username: string;
  nombre: string;
  rol: RolUsuario;
  passwordHash: string;
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
};

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
    })),
    sessions: [],
    productos: productosIniciales,
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
  const fotos = new Map(
    productosIniciales.map((p) => [p.id, p.foto] as const),
  );
  parsed.productos = parsed.productos.map((p) => ({
    ...p,
    foto: p.foto || fotos.get(p.id),
  }));
  const porId = new Map(parsed.productos.map((p) => [p.id, p]));
  let extra = false;
  for (const seed of productosIniciales) {
    const prev = porId.get(seed.id);
    if (!prev) {
      parsed.productos.push(seed);
      extra = true;
      continue;
    }
    if (seed.variantes?.length && !prev.variantes?.length) {
      prev.variantes = seed.variantes.map((v) => ({ ...v }));
      prev.existencia = seed.existencia;
      prev.foto = prev.foto || seed.foto;
      prev.categoria = seed.categoria;
      extra = true;
    }
  }
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
