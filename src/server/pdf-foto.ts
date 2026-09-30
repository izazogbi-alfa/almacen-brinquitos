import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { incrustarFotosEnBloques } from "@/lib/pdf-foto";
import type { BloquePrenda } from "@/lib/tabla-bloques";

function mimeDeRuta(src: string, aviso?: string | null) {
  const tipo = aviso?.split(";")[0]?.trim();
  if (tipo?.startsWith("image/")) return tipo;
  if (/\.png($|\?)/i.test(src)) return "image/png";
  if (/\.webp($|\?)/i.test(src)) return "image/webp";
  return "image/jpeg";
}

async function leerFoto(src: string): Promise<string | null> {
  if (src.startsWith("data:image/")) return src;
  if (src.startsWith("https://") || src.startsWith("http://")) {
    const res = await fetch(src);
    if (!res.ok) return null;
    const mime = mimeDeRuta(src, res.headers.get("content-type"));
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0) return null;
    return `data:${mime};base64,${buf.toString("base64")}`;
  }
  if (!src.startsWith("/") || src.includes("..")) return null;
  const archivo = join(process.cwd(), "public", src.slice(1));
  const buf = await readFile(archivo);
  return `data:${mimeDeRuta(src)};base64,${buf.toString("base64")}`;
}

export function incrustarFotosArchivo(bloques: BloquePrenda[]) {
  return incrustarFotosEnBloques(bloques, leerFoto);
}
