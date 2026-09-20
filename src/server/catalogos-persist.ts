import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { createHmac, timingSafeEqual } from "node:crypto";
import { gunzipSync, gzipSync } from "node:zlib";
import { normalizarCatalogos } from "@/lib/catalogos";
import type { Catalogos } from "@/lib/types";

export type CatalogosPersistidos = {
  catalogos: Catalogos;
  savedAt: string;
};

const COOKIE_COUNT = "brq_cn";
const COOKIE_PART = "brq_c";
const MAX_CHUNKS = 8;
const COOKIE_MAX_AGE = 60 * 60 * 24 * 400;
const CHUNK_SIZE = 3200;
const BLOB_PATH = "almacen-brinquitos/catalogos.json";
const GITHUB_FILE = "data/catalogos.json";
const GITHUB_BRANCH = "catalogos-data";
const KV_KEY = "almacen-brinquitos:catalogos";

function secret() {
  return process.env.SESSION_SECRET?.trim() || "almacen-brinquitos-demo";
}

function hmac(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

function firmasIguales(a: string, b: string) {
  try {
    const ba = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

export function archivoCatalogosLocal() {
  if (process.env.VERCEL) {
    return join("/tmp", "almacen-brinquitos", "catalogos.json");
  }
  return join(process.cwd(), "data", "catalogos.json");
}

export function archivoCatalogosEmpaquetado() {
  return join(process.cwd(), "data", "catalogos.json");
}

function parsePersistido(raw: unknown): CatalogosPersistidos | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as {
    catalogos?: Catalogos;
    savedAt?: string;
    esquemas?: Catalogos["esquemas"];
  };
  const catalogos = normalizarCatalogos(
    obj.catalogos ?? (obj.esquemas ? (obj as Catalogos) : undefined),
  );
  const savedAt =
    typeof obj.savedAt === "string" && obj.savedAt ? obj.savedAt : "";
  if (!savedAt && !obj.catalogos && !obj.esquemas) return null;
  return { catalogos, savedAt: savedAt || new Date(0).toISOString() };
}

export function leerCatalogosArchivo(path: string): CatalogosPersistidos | null {
  if (!existsSync(path)) return null;
  try {
    return parsePersistido(JSON.parse(readFileSync(path, "utf8")));
  } catch (error) {
    console.error("catalogos file read failed", path, error);
    return null;
  }
}

export function escribirCatalogosArchivo(
  path: string,
  data: CatalogosPersistidos,
) {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(
    path,
    JSON.stringify(
      { savedAt: data.savedAt, catalogos: data.catalogos },
      null,
      2,
    ),
  );
}

export type CookieAttr = {
  name: string;
  value: string;
  httpOnly: boolean;
  sameSite: "lax";
  path: string;
  secure: boolean;
  maxAge: number;
};

function cookieBase(): Omit<CookieAttr, "name" | "value"> {
  const https =
    process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: https,
    maxAge: COOKIE_MAX_AGE,
  };
}

function tokenCatalogos(data: CatalogosPersistidos) {
  const json = JSON.stringify({
    savedAt: data.savedAt,
    catalogos: data.catalogos,
  });
  const packed = gzipSync(Buffer.from(json, "utf8")).toString("base64url");
  return `brq2.${packed}.${hmac(packed)}`;
}

export function cookiesCatalogos(data: CatalogosPersistidos): CookieAttr[] {
  let token = tokenCatalogos(data);
  const chunksNecesarios = Math.ceil(token.length / CHUNK_SIZE);
  if (chunksNecesarios > MAX_CHUNKS && data.catalogos.logoDataUrl) {
    const { logoDataUrl: _, ...sinLogo } = data.catalogos;
    void _;
    token = tokenCatalogos({ ...data, catalogos: sinLogo });
  }
  const parts: string[] = [];
  for (let i = 0; i < token.length; i += CHUNK_SIZE) {
    parts.push(token.slice(i, i + CHUNK_SIZE));
  }
  if (parts.length > MAX_CHUNKS) {
    throw new Error(
      "Las listas son demasiado grandes para guardarlas. Quita tallas o colores que no uses e intenta de nuevo.",
    );
  }
  const base = cookieBase();
  const cookies: CookieAttr[] = [
    { ...base, name: COOKIE_COUNT, value: String(parts.length) },
  ];
  for (let i = 0; i < MAX_CHUNKS; i++) {
    cookies.push({
      ...base,
      name: `${COOKIE_PART}${i}`,
      value: parts[i] ?? "",
      maxAge: parts[i] ? COOKIE_MAX_AGE : 0,
    });
  }
  return cookies;
}

export function catalogosDesdeCookies(
  leer: (name: string) => string | undefined,
): CatalogosPersistidos | null {
  const n = Number(leer(COOKIE_COUNT) ?? "0");
  if (!Number.isFinite(n) || n < 1 || n > MAX_CHUNKS) return null;
  let token = "";
  for (let i = 0; i < n; i++) {
    const part = leer(`${COOKIE_PART}${i}`);
    if (!part) return null;
    token += part;
  }
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "brq2") return null;
  const [, packed, sig] = parts;
  if (!packed || !sig || !firmasIguales(sig, hmac(packed))) return null;
  try {
    const json = gunzipSync(Buffer.from(packed, "base64url")).toString("utf8");
    return parsePersistido(JSON.parse(json));
  } catch (error) {
    console.error("catalogos cookie decode failed", error);
    return null;
  }
}

function blobDisponible() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

async function escribirBlob(data: CatalogosPersistidos): Promise<boolean> {
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
    console.error("catalogos blob put failed", error);
    return false;
  }
}

async function leerBlob(): Promise<CatalogosPersistidos | null> {
  if (!blobDisponible()) return null;
  try {
    const blob = await import("@vercel/blob");
    const listed = await blob.list({ prefix: BLOB_PATH, limit: 4 });
    const hit = listed.blobs.find((b) => b.pathname === BLOB_PATH);
    if (!hit?.url) return null;
    const res = await fetch(hit.url);
    if (!res.ok) return null;
    return parsePersistido(await res.json());
  } catch (error) {
    console.error("catalogos blob get failed", error);
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

async function escribirKv(data: CatalogosPersistidos): Promise<boolean> {
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
    console.error("catalogos kv put failed", error);
    return false;
  }
}

async function leerKv(): Promise<CatalogosPersistidos | null> {
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
    return parsePersistido(
      typeof body.result === "string" ? JSON.parse(body.result) : body.result,
    );
  } catch (error) {
    console.error("catalogos kv get failed", error);
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

async function escribirGithub(data: CatalogosPersistidos): Promise<boolean> {
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
          message: "chore: persistir listas de captura",
          content: Buffer.from(JSON.stringify(data, null, 2)).toString(
            "base64",
          ),
          sha,
          branch: GITHUB_BRANCH,
        }),
      },
    );
    return res.ok;
  } catch (error) {
    console.error("catalogos github put failed", error);
    return false;
  }
}

async function leerGithub(): Promise<CatalogosPersistidos | null> {
  const gh = githubMeta();
  const owner = gh?.owner || process.env.VERCEL_GIT_REPO_OWNER || "izazogbi-alfa";
  const repo =
    gh?.repo || process.env.VERCEL_GIT_REPO_SLUG || "almacen-brinquitos";
  const raw = `https://raw.githubusercontent.com/${owner}/${repo}/${GITHUB_BRANCH}/${GITHUB_FILE}`;
  try {
    const headers: Record<string, string> = { "User-Agent": "almacen-brinquitos" };
    if (gh?.token) headers.Authorization = `Bearer ${gh.token}`;
    const res = await fetch(raw, { headers, cache: "no-store" });
    if (!res.ok) return null;
    return parsePersistido(await res.json());
  } catch (error) {
    console.error("catalogos github get failed", error);
    return null;
  }
}

async function escribirHttp(data: CatalogosPersistidos): Promise<boolean> {
  const url = process.env.CATALOGOS_STORE_URL?.trim();
  if (!url) return false;
  const token = process.env.CATALOGOS_STORE_TOKEN?.trim();
  try {
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch (error) {
    console.error("catalogos http put failed", error);
    return false;
  }
}

async function leerHttp(): Promise<CatalogosPersistidos | null> {
  const url = process.env.CATALOGOS_STORE_URL?.trim();
  if (!url) return null;
  const token = process.env.CATALOGOS_STORE_TOKEN?.trim();
  try {
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: "no-store",
    });
    if (!res.ok) return null;
    return parsePersistido(await res.json());
  } catch (error) {
    console.error("catalogos http get failed", error);
    return null;
  }
}

function masReciente(
  a: CatalogosPersistidos | null,
  b: CatalogosPersistidos | null,
): CatalogosPersistidos | null {
  if (!a) return b;
  if (!b) return a;
  return Date.parse(a.savedAt) >= Date.parse(b.savedAt) ? a : b;
}

export async function leerCatalogosDuraderos(): Promise<CatalogosPersistidos | null> {
  const locales = masReciente(
    leerCatalogosArchivo(archivoCatalogosLocal()),
    process.env.VERCEL
      ? leerCatalogosArchivo(archivoCatalogosEmpaquetado())
      : null,
  );
  const remotos = await Promise.all([
    leerBlob(),
    leerKv(),
    leerGithub(),
    leerHttp(),
  ]);
  let mejor = locales;
  for (const r of remotos) mejor = masReciente(mejor, r);
  return mejor;
}

export async function guardarCatalogosDuraderos(
  data: CatalogosPersistidos,
): Promise<{ vias: string[]; persistio: boolean }> {
  const vias: string[] = [];
  try {
    escribirCatalogosArchivo(archivoCatalogosLocal(), data);
    vias.push("archivo");
  } catch (error) {
    if (!process.env.VERCEL) throw error;
    console.error("catalogos local write failed", error);
  }

  const intentos: Array<[string, Promise<boolean>]> = [
    ["blob", escribirBlob(data)],
    ["kv", escribirKv(data)],
    ["github", escribirGithub(data)],
    ["http", escribirHttp(data)],
  ];
  const resultados = await Promise.all(
    intentos.map(async ([nombre, p]) => [nombre, await p] as const),
  );
  for (const [nombre, ok] of resultados) {
    if (ok) vias.push(nombre);
  }

  const duradero = vias.some(
    (v) => v !== "archivo" || !process.env.VERCEL,
  );
  return { vias, persistio: duradero };
}

export function aplicarCatalogosAlStore(
  store: { catalogos: Catalogos; catalogosGuardadosEn?: string | null },
  data: CatalogosPersistidos,
) {
  store.catalogos = normalizarCatalogos(data.catalogos);
  store.catalogosGuardadosEn = data.savedAt;
}

export function mejorCatalogos(
  ...cands: Array<CatalogosPersistidos | null | undefined>
): CatalogosPersistidos | null {
  let mejor: CatalogosPersistidos | null = null;
  for (const c of cands) mejor = masReciente(mejor, c ?? null);
  return mejor;
}

export { COOKIE_COUNT, COOKIE_PART, MAX_CHUNKS };
