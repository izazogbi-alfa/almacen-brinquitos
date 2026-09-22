import { registroTieneLineas } from "@/lib/pdf-registro-opciones";
import { construirPdfDeRegistro } from "@/lib/pdf-registro";
import type { SesionCaptura } from "@/lib/sesion-captura";
import { logoParaPdf, guardarPdfRegistro, borrarPdfRegistro } from "@/server/blob-media";
import { blobDisponible } from "@/server/env-remoto";
import { readStore } from "@/server/store";

export async function persistirPdfRegistro(sesion: SesionCaptura | null | undefined) {
  if (!sesion?.cerradaEn || sesion.pendiente) return;
  if (!registroTieneLineas(sesion)) return;
  if (!blobDisponible()) return;
  const store = readStore();
  const logoDataUrl = await logoParaPdf(store.catalogos.logoDataUrl);
  try {
    const doc = construirPdfDeRegistro(sesion, {
      catalogos: { ...store.catalogos, logoDataUrl },
      productos: store.productos,
    });
    const bytes = new Uint8Array(doc.output("arraybuffer"));
    await guardarPdfRegistro(sesion.id, bytes);
  } catch (error) {
    console.error("pdf registro blob failed", error);
  }
}

export async function quitarPdfRegistro(sesionId: string) {
  await borrarPdfRegistro(sesionId);
}
