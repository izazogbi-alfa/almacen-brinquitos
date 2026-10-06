import { sanitizarFotoCatalogo } from "@/lib/actualizar-catalogo";

export const MAX_FOTOS_EXTRA = 6;

const MENSAJE_IMAGEN_PESADA =
  "Esa imagen no se pudo guardar. Elige una foto más chica.";

export function sanitizarFotosArticulo(raw: unknown, principal?: string) {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const vista = new Set<string>();
  if (principal) vista.add(principal);
  for (const item of raw) {
    const foto = sanitizarFotoCatalogo(item);
    if (!foto || vista.has(foto)) continue;
    vista.add(foto);
    out.push(foto);
    if (out.length >= MAX_FOTOS_EXTRA) break;
  }
  return out;
}

/** Arma foto principal y extras. Lanza si llegó una imagen que no se puede guardar. */
export function imagenesDeFicha(body: { foto?: unknown; fotos?: unknown }) {
  const cruda = typeof body.foto === "string" ? body.foto.trim() : "";
  let foto: string | undefined;
  if (cruda) {
    foto = sanitizarFotoCatalogo(cruda);
    if (!foto) throw new Error(MENSAJE_IMAGEN_PESADA);
  }
  const fotos = sanitizarFotosArticulo(body.fotos, foto);
  const pedidas = Array.isArray(body.fotos) ? body.fotos.length : 0;
  if (pedidas > 0 && fotos.length === 0 && !foto) {
    const alguna = body.fotos;
    if (Array.isArray(alguna) && alguna.some((item) => typeof item === "string" && item.trim())) {
      throw new Error(MENSAJE_IMAGEN_PESADA);
    }
  }
  return { foto, fotos };
}

/** Baja la foto del teléfono a un JPEG que cabe en la ficha. */
export async function comprimirImagenArchivo(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Elige una imagen.");
  }
  const bitmap = await createImageBitmap(file);
  try {
    const maxLado = 900;
    const escala = Math.min(1, maxLado / Math.max(bitmap.width, bitmap.height));
    const ancho = Math.max(1, Math.round(bitmap.width * escala));
    const alto = Math.max(1, Math.round(bitmap.height * escala));
    const canvas = document.createElement("canvas");
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo leer la imagen.");
    ctx.drawImage(bitmap, 0, 0, ancho, alto);
    let calidad = 0.72;
    let data = canvas.toDataURL("image/jpeg", calidad);
    while (data.length > 110_000 && calidad > 0.4) {
      calidad -= 0.08;
      data = canvas.toDataURL("image/jpeg", calidad);
    }
    if (!sanitizarFotoCatalogo(data)) {
      throw new Error(MENSAJE_IMAGEN_PESADA);
    }
    return data;
  } finally {
    bitmap.close();
  }
}
