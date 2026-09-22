import { blobDisponible } from "@/server/env-remoto";

export const LOGO_PATH = "almacen-brinquitos/logo.jpg";
export const PDF_PREFIX = "almacen-brinquitos/pdfs/";
export const RESPALDOS_DIAS = "almacen-brinquitos/respaldos/dias/";

async function blobMod() {
  return import("@vercel/blob");
}

export function pathnamePdfRegistro(sesionId: string) {
  const seguro = sesionId.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${PDF_PREFIX}${seguro}.pdf`;
}

export async function escribirBlobBytes(
  pathname: string,
  body: Buffer | Uint8Array | string,
  contentType: string,
  access: "public" | "private" = "private",
): Promise<{ ok: boolean; url?: string }> {
  if (!blobDisponible()) return { ok: false };
  try {
    const { put } = await blobMod();
    const bytes =
      typeof body === "string"
        ? body
        : Buffer.isBuffer(body)
          ? body
          : Buffer.from(body);
    const result = await put(pathname, bytes, {
      access,
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType,
    });
    return { ok: true, url: result.url };
  } catch (error) {
    console.error("blob put failed", pathname, error);
    return { ok: false };
  }
}

export async function leerBlobUrl(pathname: string): Promise<string | null> {
  if (!blobDisponible()) return null;
  try {
    const blob = await blobMod();
    const listed = await blob.list({ prefix: pathname, limit: 8 });
    const hit = listed.blobs.find((b) => b.pathname === pathname);
    return hit?.url ?? null;
  } catch (error) {
    console.error("blob list failed", pathname, error);
    return null;
  }
}

export async function borrarBlobPath(pathname: string) {
  if (!blobDisponible()) return;
  try {
    const blob = await blobMod();
    await blob.del(pathname);
  } catch (error) {
    console.error("blob del failed", pathname, error);
  }
}

export async function guardarLogoBlob(
  dataUrl: string,
): Promise<string | null> {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(
    dataUrl.trim(),
  );
  if (!match) return null;
  const mime = match[1];
  const buf = Buffer.from(match[2], "base64");
  const pathname = mime.includes("png")
    ? "almacen-brinquitos/logo.png"
    : LOGO_PATH;
  const { ok, url } = await escribirBlobBytes(pathname, buf, mime, "public");
  return ok && url ? url : null;
}

export async function logoParaPdf(logo?: string): Promise<string | undefined> {
  if (!logo) return undefined;
  if (logo.startsWith("data:image/")) return logo;
  if (!logo.startsWith("http://") && !logo.startsWith("https://")) {
    return undefined;
  }
  try {
    const res = await fetch(logo, { cache: "no-store" });
    if (!res.ok) return undefined;
    const mime = res.headers.get("content-type") || "image/jpeg";
    if (!mime.startsWith("image/")) return undefined;
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch (error) {
    console.error("logo fetch failed", error);
    return undefined;
  }
}

export async function guardarPdfRegistro(
  sesionId: string,
  bytes: Uint8Array,
): Promise<{ ok: boolean; url?: string }> {
  return escribirBlobBytes(
    pathnamePdfRegistro(sesionId),
    bytes,
    "application/pdf",
    "private",
  );
}

export async function urlPdfRegistro(sesionId: string) {
  return leerBlobUrl(pathnamePdfRegistro(sesionId));
}

export async function borrarPdfRegistro(sesionId: string) {
  await borrarBlobPath(pathnamePdfRegistro(sesionId));
}
