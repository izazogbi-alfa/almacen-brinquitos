const PARTICULAS = new Set([
  "a",
  "al",
  "con",
  "de",
  "del",
  "el",
  "en",
  "la",
  "las",
  "los",
  "o",
  "para",
  "por",
  "un",
  "una",
  "unas",
  "unos",
  "u",
  "y",
]);

function hayLetra(texto: string) {
  return /\p{L}/u.test(texto);
}

/** Primera letra mayúscula, resto minúscula. Partículas (de, la, en…) se quedan en minúscula salvo al inicio. */
export function tituloEtiqueta(texto: string): string {
  const partes = texto
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return partes
    .map((palabra, i) => tituloToken(palabra, i === 0))
    .join(" ");
}

function tituloToken(token: string, primera: boolean): string {
  return token
    .split("-")
    .map((trozo, j) => tituloTrozo(trozo, primera && j === 0))
    .join("-");
}

function tituloTrozo(trozo: string, primera: boolean): string {
  if (!trozo) return trozo;
  if (/^\d+$/.test(trozo)) return trozo;
  const lower = trozo.toLocaleLowerCase("es");
  const nucleo = lower.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
  if (!primera && PARTICULAS.has(nucleo)) {
    return lower;
  }
  if (!hayLetra(trozo)) return trozo;
  if (nucleo.length === 1) {
    return aplicarMayusInicial(trozo);
  }
  return aplicarMayusInicial(trozo);
}

function aplicarMayusInicial(trozo: string): string {
  const lower = trozo.toLocaleLowerCase("es");
  const chars = [...lower];
  const i = chars.findIndex((c) => /\p{L}/u.test(c));
  if (i < 0) return lower;
  chars[i] = chars[i].toLocaleUpperCase("es");
  return chars.join("");
}

export function esTodoMayusculas(texto: string): boolean {
  const letras = [...texto].filter((c) => /\p{L}/u.test(c));
  if (letras.length === 0) return false;
  const hayMinus = letras.some((c) => c !== c.toLocaleUpperCase("es"));
  const hayMayus = letras.some((c) => c !== c.toLocaleLowerCase("es"));
  return hayMayus && !hayMinus;
}

/** Tallas: 8 y 10 iguales; 1x → 1X; CHICO → Chico. */
export function tituloTalla(texto: string): string {
  const t = texto.trim();
  if (!t) return t;
  if (/^\d+$/.test(t)) return t;
  const compacto = t.match(/^(\d+)\s*([xX])$/);
  if (compacto) return `${compacto[1]}X`;
  return tituloEtiqueta(t);
}

export function tituloNombreArticulo(nombre: string): string {
  return tituloEtiqueta(nombre);
}

export function nombreArticuloAlGuardar(nombre: string): string {
  const t = nombre.trim();
  if (esTodoMayusculas(t)) return tituloEtiqueta(t);
  return t;
}

function listaUnica(items: unknown, mapFn: (s: string) => string): string[] {
  if (!Array.isArray(items)) return [];
  const visto = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    if (typeof raw !== "string") continue;
    const n = mapFn(raw);
    if (!n) continue;
    const k = n.toLocaleLowerCase("es");
    if (visto.has(k)) continue;
    visto.add(k);
    out.push(n);
  }
  return out;
}

export function listaTitulo(items: unknown): string[] {
  return listaUnica(items, tituloEtiqueta);
}

export function listaTallas(items: unknown): string[] {
  return listaUnica(items, tituloTalla);
}
