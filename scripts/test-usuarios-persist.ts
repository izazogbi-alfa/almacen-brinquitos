import assert from "node:assert/strict";

type RolUsuario = "admin" | "operador";
type UsuarioPersistido = {
  id: string;
  username: string;
  nombre: string;
  rol: RolUsuario;
  passwordHash: string;
};

const USERNAMES_SEMILLA = ["iza", "almacen1", "almacen2"] as const;

function parseUsuarioPersistido(raw: unknown): UsuarioPersistido | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const username =
    typeof o.username === "string" ? o.username.trim().toLowerCase() : "";
  const nombre = typeof o.nombre === "string" ? o.nombre.trim() : "";
  const id = typeof o.id === "string" && o.id.trim() ? o.id.trim() : "";
  const passwordHash =
    typeof o.passwordHash === "string" ? o.passwordHash.trim() : "";
  const rol = o.rol === "admin" || o.rol === "operador" ? o.rol : null;
  if (!username || !nombre || !id || !passwordHash || !rol) return null;
  if (!passwordHash.includes(":")) return null;
  return { id, username, nombre, rol, passwordHash };
}

function parseUsuariosPersistidos(raw: unknown) {
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

function mezclarUsuarios(
  persistidos: UsuarioPersistido[],
  semillas: UsuarioPersistido[],
) {
  const map = new Map<string, UsuarioPersistido>();
  for (const s of semillas) map.set(s.username.toLowerCase(), s);
  for (const u of persistidos) map.set(u.username.toLowerCase(), u);
  return [...map.values()];
}

function tieneSemillas(users: UsuarioPersistido[]) {
  const set = new Set(users.map((u) => u.username.toLowerCase()));
  return USERNAMES_SEMILLA.every((n) => set.has(n));
}

const hash = "abcd".repeat(8) + ":" + "ef01".repeat(16);
const iza: UsuarioPersistido = {
  id: "u-iza",
  username: "iza",
  nombre: "Iza Zogbi",
  rol: "admin",
  passwordHash: hash,
};
const almacen1 = { ...iza, id: "u-almacen1", username: "almacen1", nombre: "Ana" };
const almacen2 = {
  ...iza,
  id: "u-almacen2",
  username: "almacen2",
  nombre: "Carlos",
};
const nueva: UsuarioPersistido = {
  id: "u-lola",
  username: "lola",
  nombre: "Lola",
  rol: "operador",
  passwordHash: hash,
};

assert.equal(parseUsuarioPersistido({ username: "x" }), null);
assert.equal(
  parseUsuarioPersistido({ ...nueva, passwordHash: "sin-dos-puntos" }),
  null,
);
const parsed = parseUsuariosPersistidos({
  savedAt: "2026-09-21T12:00:00.000Z",
  users: [nueva, { username: "basura" }, nueva],
});
assert.ok(parsed);
assert.equal(parsed.users.length, 1);
assert.equal(parsed.users[0].username, "lola");

const mezclado = mezclarUsuarios([nueva], [iza, almacen1, almacen2]);
assert.equal(mezclado.length, 4);
assert.ok(tieneSemillas(mezclado));
assert.ok(mezclado.some((u) => u.username === "lola"));

const izaNueva = { ...iza, passwordHash: "ffff".repeat(8) + ":" + "aa00".repeat(16) };
assert.equal(
  mezclarUsuarios([izaNueva], [iza, almacen1, almacen2]).find((u) => u.username === "iza")
    ?.passwordHash,
  izaNueva.passwordHash,
);

console.log("ok usuarios-persist");
