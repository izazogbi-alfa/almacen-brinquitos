import { completarModulos } from "@/lib/modulos";
import type { ModulosUsuario, RolUsuario } from "@/lib/types";

export type UsuarioPersistido = {
  id: string;
  username: string;
  nombre: string;
  rol: RolUsuario;
  passwordHash: string;
  modulos: ModulosUsuario;
};

export type UsuariosPersistidos = {
  savedAt: string;
  users: UsuarioPersistido[];
};

export const USERNAMES_SEMILLA = ["iza", "almacen1", "almacen2"] as const;

function rolDe(valor: unknown): RolUsuario | null {
  if (valor === "admin" || valor === "operador") return valor;
  return null;
}

export function parseUsuarioPersistido(raw: unknown): UsuarioPersistido | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const username =
    typeof o.username === "string" ? o.username.trim().toLowerCase() : "";
  const nombre = typeof o.nombre === "string" ? o.nombre.trim() : "";
  const id = typeof o.id === "string" && o.id.trim() ? o.id.trim() : "";
  const passwordHash =
    typeof o.passwordHash === "string" ? o.passwordHash.trim() : "";
  const rol = rolDe(o.rol);
  if (!username || !nombre || !id || !passwordHash || !rol) return null;
  if (!passwordHash.includes(":")) return null;
  return {
    id,
    username,
    nombre,
    rol,
    passwordHash,
    modulos: completarModulos({
      rol,
      username,
      modulos:
        o.modulos && typeof o.modulos === "object"
          ? (o.modulos as Partial<ModulosUsuario>)
          : undefined,
    }),
  };
}

export function parseUsuariosPersistidos(
  raw: unknown,
): UsuariosPersistidos | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as { savedAt?: unknown; users?: unknown };
  if (!Array.isArray(o.users)) return null;
  const users: UsuarioPersistido[] = [];
  const seen = new Set<string>();
  for (const item of o.users) {
    const u = parseUsuarioPersistido(item);
    if (!u) continue;
    if (seen.has(u.username)) {
      const i = users.findIndex((x) => x.username === u.username);
      if (i >= 0) users.splice(i, 1);
    }
    seen.add(u.username);
    users.push(u);
  }
  const savedAt =
    typeof o.savedAt === "string" && o.savedAt
      ? o.savedAt
      : new Date(0).toISOString();
  if (users.length === 0) return null;
  return { savedAt, users };
}

/** Persistidos ganan. Semillas (iza/almacen1/almacen2) se agregan si faltan. */
export function mezclarUsuarios(
  persistidos: UsuarioPersistido[],
  semillas: UsuarioPersistido[],
): UsuarioPersistido[] {
  const map = new Map<string, UsuarioPersistido>();
  for (const s of semillas) map.set(s.username.toLowerCase(), s);
  for (const u of persistidos) map.set(u.username.toLowerCase(), u);
  return [...map.values()];
}

export function tieneSemillas(users: UsuarioPersistido[]) {
  const set = new Set(users.map((u) => u.username.toLowerCase()));
  return USERNAMES_SEMILLA.every((n) => set.has(n));
}
