import { registroTieneLineas } from "@/lib/pdf-registro-opciones";
import { construirPdfBloques } from "@/lib/pdf";
import { datosPdfDeRegistro } from "@/lib/pdf-registro";
import { incrustarFotosArchivo } from "@/server/pdf-foto";
import type { SesionCaptura } from "@/lib/sesion-captura";
import type { Catalogos, Producto } from "@/lib/types";

export async function documentoPdfDeRegistro(
  sesion: SesionCaptura,
  ctx: { catalogos: Catalogos; productos: Producto[] },
) {
  const { opts, bloques, encabezado } = datosPdfDeRegistro(sesion, ctx);
  const listos = await incrustarFotosArchivo(bloques);
  return construirPdfBloques(opts.tituloDoc, opts.notas, listos, encabezado);
}
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
    const doc = await documentoPdfDeRegistro(sesion, {
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
