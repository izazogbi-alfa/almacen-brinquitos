import {
  blobPdfBloques,
  construirPdfBloques,
  descargarPdfBloques,
  encabezadoInforme,
} from "./pdf";
import {
  lineasDeRegistro,
  MENSAJE_REGISTRO_SIN_LINEAS,
  opcionesPdfRegistro,
  registroTieneLineas,
} from "./pdf-registro-opciones";
import type { SesionCaptura } from "./sesion-captura";
import { bloquesDesdeLineasColor } from "./tabla-bloques";
import type { Catalogos, Producto } from "./types";

export {
  archivoPdfRegistro,
  lineasDeRegistro,
  mensajeRegistroSinLineas,
  notasPdfRegistro,
  opcionesPdfRegistro,
  registroTieneLineas,
  tituloDocRegistro,
} from "./pdf-registro-opciones";

function armar(
  sesion: SesionCaptura,
  ctx: { catalogos: Catalogos; productos: Producto[] },
) {
  if (!registroTieneLineas(sesion)) {
    throw new Error(MENSAJE_REGISTRO_SIN_LINEAS);
  }
  const opts = opcionesPdfRegistro(sesion);
  const bloques = bloquesDesdeLineasColor(lineasDeRegistro(sesion), ctx);
  const encabezado = encabezadoInforme(ctx.catalogos, {
    tituloDoc: opts.tituloDoc,
    sucursal: opts.sucursal,
    fecha: opts.fecha,
    quien: opts.quien,
    claveSolo: opts.claveSolo,
    columnaCodProveedor: sesion.modulo === "pedidos",
  });
  return { opts, bloques, encabezado };
}

export function construirPdfDeRegistro(
  sesion: SesionCaptura,
  ctx: { catalogos: Catalogos; productos: Producto[] },
) {
  const { opts, bloques, encabezado } = armar(sesion, ctx);
  return construirPdfBloques(opts.tituloDoc, opts.notas, bloques, encabezado);
}

export function descargarPdfDeRegistro(
  sesion: SesionCaptura,
  ctx: { catalogos: Catalogos; productos: Producto[] },
) {
  const { opts, bloques, encabezado } = armar(sesion, ctx);
  descargarPdfBloques(
    opts.archivo,
    opts.tituloDoc,
    opts.notas,
    bloques,
    encabezado,
  );
}

export function blobPdfDeRegistro(
  sesion: SesionCaptura,
  ctx: { catalogos: Catalogos; productos: Producto[] },
) {
  const { opts, bloques, encabezado } = armar(sesion, ctx);
  return blobPdfBloques(opts.tituloDoc, opts.notas, bloques, encabezado);
}
