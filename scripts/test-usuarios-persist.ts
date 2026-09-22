import assert from "node:assert/strict";

type RolUsuario = "admin" | "operador";
type UsuarioPersistido = {
  id: string;
  username: string;
  nombre: string;
  rol: RolUsuario;
  passwordHash: string;
};

const USERNAME_IZA = "iza";

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
  for (const u of persistidos) map.set(u.username.toLowerCase(), u);
  const ids = new Set(persistidos.map((u) => u.id));
  const izaSeed = semillas.find(
    (s) => s.id === "u-iza" || s.username.toLowerCase() === "iza",
  );
  if (izaSeed && !ids.has(izaSeed.id) && !map.has("iza")) {
    map.set("iza", izaSeed);
  }
  return [...map.values()];
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
assert.equal(mezclado.length, 2);
assert.ok(mezclado.some((u) => u.username === "iza"));
assert.ok(mezclado.some((u) => u.username === "lola"));
assert.equal(
  mezclado.some((u) => u.username === "almacen1"),
  false,
);

const sinLola = mezclarUsuarios([iza, almacen2], [iza, almacen1, almacen2]);
assert.equal(
  sinLola.some((u) => u.username === "almacen1"),
  false,
);
assert.ok(sinLola.some((u) => u.username === "iza"));

const izaNueva = { ...iza, passwordHash: "ffff".repeat(8) + ":" + "aa00".repeat(16) };
assert.equal(
  mezclarUsuarios([izaNueva], [iza, almacen1, almacen2]).find((u) => u.username === "iza")
    ?.passwordHash,
  izaNueva.passwordHash,
);

const izaRenombrada = { ...iza, username: "iza-admin" };
const mezcladoRenombre = mezclarUsuarios(
  [izaRenombrada, nueva],
  [iza, almacen1, almacen2],
);
assert.equal(mezcladoRenombre.some((u) => u.username === "iza"), false);
assert.ok(mezcladoRenombre.some((u) => u.username === "iza-admin"));
assert.ok(mezcladoRenombre.some((u) => u.username === "lola"));
assert.equal(mezcladoRenombre.filter((u) => u.id === "u-iza").length, 1);

console.log("ok usuarios-persist");
