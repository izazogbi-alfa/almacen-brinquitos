import * as XLSX from "xlsx";
import type { Producto } from "@/lib/types";
import { nombreArticuloAlGuardar } from "@/lib/titulo-etiqueta";

export type FilaCatalogo = {
  clave: string;
  nombre: string;
  /** Si falta, no se toca la foto actual. */
  foto?: string;
};

export type DiffCatalogo = {
  actualizar: FilaCatalogo[];
  nuevos: FilaCatalogo[];
  sinCambio: FilaCatalogo[];
  /** Artículos que ya existían y cuya foto sí cambia. */
  fotosCambian: FilaCatalogo[];
  sinClave: number;
  duplicadas: number;
};

const CLAVE = /^(clave|sku|codigo|cod)$/;
const NOMBRE =
  /^(nombre|name|descripcion|producto|articulo)$/;
const FOTO =
  /^(fotos?|urls?|imagenes|imagen|images?|photos?|foto_url|url_foto|fotografias?|link)$/;

function planoEncabezado(raw: unknown) {
  return String(raw ?? "")
    .trim()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export function tipoColumna(raw: unknown): "clave" | "nombre" | "foto" | null {
  const t = planoEncabezado(raw);
  if (!t) return null;
  if (CLAVE.test(t)) return "clave";
  if (NOMBRE.test(t)) return "nombre";
  if (FOTO.test(t)) return "foto";
  return null;
}

const FOTO_DATA_MAX = 120_000;

export function sanitizarFotoCatalogo(raw: unknown): string | undefined {
  if (typeof raw !== "string" && typeof raw !== "number") return undefined;
  const t = String(raw).trim();
  if (!t) return undefined;
  if (/^https?:\/\//i.test(t)) return t.slice(0, 2000);
  if (t.startsWith("/")) return t.slice(0, 400);
  if (t.startsWith("data:image/")) {
    if (t.length > FOTO_DATA_MAX) return undefined;
    return t;
  }
  return undefined;
}

function celdaTexto(raw: unknown) {
  if (raw == null) return "";
  if (typeof raw === "number" && Number.isFinite(raw)) return String(raw);
  return String(raw).trim();
}

type ZipFiles = Record<string, unknown>;

type LibroConArchivos = XLSX.WorkBook & {
  files?: ZipFiles;
  keys?: string[];
};

function bytesDeEntrada(entry: unknown): Uint8Array | null {
  if (!entry) return null;
  if (entry instanceof Uint8Array) return entry;
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(entry)) {
    return new Uint8Array(entry);
  }
  if (typeof entry === "string") {
    return new TextEncoder().encode(entry);
  }
  if (typeof entry !== "object") return null;
  const o = entry as {
    content?: unknown;
    data?: unknown;
    asUint8Array?: () => Uint8Array;
    asNodeBuffer?: () => Buffer;
    _data?: { compressedContent?: Uint8Array; uncompressedContent?: Uint8Array };
  };
  if (typeof o.asUint8Array === "function") return o.asUint8Array();
  if (typeof o.asNodeBuffer === "function") {
    return new Uint8Array(o.asNodeBuffer());
  }
  if (o.content instanceof Uint8Array) return o.content;
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(o.content)) {
    return new Uint8Array(o.content);
  }
  if (typeof o.content === "string") return new TextEncoder().encode(o.content);
  if (o.data instanceof Uint8Array) return o.data;
  if (o._data?.uncompressedContent) return o._data.uncompressedContent;
  return null;
}

function textoDeEntrada(entry: unknown) {
  const bytes = bytesDeEntrada(entry);
  if (!bytes) {
    if (typeof entry === "string") return entry;
    return "";
  }
  return new TextDecoder("utf-8").decode(bytes);
}

function archivoZip(files: ZipFiles | undefined, path: string) {
  if (!files) return undefined;
  const n = path.replace(/^\//, "").replace(/\\/g, "/");
  return (
    files[n] ??
    files[`/${n}`] ??
    Object.entries(files).find(
      ([k]) => k.replace(/\\/g, "/").replace(/^\//, "") === n,
    )?.[1]
  );
}

function mimeDeImagen(path: string) {
  const p = path.toLowerCase();
  if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
  if (p.endsWith(".gif")) return "image/gif";
  if (p.endsWith(".webp")) return "image/webp";
  if (p.endsWith(".bmp")) return "image/bmp";
  return "image/png";
}

function aBase64(bytes: Uint8Array) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

export function parseAnclasDibujo(xml: string): { row: number; embed: string }[] {
  const out: { row: number; embed: string }[] = [];
  const partes = xml.split(/<(?:xdr:)?(?:twoCellAnchor|oneCellAnchor)\b/i);
  for (const chunk of partes.slice(1)) {
    const row = chunk.match(/<(?:xdr:)?row>\s*(\d+)\s*</i);
    const embed = chunk.match(/\br:embed="([^"]+)"/i);
    if (!row || !embed) continue;
    out.push({ row: Number(row[1]), embed: embed[1] });
  }
  return out;
}

export function parseRelsDibujo(xml: string): Record<string, string> {
  const mapa: Record<string, string> = {};
  const re =
    /<Relationship\b[^>]*\bId="([^"]+)"[^>]*\bTarget="([^"]+)"[^>]*\/?>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    mapa[m[1]] = m[2].replace(/\\/g, "/");
  }
  return mapa;
}

/** Fila 0-based de la hoja → data URL. Imágenes flotantes de Excel clásico. */
export function fotosEmpotradasPorFila(wb: XLSX.WorkBook): Map<number, string> {
  const out = new Map<number, string>();
  const files = (wb as LibroConArchivos).files;
  if (!files) return out;
  const keys = Object.keys(files);
  const drawings = keys.filter((k) =>
    /xl\/drawings\/drawing\d+\.xml$/i.test(k.replace(/\\/g, "/")),
  );
  for (const drawPath of drawings) {
    const xml = textoDeEntrada(archivoZip(files, drawPath));
    if (!xml) continue;
    const relPath = drawPath
      .replace(/\\/g, "/")
      .replace(/drawings\/(drawing\d+\.xml)$/i, "drawings/_rels/$1.rels");
    const rels = parseRelsDibujo(textoDeEntrada(archivoZip(files, relPath)));
    for (const ancla of parseAnclasDibujo(xml)) {
      const target = rels[ancla.embed];
      if (!target) continue;
      const mediaPath = target.startsWith("/")
        ? target.slice(1)
        : `xl/media/${target.split("/").pop()}`;
      const bytes = bytesDeEntrada(archivoZip(files, mediaPath));
      if (!bytes || bytes.length < 24) continue;
      const data = `data:${mimeDeImagen(mediaPath)};base64,${aBase64(bytes)}`;
      if (!sanitizarFotoCatalogo(data) && data.length > FOTO_DATA_MAX) {
        continue;
      }
      const foto = sanitizarFotoCatalogo(data) ?? (data.length <= FOTO_DATA_MAX ? data : undefined);
      if (!foto) continue;
      if (!out.has(ancla.row)) out.set(ancla.row, foto);
    }
  }
  return out;
}

export function matrizDesdeLibro(
  datos: ArrayBuffer | Uint8Array | string,
  nombreArchivo = "",
): { matriz: unknown[][]; fotosFila: Map<number, string> } {
  try {
    const opts = { type: "array" as const, raw: false, bookFiles: true };
    const wb =
      typeof datos === "string"
        ? XLSX.read(datos, { type: "string", raw: false, bookFiles: true })
        : XLSX.read(datos, opts);
    const hoja = wb.Sheets[wb.SheetNames[0] ?? ""];
    if (!hoja) throw new Error("sin hoja");
    const matriz = XLSX.utils.sheet_to_json(hoja, {
      header: 1,
      defval: "",
      blankrows: true,
    }) as unknown[][];
    const fotosFila = /\.csv$/i.test(nombreArchivo)
      ? new Map<number, string>()
      : fotosEmpotradasPorFila(wb);
    return { matriz, fotosFila };
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("No se pudo")) throw err;
    throw new Error("No se pudo leer el archivo. Prueba .xlsx o .csv.");
  }
}

export function parseTablaCatalogo(
  matriz: unknown[][],
  fotosFila?: Map<number, string>,
): {
  filas: FilaCatalogo[];
  error?: string;
  sinClave: number;
  duplicadas: number;
  tieneColumnaFoto: boolean;
} {
  if (!Array.isArray(matriz) || matriz.length === 0) {
    return {
      filas: [],
      error: "Ese archivo está vacío.",
      sinClave: 0,
      duplicadas: 0,
      tieneColumnaFoto: false,
    };
  }
  let headerIdx = -1;
  let mapa: { clave: number; nombre: number; foto?: number } | null = null;
  for (let i = 0; i < Math.min(matriz.length, 20); i++) {
    const row = matriz[i] ?? [];
    let clave = -1;
    let nombre = -1;
    let foto = -1;
    row.forEach((cell, idx) => {
      const tipo = tipoColumna(cell);
      if (tipo === "clave" && clave < 0) clave = idx;
      if (tipo === "nombre" && nombre < 0) nombre = idx;
      if (tipo === "foto" && foto < 0) foto = idx;
    });
    if (clave >= 0 && nombre >= 0) {
      headerIdx = i;
      mapa = { clave, nombre, foto: foto >= 0 ? foto : undefined };
      break;
    }
  }
  if (!mapa || headerIdx < 0) {
    return {
      filas: [],
      error:
        "Este archivo no trae Clave y Nombre. Pon esos títulos en la primera fila.",
      sinClave: 0,
      duplicadas: 0,
      tieneColumnaFoto: false,
    };
  }

  const porClave = new Map<string, FilaCatalogo>();
  let sinClave = 0;
  let duplicadas = 0;
  for (let i = headerIdx + 1; i < matriz.length; i++) {
    const row = matriz[i] ?? [];
    const clave = celdaTexto(row[mapa.clave]);
    const nombre = celdaTexto(row[mapa.nombre]);
    if (!clave && !nombre) continue;
    if (!clave || !nombre) {
      sinClave += 1;
      continue;
    }
    const id = clave.toUpperCase();
    if (porClave.has(id)) duplicadas += 1;
    const deCelda =
      mapa.foto != null ? sanitizarFotoCatalogo(row[mapa.foto]) : undefined;
    const empotrada = fotosFila?.get(i);
    const foto = deCelda || empotrada;
    porClave.set(id, {
      clave,
      nombre,
      ...(foto ? { foto } : {}),
    });
  }

  const filas = [...porClave.values()];
  if (filas.length === 0) {
    return {
      filas: [],
      error:
        sinClave > 0
          ? "Hay filas, pero ninguna trae Clave y Nombre juntos."
          : "No hay artículos en el archivo.",
      sinClave,
      duplicadas,
      tieneColumnaFoto: mapa.foto != null,
    };
  }
  return {
    filas,
    sinClave,
    duplicadas,
    tieneColumnaFoto: mapa.foto != null,
  };
}

function mismoTexto(a: string, b: string) {
  return a.trim() === b.trim();
}

export function diffCatalogo(
  productos: Pick<Producto, "sku" | "nombre" | "foto">[],
  filas: FilaCatalogo[],
): DiffCatalogo {
  const actuales = new Map(
    productos.map((p) => [p.sku.trim().toUpperCase(), p] as const),
  );
  const actualizar: FilaCatalogo[] = [];
  const nuevos: FilaCatalogo[] = [];
  const sinCambio: FilaCatalogo[] = [];
  const fotosCambian: FilaCatalogo[] = [];
  for (const fila of filas) {
    const prev = actuales.get(fila.clave.trim().toUpperCase());
    if (!prev) {
      nuevos.push(fila);
      continue;
    }
    const nombreCambia = !mismoTexto(prev.nombre, fila.nombre);
    const fotoCambia = Boolean(fila.foto) && fila.foto !== (prev.foto ?? "");
    if (fotoCambia) fotosCambian.push(fila);
    if (nombreCambia || fotoCambia) actualizar.push(fila);
    else sinCambio.push(fila);
  }
  return {
    actualizar,
    nuevos,
    sinCambio,
    fotosCambian,
    sinClave: 0,
    duplicadas: 0,
  };
}

export function idNuevoArticulo(clave: string, ocupados: Set<string>) {
  let id = `p-${clave.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
  if (ocupados.has(id)) id = `${id}-${Date.now()}`;
  ocupados.add(id);
  return id;
}

/** Actualiza nombre/foto o agrega. Nunca borra ni toca existencias ni esquemas. */
export function aplicarFilasCatalogo(
  productos: Producto[],
  filas: FilaCatalogo[],
): Producto[] {
  const next: Producto[] = productos.map((p) => ({ ...p }));
  const idx = new Map(
    next.map((p, i) => [p.sku.trim().toUpperCase(), i] as const),
  );
  const ids = new Set(next.map((p) => p.id));
  for (const fila of filas) {
    const claveNorm = fila.clave.trim().toUpperCase();
    const i = idx.get(claveNorm);
    if (i == null) {
      const creado: Producto = {
        id: idNuevoArticulo(fila.clave.trim(), ids),
        sku: fila.clave.trim(),
        nombre: nombreArticuloAlGuardar(fila.nombre),
        categoria: "",
        unidad: "pza",
        existencia: 0,
        minimo: 0,
        ubicacion: "",
        colores: [],
        existenciasSucursal: [],
        ...(fila.foto ? { foto: fila.foto } : {}),
      };
      idx.set(claveNorm, next.length);
      next.push(creado);
      continue;
    }
    const prev = next[i];
    next[i] = {
      ...prev,
      nombre: fila.nombre.trim()
        ? nombreArticuloAlGuardar(fila.nombre)
        : prev.nombre,
      foto: fila.foto ? fila.foto : prev.foto,
    };
  }
  return next;
}
