import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { createHmac, timingSafeEqual } from "node:crypto";
import { gunzipSync, gzipSync } from "node:zlib";
import {
  coleccionVacia,
  completoDesdeArchivo,
  indiceDesdeColeccion,
  mezclarColecciones,
  mezclarIndices,
  parseArchivoRespaldo,
  parseColeccionRespaldos,
  parseIndiceRespaldos,
  recortarColeccion,
  type ColeccionRespaldos,
  type IndiceRespaldos,
  type RespaldoCompleto,
} from "@/lib/respaldos";

const BLOB_LEGACY = "almacen-brinquitos/respaldos.json";
const BLOB_INDICE = "almacen-brinquitos/respaldos-indice.json";
const BLOB_DIAS = "almacen-brinquitos/respaldos/dias/";
const GITHUB_LEGACY = "data/respaldos.json";
const GITHUB_INDICE = "data/respaldos-indice.json";
const GITHUB_DIAS = "data/respaldos/dias/";
const GITHUB_BRANCH = "catalogos-data";
const KV_LEGACY = "almacen-brinquitos:respaldos";
const KV_INDICE = "almacen-brinquitos:respaldos-indice";
const KV_ITEM_PREFIX = "almacen-brinquitos:respaldo:";

const COOKIE_COUNT = "brq_bn";
const COOKIE_PART = "brq_b";
const MAX_CHUNKS = 4;
const COOKIE_MAX_AGE = 60 * 60 * 24 * 400;
const CHUNK_SIZE = 3200;

export type CookieAttr = {
  name: string;
  value: string;
  httpOnly: boolean;
  sameSite: "lax";
  path: string;
  secure: boolean;
  maxAge: number;
};

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

function dirBaseLocal() {
  if (process.env.VERCEL) {
    return join("/tmp", "almacen-brinquitos");
  }
  return join(process.cwd(), "data");
}

export function archivoRespaldosLocal() {
  return join(dirBaseLocal(), "respaldos.json");
}

export function archivoRespaldosEmpaquetado() {
  return join(process.cwd(), "data", "respaldos.json");
}

function archivoIndiceLocal() {
  return join(dirBaseLocal(), "respaldos-indice.json");
}

function dirDiasLocal() {
  return join(dirBaseLocal(), "respaldos", "dias");
}

function archivoDiaLocal(id: string) {
  return join(dirDiasLocal(), `${id}.json`);
}

function blobPathDia(id: string) {
  return `${BLOB_DIAS}${id}.json`;
}

function githubPathDia(id: string) {
  return `${GITHUB_DIAS}${id}.json`;
}

function kvKeyDia(id: string) {
  return `${KV_ITEM_PREFIX}${id}`;
}

export function leerRespaldosArchivo(path: string): ColeccionRespaldos | null {
  if (!existsSync(path)) return null;
  try {
    return parseColeccionRespaldos(JSON.parse(readFileSync(path, "utf8")));
  } catch (error) {
    console.error("respaldos file read failed", path, error);
    return null;
  }
}

function leerIndiceArchivo(path: string): IndiceRespaldos | null {
  if (!existsSync(path)) return null;
  try {
    return parseIndiceRespaldos(JSON.parse(readFileSync(path, "utf8")));
  } catch (error) {
    console.error("respaldos indice file read failed", path, error);
    return null;
  }
}

function escribirJson(path: string, data: unknown) {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2));
}

export function escribirRespaldosArchivo(path: string, data: ColeccionRespaldos) {
  escribirJson(path, data);
}

function itemDesdeRaw(raw: unknown, fallbackId: string): RespaldoCompleto | null {
  const col = parseColeccionRespaldos(raw);
  if (col?.items[0]) return col.items[0];
  if (!raw || typeof raw !== "object") return null;
  const it = raw as Record<string, unknown>;
  const archivo = parseArchivoRespaldo(it);
  if (!archivo) return null;
  const id =
    typeof it.id === "string" && it.id.trim() ? it.id.trim() : fallbackId;
  return completoDesdeArchivo(archivo, id);
}

function leerDiasLocal(): ColeccionRespaldos | null {
  const dir = dirDiasLocal();
  if (!existsSync(dir)) return null;
  const items: RespaldoCompleto[] = [];
  let savedAt = new Date(0).toISOString();
  try {
    for (const name of readdirSync(dir)) {
      if (!name.endsWith(".json")) continue;
      const parsed = leerRespaldosArchivo(join(dir, name));
      for (const it of parsed?.items ?? []) {
        items.push(it);
        if (Date.parse(it.createdAt) > Date.parse(savedAt)) savedAt = it.createdAt;
      }
    }
  } catch (error) {
    console.error("respaldos local dias read failed", error);
    return null;
  }
  if (!items.length) return null;
  return { savedAt, items: recortarColeccion(items) };
}

function tokenIndice(data: IndiceRespaldos) {
  const json = JSON.stringify({
    savedAt: data.savedAt,
    items: data.items,
  });
  const packed = gzipSync(Buffer.from(json, "utf8")).toString("base64url");
  return `brq2.${packed}.${hmac(packed)}`;
}

export function cookiesIndiceRespaldos(data: IndiceRespaldos): CookieAttr[] {
  const token = tokenIndice({
    savedAt: data.savedAt,
    items: recortarColeccion(data.items),
  });
  const parts: string[] = [];
  for (let i = 0; i < token.length; i += CHUNK_SIZE) {
    parts.push(token.slice(i, i + CHUNK_SIZE));
  }
  if (parts.length > MAX_CHUNKS) {
    return [];
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

export function indiceDesdeCookies(
  leer: (name: string) => string | undefined,
): IndiceRespaldos | null {
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
    return parseIndiceRespaldos(JSON.parse(json));
  } catch (error) {
    console.error("respaldos cookie decode failed", error);
    return null;
  }
}

function blobDisponible() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

async function blobMod() {
  return import("@vercel/blob");
}

async function escribirBlobPath(pathname: string, data: unknown): Promise<boolean> {
  if (!blobDisponible()) return false;
  try {
    const { put } = await blobMod();
    await put(pathname, JSON.stringify(data), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
    return true;
  } catch (error) {
    console.error("respaldos blob put failed", pathname, error);
    return false;
  }
}

async function leerBlobJson(pathname: string): Promise<unknown | null> {
  if (!blobDisponible()) return null;
  try {
    const blob = await blobMod();
    const listed = await blob.list({ prefix: pathname, limit: 8 });
    const hit = listed.blobs.find((b) => b.pathname === pathname);
    if (!hit?.url) return null;
    const res = await fetch(hit.url);
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error("respaldos blob get failed", pathname, error);
    return null;
  }
}

async function listarBlobPrefijo(prefix: string) {
  if (!blobDisponible()) return [];
  try {
    const blob = await blobMod();
    const out: Array<{ pathname: string; url: string }> = [];
    let cursor: string | undefined;
    do {
      const listed = await blob.list({ prefix, cursor, limit: 100 });
      for (const b of listed.blobs) {
        if (b.url) out.push({ pathname: b.pathname, url: b.url });
      }
      cursor = listed.hasMore && listed.cursor ? listed.cursor : undefined;
    } while (cursor);
    return out;
  } catch (error) {
    console.error("respaldos blob list failed", prefix, error);
    return [];
  }
}

async function leerBlobColeccion(): Promise<ColeccionRespaldos | null> {
  const legacy = parseColeccionRespaldos(await leerBlobJson(BLOB_LEGACY));
  const hits = await listarBlobPrefijo(BLOB_DIAS);
  const items: RespaldoCompleto[] = [];
  await Promise.all(
    hits.map(async (hit) => {
      try {
        const res = await fetch(hit.url);
        if (!res.ok) return;
        const id = hit.pathname.slice(BLOB_DIAS.length).replace(/\.json$/, "");
        const item = itemDesdeRaw(await res.json(), id);
        if (item) items.push(item);
      } catch (error) {
        console.error("respaldos blob dia read failed", hit.pathname, error);
      }
    }),
  );
  const dias = items.length
    ? {
        savedAt: items
          .slice()
          .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0]
          .createdAt,
        items,
      }
    : null;
  const mezclada = mezclarColecciones(legacy, dias);
  return mezclada.items.length ? mezclada : null;
}

async function leerBlobIndice(): Promise<IndiceRespaldos | null> {
  return parseIndiceRespaldos(await leerBlobJson(BLOB_INDICE));
}

async function borrarBlobPath(pathname: string) {
  if (!blobDisponible()) return;
  try {
    const blob = await blobMod();
    await blob.del(pathname);
  } catch (error) {
    console.error("respaldos blob del failed", pathname, error);
  }
}

function kvCreds() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ""), token };
}

async function kvSet(key: string, data: unknown): Promise<boolean> {
  const kv = kvCreds();
  if (!kv) return false;
  try {
    const res = await fetch(`${kv.url}/set/${encodeURIComponent(key)}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${kv.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch (error) {
    console.error("respaldos kv put failed", key, error);
    return false;
  }
}

async function kvGet(key: string): Promise<unknown | null> {
  const kv = kvCreds();
  if (!kv) return null;
  try {
    const res = await fetch(`${kv.url}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${kv.token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { result?: string | null };
    if (!body.result) return null;
    return typeof body.result === "string" ? JSON.parse(body.result) : body.result;
  } catch (error) {
    console.error("respaldos kv get failed", key, error);
    return null;
  }
}

async function kvDel(key: string) {
  const kv = kvCreds();
  if (!kv) return;
  try {
    await fetch(`${kv.url}/del/${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${kv.token}` },
    });
  } catch (error) {
    console.error("respaldos kv del failed", key, error);
  }
}

async function leerKvColeccion(indice: IndiceRespaldos | null): Promise<ColeccionRespaldos | null> {
  const legacy = parseColeccionRespaldos(await kvGet(KV_LEGACY));
  const ids = new Set((indice?.items ?? []).map((it) => it.id));
  for (const it of legacy?.items ?? []) ids.add(it.id);
  const extra = parseIndiceRespaldos(await kvGet(KV_INDICE));
  for (const it of extra?.items ?? []) ids.add(it.id);
  const items: RespaldoCompleto[] = [];
  await Promise.all(
    [...ids].map(async (id) => {
      const item = itemDesdeRaw(await kvGet(kvKeyDia(id)), id);
      if (item) items.push(item);
    }),
  );
  const dias = items.length
    ? {
        savedAt:
          extra?.savedAt ??
          indice?.savedAt ??
          items[0].createdAt,
        items,
      }
    : null;
  const mezclada = mezclarColecciones(legacy, dias);
  return mezclada.items.length ? mezclada : null;
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

function githubHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "almacen-brinquitos",
  };
}

let ramaPromise: Promise<boolean> | null = null;

async function asegurarRamaCatalogos(): Promise<boolean> {
  const gh = githubMeta();
  if (!gh) return false;
  if (!ramaPromise) {
    ramaPromise = (async () => {
      const headers = githubHeaders(gh.token);
      const base = `https://api.github.com/repos/${gh.owner}/${gh.repo}`;
      try {
        const existe = await fetch(`${base}/branches/${GITHUB_BRANCH}`, {
          headers,
          cache: "no-store",
        });
        if (existe.ok) return true;
        const repo = await fetch(base, { headers, cache: "no-store" });
        if (!repo.ok) return false;
        const info = (await repo.json()) as { default_branch?: string };
        const defaultBranch = info.default_branch || "main";
        const ref = await fetch(`${base}/git/ref/heads/${defaultBranch}`, {
          headers,
          cache: "no-store",
        });
        if (!ref.ok) return false;
        const sha = ((await ref.json()) as { object?: { sha?: string } }).object
          ?.sha;
        if (!sha) return false;
        const crear = await fetch(`${base}/git/refs`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            ref: `refs/heads/${GITHUB_BRANCH}`,
            sha,
          }),
        });
        return crear.ok || crear.status === 422;
      } catch (error) {
        console.error("respaldos github branch failed", error);
        return false;
      }
    })();
  }
  return ramaPromise;
}

async function githubGetJson(path: string): Promise<unknown | null> {
  const gh = githubMeta();
  const owner = gh?.owner || process.env.VERCEL_GIT_REPO_OWNER || "izazogbi-alfa";
  const repo =
    gh?.repo || process.env.VERCEL_GIT_REPO_SLUG || "almacen-brinquitos";
  const raw = `https://raw.githubusercontent.com/${owner}/${repo}/${GITHUB_BRANCH}/${path}`;
  try {
    const headers: Record<string, string> = {
      "User-Agent": "almacen-brinquitos",
    };
    if (gh?.token) headers.Authorization = `Bearer ${gh.token}`;
    const res = await fetch(raw, { headers, cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error("respaldos github get failed", path, error);
    return null;
  }
}

async function githubPutJson(path: string, data: unknown, message: string) {
  const gh = githubMeta();
  if (!gh) return false;
  if (!(await asegurarRamaCatalogos())) return false;
  const headers = githubHeaders(gh.token);
  const url = `https://api.github.com/repos/${gh.owner}/${gh.repo}/contents/${path}?ref=${GITHUB_BRANCH}`;
  try {
    const existing = await fetch(url, { headers, cache: "no-store" });
    const sha = existing.ok
      ? ((await existing.json()) as { sha?: string }).sha
      : undefined;
    const res = await fetch(
      `https://api.github.com/repos/${gh.owner}/${gh.repo}/contents/${path}`,
      {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          content: Buffer.from(JSON.stringify(data, null, 2)).toString("base64"),
          sha,
          branch: GITHUB_BRANCH,
        }),
      },
    );
    return res.ok;
  } catch (error) {
    console.error("respaldos github put failed", path, error);
    return false;
  }
}

async function githubDel(path: string) {
  const gh = githubMeta();
  if (!gh) return;
  const headers = githubHeaders(gh.token);
  const url = `https://api.github.com/repos/${gh.owner}/${gh.repo}/contents/${path}?ref=${GITHUB_BRANCH}`;
  try {
    const existing = await fetch(url, { headers, cache: "no-store" });
    if (!existing.ok) return;
    const sha = ((await existing.json()) as { sha?: string }).sha;
    if (!sha) return;
    await fetch(
      `https://api.github.com/repos/${gh.owner}/${gh.repo}/contents/${path}`,
      {
        method: "DELETE",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "chore: quitar respaldo viejo del tope",
          sha,
          branch: GITHUB_BRANCH,
        }),
      },
    );
  } catch (error) {
    console.error("respaldos github del failed", path, error);
  }
}

async function githubListDias(): Promise<string[]> {
  const gh = githubMeta();
  if (!gh) return [];
  const headers = githubHeaders(gh.token);
  const url = `https://api.github.com/repos/${gh.owner}/${gh.repo}/contents/${GITHUB_DIAS}?ref=${GITHUB_BRANCH}`;
  try {
    const res = await fetch(url, { headers, cache: "no-store" });
    if (!res.ok) return [];
    const body = (await res.json()) as Array<{ name?: string; type?: string }>;
    if (!Array.isArray(body)) return [];
    return body
      .filter((f) => f.type === "file" && typeof f.name === "string" && f.name.endsWith(".json"))
      .map((f) => String(f.name).replace(/\.json$/, ""));
  } catch (error) {
    console.error("respaldos github list failed", error);
    return [];
  }
}

async function leerGithubColeccion(): Promise<ColeccionRespaldos | null> {
  const legacy = parseColeccionRespaldos(await githubGetJson(GITHUB_LEGACY));
  const ids = await githubListDias();
  const items: RespaldoCompleto[] = [];
  await Promise.all(
    ids.map(async (id) => {
      const item = itemDesdeRaw(await githubGetJson(githubPathDia(id)), id);
      if (item) items.push(item);
    }),
  );
  const dias = items.length
    ? {
        savedAt: items
          .slice()
          .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0]
          .createdAt,
        items,
      }
    : null;
  const mezclada = mezclarColecciones(legacy, dias);
  return mezclada.items.length ? mezclada : null;
}

async function leerGithubIndice(): Promise<IndiceRespaldos | null> {
  return parseIndiceRespaldos(await githubGetJson(GITHUB_INDICE));
}

let memory: ColeccionRespaldos | null = null;

function huecoDesdeIndice(indice: IndiceRespaldos | null): ColeccionRespaldos | null {
  if (!indice?.items.length) return null;
  return {
    savedAt: indice.savedAt,
    items: indice.items.map((meta) => ({
      ...meta,
      catalogos: {
        esquemas: [],
        colores: [],
        tallas: [],
        especificaciones: [],
      },
      asignaciones: {},
      hueco: true,
    })),
  } as ColeccionRespaldos;
}

function esHueco(item: RespaldoCompleto) {
  return Boolean((item as RespaldoCompleto & { hueco?: boolean }).hueco);
}

function enriquecerConHuecos(
  col: ColeccionRespaldos,
  indice: IndiceRespaldos | null,
): ColeccionRespaldos {
  const huecos = huecoDesdeIndice(indice);
  if (!huecos) return col;
  const extra = huecos.items.filter(
    (it) =>
      !col.items.some(
        (c) =>
          !esHueco(c) &&
          c.origen === it.origen &&
          (c.origen === "automatico" ? c.dia === it.dia : c.id === it.id),
      ),
  );
  if (!extra.length) return col;
  return mezclarColecciones(col, { savedAt: huecos.savedAt, items: extra });
}

async function leerCuerposDuraderos(
  leerCookie?: (name: string) => string | undefined,
): Promise<{ cuerpos: ColeccionRespaldos; indice: IndiceRespaldos }> {
  const locales = mezclarColecciones(
    memory ? { ...memory, items: memory.items.filter((it) => !esHueco(it)) } : null,
    leerRespaldosArchivo(archivoRespaldosLocal()),
    leerDiasLocal(),
    process.env.VERCEL ? leerRespaldosArchivo(archivoRespaldosEmpaquetado()) : null,
  );
  const [blobCol, blobInd, kvInd, ghCol, ghInd] = await Promise.all([
    leerBlobColeccion(),
    leerBlobIndice(),
    kvGet(KV_INDICE).then(parseIndiceRespaldos),
    leerGithubColeccion(),
    leerGithubIndice(),
  ]);
  const indiceLocal = mezclarIndices(
    leerIndiceArchivo(archivoIndiceLocal()),
    leerCookie ? indiceDesdeCookies(leerCookie) : null,
    blobInd,
    kvInd,
    ghInd,
    indiceDesdeColeccion(locales),
    indiceDesdeColeccion(blobCol ?? coleccionVacia()),
    indiceDesdeColeccion(ghCol ?? coleccionVacia()),
  );
  const kvCol = await leerKvColeccion(indiceLocal);
  const cuerpos = mezclarColecciones(locales, blobCol, kvCol, ghCol);
  const indice = mezclarIndices(indiceLocal, indiceDesdeColeccion(cuerpos));
  return { cuerpos, indice };
}

export async function leerColeccionRespaldos(
  leerCookie?: (name: string) => string | undefined,
): Promise<ColeccionRespaldos> {
  const { cuerpos, indice } = await leerCuerposDuraderos(leerCookie);
  const coleccion = enriquecerConHuecos(
    cuerpos.items.length ? cuerpos : coleccionVacia(),
    indice,
  );
  memory = coleccion;
  return coleccion;
}

async function persistirCuerpo(
  item: RespaldoCompleto,
): Promise<{ blob: boolean; kv: boolean; github: boolean; archivo: boolean }> {
  const { hueco: _hueco, ...payload } = item as RespaldoCompleto & {
    hueco?: boolean;
  };
  void _hueco;
  let archivo = false;
  try {
    escribirJson(archivoDiaLocal(item.id), payload);
    archivo = true;
  } catch (error) {
    if (!process.env.VERCEL) throw error;
    console.error("respaldos local dia write failed", error);
  }
  const [blob, kv, github] = await Promise.all([
    escribirBlobPath(blobPathDia(item.id), payload),
    kvSet(kvKeyDia(item.id), payload),
    githubPutJson(
      githubPathDia(item.id),
      payload,
      `chore: respaldo ${item.origen} ${item.dia}`,
    ),
  ]);
  return { blob, kv, github, archivo };
}

async function persistirIndice(indice: IndiceRespaldos) {
  try {
    escribirJson(archivoIndiceLocal(), indice);
  } catch (error) {
    if (!process.env.VERCEL) throw error;
    console.error("respaldos local indice write failed", error);
  }
  const [blob, kv, github] = await Promise.all([
    escribirBlobPath(BLOB_INDICE, indice),
    kvSet(KV_INDICE, indice),
    githubPutJson(GITHUB_INDICE, indice, "chore: indice de respaldos"),
  ]);
  return { blob, kv, github };
}

async function borrarCuerpo(id: string) {
  try {
    const path = archivoDiaLocal(id);
    if (existsSync(path)) unlinkSync(path);
  } catch (error) {
    console.error("respaldos local dia del failed", id, error);
  }
  await Promise.all([
    borrarBlobPath(blobPathDia(id)),
    kvDel(kvKeyDia(id)),
    githubDel(githubPathDia(id)),
  ]);
}

export async function guardarColeccionRespaldos(
  data: ColeccionRespaldos,
  opts?: { escritos?: string[] },
): Promise<{ vias: string[]; persistio: boolean; indice: IndiceRespaldos }> {
  const { cuerpos: previosCuerpos } = await leerCuerposDuraderos();
  const recortada = mezclarColecciones(previosCuerpos, {
    savedAt: data.savedAt,
    items: recortarColeccion(data.items.filter((it) => !esHueco(it))),
  });
  recortada.items = recortarColeccion(
    recortada.items.filter((it) => !esHueco(it)),
  );
  recortada.savedAt = data.savedAt || recortada.savedAt;
  memory = recortada;
  const indice = indiceDesdeColeccion(recortada);
  const keep = new Set(recortada.items.map((it) => it.id));
  const aEscribir = new Set(opts?.escritos?.filter((id) => keep.has(id)) ?? []);
  if (!aEscribir.size) {
    for (const it of recortada.items) aEscribir.add(it.id);
  }

  const vias = new Set<string>();
  try {
    escribirRespaldosArchivo(archivoRespaldosLocal(), recortada);
    vias.add("archivo");
  } catch (error) {
    if (!process.env.VERCEL) throw error;
    console.error("respaldos local write failed", error);
  }

  const escritos = await Promise.all(
    recortada.items
      .filter((it) => aEscribir.has(it.id))
      .map((it) => persistirCuerpo(it)),
  );
  const indiceVias = await persistirIndice(indice);
  if (escritos.some((c) => c.blob) || indiceVias.blob) vias.add("blob");
  if (escritos.some((c) => c.kv) || indiceVias.kv) vias.add("kv");
  if (escritos.some((c) => c.github) || indiceVias.github) vias.add("github");
  if (escritos.some((c) => c.archivo)) vias.add("archivo");

  const previos = previosCuerpos.items.map((it) => it.id);
  for (const id of previos) {
    if (!keep.has(id)) await borrarCuerpo(id);
  }

  const duradero = [...vias].some(
    (v) => v === "blob" || v === "kv" || v === "github" || (v === "archivo" && !process.env.VERCEL),
  );
  return { vias: [...vias], persistio: duradero, indice };
}
