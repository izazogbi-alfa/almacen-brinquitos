import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { createHmac, timingSafeEqual } from "node:crypto";
import { gunzipSync, gzipSync } from "node:zlib";
import {
  parseAsignacionesPersistidas,
  preferirAsignaciones,
  type AsignacionesPersistidas,
} from "@/lib/asignaciones-articulos";
import { blobDisponible, esViaDuradera } from "@/server/env-remoto";
import { sessionSecret } from "@/server/session-secret";
import { DOC_ASIGNACIONES, hayPostgres, leerDoc, escribirDoc } from "@/server/postgres";

const COOKIE_COUNT = "brq_an";
const COOKIE_PART = "brq_a";
const MAX_CHUNKS = 8;
const COOKIE_MAX_AGE = 60 * 60 * 24 * 400;
const CHUNK_SIZE = 3200;
const BLOB_PATH = "almacen-brinquitos/asignaciones-articulos.json";
const GITHUB_FILE = "data/asignaciones-articulos.json";
const GITHUB_BRANCH = "catalogos-data";
const KV_KEY = "almacen-brinquitos:asignaciones";

function hmac(payload: string) {
  return createHmac("sha256", sessionSecret()).update(payload).digest("hex");
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

export function archivoAsignacionesLocal() {
  if (process.env.VERCEL) {
    return join("/tmp", "almacen-brinquitos", "asignaciones-articulos.json");
  }
  return join(process.cwd(), "data", "asignaciones-articulos.json");
}

export function archivoAsignacionesEmpaquetado() {
  return join(process.cwd(), "data", "asignaciones-articulos.json");
}

function compactar(data: AsignacionesPersistidas) {
  const a: Record<
    string,
    { e: string; c: string[]; t: string[]; s: string[] }
  > = {};
  for (const [clave, asignacion] of Object.entries(data.asignaciones)) {
    a[clave] = {
      e: asignacion.esquemaConteo,
      c: asignacion.colores,
      t: asignacion.tallas,
      s: asignacion.especificaciones,
    };
  }
  return { savedAt: data.savedAt, a };
}

export function leerAsignacionesArchivo(
  path: string,
): AsignacionesPersistidas | null {
  if (!existsSync(path)) return null;
  try {
    return parseAsignacionesPersistidas(
      JSON.parse(readFileSync(path, "utf8")),
    );
  } catch (error) {
    console.error("asignaciones file read failed", path, error);
    return null;
  }
}

export function escribirAsignacionesArchivo(
  path: string,
  data: AsignacionesPersistidas,
) {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, JSON.stringify(compactar(data), null, 2));
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

export function cookiesAsignaciones(
  data: AsignacionesPersistidas,
): CookieAttr[] {
  const packed = gzipSync(
    Buffer.from(JSON.stringify(compactar(data)), "utf8"),
  ).toString("base64url");
  const sig = hmac(packed);
  const token = `brq2.${packed}.${sig}`;
  const parts: string[] = [];
  for (let i = 0; i < token.length; i += CHUNK_SIZE) {
    parts.push(token.slice(i, i + CHUNK_SIZE));
  }
  if (parts.length > MAX_CHUNKS) {
    throw new Error(
      "Hay demasiados esquemas de artículo para guardarlos aquí. Intenta de nuevo o pide que activen el almacén compartido.",
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

export function asignacionesDesdeCookies(
  leer: (name: string) => string | undefined,
): AsignacionesPersistidas | null {
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
    return parseAsignacionesPersistidas(JSON.parse(json));
  } catch (error) {
    console.error("asignaciones cookie decode failed", error);
    return null;
  }
}

async function escribirPostgres(data: AsignacionesPersistidas): Promise<boolean> {
  if (!hayPostgres()) return false;
  return escribirDoc(DOC_ASIGNACIONES, compactar(data));
}

async function leerPostgres(): Promise<AsignacionesPersistidas | null> {
  if (!hayPostgres()) return null;
  return parseAsignacionesPersistidas(await leerDoc(DOC_ASIGNACIONES));
}

async function escribirBlob(data: AsignacionesPersistidas): Promise<boolean> {
  if (!blobDisponible()) return false;
  try {
    const { put } = await import("@vercel/blob");
    await put(BLOB_PATH, JSON.stringify(compactar(data)), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
    return true;
  } catch (error) {
    console.error("asignaciones blob put failed", error);
    return false;
  }
}

async function leerBlob(): Promise<AsignacionesPersistidas | null> {
  if (!blobDisponible()) return null;
  try {
    const blob = await import("@vercel/blob");
    const listed = await blob.list({ prefix: BLOB_PATH, limit: 4 });
    const hit = listed.blobs.find((b) => b.pathname === BLOB_PATH);
    if (!hit?.url) return null;
    const res = await fetch(hit.url);
    if (!res.ok) return null;
    return parseAsignacionesPersistidas(await res.json());
  } catch (error) {
    console.error("asignaciones blob get failed", error);
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

async function escribirKv(data: AsignacionesPersistidas): Promise<boolean> {
  const kv = kvCreds();
  if (!kv) return false;
  try {
    const res = await fetch(`${kv.url}/set/${encodeURIComponent(KV_KEY)}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${kv.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(compactar(data)),
    });
    return res.ok;
  } catch (error) {
    console.error("asignaciones kv put failed", error);
    return false;
  }
}

async function leerKv(): Promise<AsignacionesPersistidas | null> {
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
    return parseAsignacionesPersistidas(
      typeof body.result === "string" ? JSON.parse(body.result) : body.result,
    );
  } catch (error) {
    console.error("asignaciones kv get failed", error);
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

async function escribirGithub(data: AsignacionesPersistidas): Promise<boolean> {
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
          message: "chore: persistir esquemas de artículos",
          content: Buffer.from(JSON.stringify(compactar(data), null, 2)).toString(
            "base64",
          ),
          sha,
          branch: GITHUB_BRANCH,
        }),
      },
    );
    return res.ok;
  } catch (error) {
    console.error("asignaciones github put failed", error);
    return false;
  }
}

async function leerGithub(): Promise<AsignacionesPersistidas | null> {
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
    return parseAsignacionesPersistidas(await res.json());
  } catch (error) {
    console.error("asignaciones github get failed", error);
    return null;
  }
}

function httpAsignaciones() {
  const dedicado = process.env.ASIGNACIONES_STORE_URL?.trim();
  if (dedicado) {
    return {
      url: dedicado,
      token: process.env.ASIGNACIONES_STORE_TOKEN?.trim(),
    };
  }
  return null;
}

async function escribirHttp(data: AsignacionesPersistidas): Promise<boolean> {
  const http = httpAsignaciones();
  if (!http) return false;
  try {
    const res = await fetch(http.url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(http.token ? { Authorization: `Bearer ${http.token}` } : {}),
      },
      body: JSON.stringify(compactar(data)),
    });
    return res.ok;
  } catch (error) {
    console.error("asignaciones http put failed", error);
    return false;
  }
}

async function leerHttp(): Promise<AsignacionesPersistidas | null> {
  const http = httpAsignaciones();
  if (!http) return null;
  try {
    const res = await fetch(http.url, {
      headers: http.token ? { Authorization: `Bearer ${http.token}` } : {},
      cache: "no-store",
    });
    if (!res.ok) return null;
    return parseAsignacionesPersistidas(await res.json());
  } catch (error) {
    console.error("asignaciones http get failed", error);
    return null;
  }
}

function masReciente(
  a: AsignacionesPersistidas | null,
  b: AsignacionesPersistidas | null,
): AsignacionesPersistidas | null {
  return preferirAsignaciones(a, b);
}

export async function leerAsignacionesDuraderas(): Promise<AsignacionesPersistidas | null> {
  const locales = masReciente(
    leerAsignacionesArchivo(archivoAsignacionesLocal()),
    process.env.VERCEL
      ? leerAsignacionesArchivo(archivoAsignacionesEmpaquetado())
      : null,
  );
  const remotos = await Promise.all([
    leerPostgres(),
    leerBlob(),
    leerKv(),
    leerGithub(),
    leerHttp(),
  ]);
  let mejor = locales;
  for (const r of remotos) mejor = masReciente(mejor, r);
  return mejor;
}

export async function guardarAsignacionesDuraderas(
  data: AsignacionesPersistidas,
): Promise<{ vias: string[]; persistio: boolean }> {
  const vias: string[] = [];
  try {
    escribirAsignacionesArchivo(archivoAsignacionesLocal(), data);
    vias.push("archivo");
  } catch (error) {
    if (!process.env.VERCEL) throw error;
    console.error("asignaciones local write failed", error);
  }

  const intentos: Array<[string, Promise<boolean>]> = [
    ["postgres", escribirPostgres(data)],
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

  return { vias, persistio: vias.some(esViaDuradera) };
}

export function mejorAsignaciones(
  ...cands: Array<AsignacionesPersistidas | null | undefined>
): AsignacionesPersistidas | null {
  let mejor: AsignacionesPersistidas | null = null;
  for (const c of cands) mejor = masReciente(mejor, c ?? null);
  return mejor;
}

export { COOKIE_COUNT, COOKIE_PART, MAX_CHUNKS };
