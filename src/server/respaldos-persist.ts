import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import {
  coleccionVacia,
  parseArchivoRespaldo,
  recortarColeccion,
  resumenDe,
  type ColeccionRespaldos,
  type RespaldoCompleto,
} from "@/lib/respaldos";
import { catalogosVacios } from "@/lib/catalogos";

const BLOB_PATH = "almacen-brinquitos/respaldos.json";
const GITHUB_FILE = "data/respaldos.json";
const GITHUB_BRANCH = "catalogos-data";
const KV_KEY = "almacen-brinquitos:respaldos";

function parseColeccion(raw: unknown): ColeccionRespaldos | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as { savedAt?: unknown; items?: unknown };
  if (!Array.isArray(obj.items)) return null;
  const items: RespaldoCompleto[] = [];
  for (const rawItem of obj.items) {
    if (!rawItem || typeof rawItem !== "object") continue;
    const it = rawItem as Record<string, unknown>;
    const archivo = parseArchivoRespaldo(it);
    if (!archivo) continue;
    const id =
      typeof it.id === "string" && it.id.trim()
        ? it.id.trim()
        : `rb-${items.length + 1}`;
    const catalogos = archivo.catalogos ?? catalogosVacios();
    const asignaciones = archivo.asignaciones ?? {};
    items.push({
      id,
      createdAt: archivo.createdAt,
      origen: archivo.origen,
      dia: archivo.dia,
      resumen: resumenDe(catalogos, asignaciones),
      catalogos,
      asignaciones,
      existencias: archivo.existencias,
      sesiones: archivo.sesiones,
    });
  }
  const savedAt =
    typeof obj.savedAt === "string" && obj.savedAt
      ? obj.savedAt
      : new Date(0).toISOString();
  return { savedAt, items: recortarColeccion(items) };
}

export function archivoRespaldosLocal() {
  if (process.env.VERCEL) {
    return join("/tmp", "almacen-brinquitos", "respaldos.json");
  }
  return join(process.cwd(), "data", "respaldos.json");
}

export function archivoRespaldosEmpaquetado() {
  return join(process.cwd(), "data", "respaldos.json");
}

export function leerRespaldosArchivo(path: string): ColeccionRespaldos | null {
  if (!existsSync(path)) return null;
  try {
    return parseColeccion(JSON.parse(readFileSync(path, "utf8")));
  } catch (error) {
    console.error("respaldos file read failed", path, error);
    return null;
  }
}

export function escribirRespaldosArchivo(path: string, data: ColeccionRespaldos) {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2));
}

function masReciente(
  a: ColeccionRespaldos | null,
  b: ColeccionRespaldos | null,
): ColeccionRespaldos | null {
  if (!a) return b;
  if (!b) return a;
  return Date.parse(a.savedAt) >= Date.parse(b.savedAt) ? a : b;
}

function blobDisponible() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

async function escribirBlob(data: ColeccionRespaldos): Promise<boolean> {
  if (!blobDisponible()) return false;
  try {
    const { put } = await import("@vercel/blob");
    await put(BLOB_PATH, JSON.stringify(data), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
    return true;
  } catch (error) {
    console.error("respaldos blob put failed", error);
    return false;
  }
}

async function leerBlob(): Promise<ColeccionRespaldos | null> {
  if (!blobDisponible()) return null;
  try {
    const blob = await import("@vercel/blob");
    const listed = await blob.list({ prefix: BLOB_PATH, limit: 4 });
    const hit = listed.blobs.find((b) => b.pathname === BLOB_PATH);
    if (!hit?.url) return null;
    const res = await fetch(hit.url);
    if (!res.ok) return null;
    return parseColeccion(await res.json());
  } catch (error) {
    console.error("respaldos blob get failed", error);
    return null;
  }
}

function kvCreds() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ""), token };
}

async function escribirKv(data: ColeccionRespaldos): Promise<boolean> {
  const kv = kvCreds();
  if (!kv) return false;
  try {
    const res = await fetch(`${kv.url}/set/${encodeURIComponent(KV_KEY)}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${kv.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch (error) {
    console.error("respaldos kv put failed", error);
    return false;
  }
}

async function leerKv(): Promise<ColeccionRespaldos | null> {
  const kv = kvCreds();
  if (!kv) return null;
  try {
    const res = await fetch(`${kv.url}/get/${encodeURIComponent(KV_KEY)}`, {
      headers: { Authorization: `Bearer ${kv.token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { result?: string | null };
    if (!body.result) return null;
    return parseColeccion(
      typeof body.result === "string" ? JSON.parse(body.result) : body.result,
    );
  } catch (error) {
    console.error("respaldos kv get failed", error);
    return null;
  }
}

function githubMeta() {
  const token = process.env.STORE_GITHUB_TOKEN?.trim();
  if (!token) return null;
  return {
    token,
    owner: process.env.VERCEL_GIT_REPO_OWNER || "izazogbi-alfa",
    repo: process.env.VERCEL_GIT_REPO_SLUG || "almacen-brinquitos",
  };
}

async function escribirGithub(data: ColeccionRespaldos): Promise<boolean> {
  const gh = githubMeta();
  if (!gh) return false;
  const headers = {
    Authorization: `Bearer ${gh.token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "almacen-brinquitos",
  };
  const url = `https://api.github.com/repos/${gh.owner}/${gh.repo}/contents/${GITHUB_FILE}?ref=${GITHUB_BRANCH}`;
  try {
    const existing = await fetch(url, { headers, cache: "no-store" });
    const sha = existing.ok
      ? ((await existing.json()) as { sha?: string }).sha
      : undefined;
    const res = await fetch(
      `https://api.github.com/repos/${gh.owner}/${gh.repo}/contents/${GITHUB_FILE}`,
      {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "chore: persistir respaldos de listas",
          content: Buffer.from(JSON.stringify(data, null, 2)).toString("base64"),
          sha,
          branch: GITHUB_BRANCH,
        }),
      },
    );
    return res.ok;
  } catch (error) {
    console.error("respaldos github put failed", error);
    return false;
  }
}

async function leerGithub(): Promise<ColeccionRespaldos | null> {
  const gh = githubMeta();
  const owner = gh?.owner || process.env.VERCEL_GIT_REPO_OWNER || "izazogbi-alfa";
  const repo =
    gh?.repo || process.env.VERCEL_GIT_REPO_SLUG || "almacen-brinquitos";
  const raw = `https://raw.githubusercontent.com/${owner}/${repo}/${GITHUB_BRANCH}/${GITHUB_FILE}`;
  try {
    const headers: Record<string, string> = {
      "User-Agent": "almacen-brinquitos",
    };
    if (gh?.token) headers.Authorization = `Bearer ${gh.token}`;
    const res = await fetch(raw, { headers, cache: "no-store" });
    if (!res.ok) return null;
    return parseColeccion(await res.json());
  } catch (error) {
    console.error("respaldos github get failed", error);
    return null;
  }
}

let memory: ColeccionRespaldos | null = null;

export async function leerColeccionRespaldos(): Promise<ColeccionRespaldos> {
  const locales = masReciente(
    memory,
    masReciente(
      leerRespaldosArchivo(archivoRespaldosLocal()),
      process.env.VERCEL
        ? leerRespaldosArchivo(archivoRespaldosEmpaquetado())
        : null,
    ),
  );
  const remotos = await Promise.all([
    leerBlob(),
    leerKv(),
    leerGithub(),
  ]);
  let mejor = locales;
  for (const r of remotos) mejor = masReciente(mejor, r);
  const coleccion = mejor ?? coleccionVacia();
  coleccion.items = recortarColeccion(coleccion.items);
  memory = coleccion;
  return coleccion;
}

export async function guardarColeccionRespaldos(
  data: ColeccionRespaldos,
): Promise<{ vias: string[]; persistio: boolean }> {
  const recortada: ColeccionRespaldos = {
    savedAt: data.savedAt,
    items: recortarColeccion(data.items),
  };
  memory = recortada;
  const vias: string[] = [];
  try {
    escribirRespaldosArchivo(archivoRespaldosLocal(), recortada);
    vias.push("archivo");
  } catch (error) {
    if (!process.env.VERCEL) throw error;
    console.error("respaldos local write failed", error);
  }

  const intentos: Array<[string, Promise<boolean>]> = [
    ["blob", escribirBlob(recortada)],
    ["kv", escribirKv(recortada)],
    ["github", escribirGithub(recortada)],
  ];
  const resultados = await Promise.all(
    intentos.map(async ([nombre, p]) => [nombre, await p] as const),
  );
  for (const [nombre, ok] of resultados) {
    if (ok) vias.push(nombre);
  }
  const duradero = vias.some((v) => v !== "archivo" || !process.env.VERCEL);
  return { vias, persistio: duradero };
}
