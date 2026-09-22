import { postgresDisponible, cadenaPostgres } from "@/server/env-remoto";

export const DOC_USUARIOS = "usuarios";
export const DOC_CATALOGOS = "catalogos";
export const DOC_ASIGNACIONES = "asignaciones";
export const DOC_STOCK = "stock";
export const DOC_REGISTROS = "registros";
export const DOC_META = "meta";

export type PostgresBackend = {
  get(key: string): Promise<unknown | null>;
  set(key: string, payload: unknown): Promise<boolean>;
};

let testBackend: PostgresBackend | null = null;
let tablePromise: Promise<boolean> | null = null;

export function setPostgresTestBackend(backend: PostgresBackend | null) {
  testBackend = backend;
  tablePromise = null;
}

export function hayPostgres() {
  return Boolean(testBackend) || postgresDisponible();
}

async function neonSql() {
  const url = cadenaPostgres();
  if (!url) return null;
  const { neon } = await import("@neondatabase/serverless");
  return neon(url);
}

async function asegurarTabla(): Promise<boolean> {
  if (testBackend) return true;
  if (!postgresDisponible()) return false;
  if (!tablePromise) {
    tablePromise = (async () => {
      const sql = await neonSql();
      if (!sql) return false;
      await sql`
        CREATE TABLE IF NOT EXISTS brinquitos_docs (
          key TEXT PRIMARY KEY,
          payload JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      return true;
    })().catch((error) => {
      tablePromise = null;
      console.error("postgres schema failed", error);
      return false;
    });
  }
  return tablePromise;
}

export async function leerDoc(key: string): Promise<unknown | null> {
  if (testBackend) return testBackend.get(key);
  if (!(await asegurarTabla())) return null;
  const sql = await neonSql();
  if (!sql) return null;
  try {
    const rows = (await sql`
      SELECT payload FROM brinquitos_docs WHERE key = ${key} LIMIT 1
    `) as Array<{ payload: unknown }>;
    return rows[0]?.payload ?? null;
  } catch (error) {
    console.error("postgres get failed", key, error);
    return null;
  }
}

export async function escribirDoc(
  key: string,
  payload: unknown,
): Promise<boolean> {
  if (testBackend) return testBackend.set(key, payload);
  if (!(await asegurarTabla())) return false;
  const sql = await neonSql();
  if (!sql) return false;
  try {
    const json = JSON.stringify(payload);
    await sql`
      INSERT INTO brinquitos_docs (key, payload, updated_at)
      VALUES (${key}, ${json}::jsonb, now())
      ON CONFLICT (key) DO UPDATE SET
        payload = EXCLUDED.payload,
        updated_at = now()
    `;
    return true;
  } catch (error) {
    console.error("postgres put failed", key, error);
    return false;
  }
}

export function memoriaPostgres(): PostgresBackend {
  const map = new Map<string, unknown>();
  return {
    async get(key) {
      return map.has(key) ? map.get(key)! : null;
    },
    async set(key, payload) {
      map.set(key, payload);
      return true;
    },
  };
}
