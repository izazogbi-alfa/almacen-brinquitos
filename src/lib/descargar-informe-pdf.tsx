"use client";

import { createRoot } from "react-dom/client";
import { domToCanvas } from "modern-screenshot";
import { jsPDF } from "jspdf";
import { InformeRegistro } from "@/components/informe-registro";
import { notasPdfInforme } from "@/lib/pdf-clave";
import {
  encabezadoInforme,
  type EncabezadoInforme,
} from "@/lib/pdf";
import {
  lineasDeRegistro,
  opcionesPdfRegistro,
} from "@/lib/pdf-registro-opciones";
import { incrustarFotosEnBloques } from "@/lib/pdf-foto";
import { parseOrientacionPdf } from "@/lib/pdf-orientacion";
import { bloquesDesdeLineasColor } from "@/lib/tabla-bloques";
import type { BloquePrenda } from "@/lib/tabla-bloques";
import type { SesionCaptura } from "@/lib/sesion-captura";
import type { Catalogos, Producto } from "@/lib/types";

const MARGEN_MM = 8;
const ESCALA = 2;
const PX_POR_MM = 96 / 25.4;

function medidaHoja(orientacion: "vertical" | "horizontal") {
  return orientacion === "vertical"
    ? { ancho: 215.9, alto: 279.4 }
    : { ancho: 279.4, alto: 215.9 };
}

function esLineaDeCorte(canvas: HTMLCanvasElement, y: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx || y < 1 || y >= canvas.height - 1) return false;
  const paso = 6;
  const fila = ctx.getImageData(0, y, canvas.width, 1).data;
  let claros = 0;
  let muestras = 0;
  for (let x = 0; x < canvas.width; x += paso) {
    const i = x * 4;
    const r = fila[i] ?? 0;
    const g = fila[i + 1] ?? 0;
    const b = fila[i + 2] ?? 0;
    if (r > 236 && g > 236 && b > 236) claros += 1;
    muestras += 1;
  }
  return muestras > 0 && claros / muestras > 0.92;
}

function corteEnHueco(
  canvas: HTMLCanvasElement,
  ideal: number,
  minimo: number,
) {
  const retroceso = Math.min(90, ideal - minimo);
  for (let dy = 0; dy <= retroceso; dy += 1) {
    const y = ideal - dy;
    if (y <= minimo) break;
    if (esLineaDeCorte(canvas, y)) return y;
  }
  return ideal;
}

/** Cortes entre filas, en píxeles CSS del informe. */
function marcasDeCorte(host: HTMLElement) {
  const caja = host.getBoundingClientRect();
  const marcas = [
    ...host.querySelectorAll<HTMLElement>("[data-pdf-corte]"),
  ].map((el) => el.getBoundingClientRect().bottom - caja.top);
  return [...new Set(marcas.map((y) => Math.round(y)))]
    .filter((y) => y > 1 && y < caja.height - 1)
    .sort((a, b) => a - b);
}

function corteEntreFilas(
  marcas: number[],
  desde: number,
  ideal: number,
  alto: number,
) {
  if (ideal >= alto - 0.5) return alto;
  const minimo = desde + 24;
  let mejor = -1;
  for (const marca of marcas) {
    if (marca <= minimo) continue;
    if (marca > ideal + 0.5) break;
    mejor = marca;
  }
  return mejor > desde ? mejor : ideal;
}

async function lienzoDelInforme(
  informe: {
    titulo: string;
    empresa?: string;
    sucursal?: string;
    fecha?: string;
    quien?: string;
    notas: string[];
    bloques: BloquePrenda[];
    claveSolo: boolean;
    columnaCodProveedor?: boolean;
  },
) {
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "0";
  host.style.top = "0";
  host.style.zIndex = "-1";
  host.style.width = "max-content";
  host.style.background = "#f8fafc";
  host.style.pointerEvents = "none";
  document.body.appendChild(host);
  const root = createRoot(host);
  root.render(
    <InformeRegistro
      titulo={informe.titulo}
      empresa={informe.empresa}
      sucursal={informe.sucursal}
      fecha={informe.fecha}
      quien={informe.quien}
      notas={informe.notas}
      bloques={informe.bloques}
      claveSolo={informe.claveSolo}
      columnaCodProveedor={informe.columnaCodProveedor}
      completo
    />,
  );
  try {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    if (!host.querySelector("[data-pdf-corte]")) {
      await new Promise<void>((resolve) => setTimeout(resolve, 80));
    }
    if (document.fonts?.ready) await document.fonts.ready;
    const imagenes = [...host.querySelectorAll("img")];
    await Promise.all(
      imagenes.map(
        (img) =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>((resolve) => {
                img.onload = () => resolve();
                img.onerror = () => resolve();
              }),
      ),
    );
    const anchoCss = host.getBoundingClientRect().width;
    const altoCss = host.getBoundingClientRect().height;
    const marcasCss = marcasDeCorte(host);
    const canvas = await domToCanvas(host, {
      scale: ESCALA,
      backgroundColor: "#f8fafc",
      type: "image/png",
    });
    return { canvas, anchoCss, altoCss, marcasCss };
  } finally {
    root.unmount();
    host.remove();
  }
}

/** Archivo PDF con la misma hoja que se ve en Ver PDF. */
export async function descargarInformePdf(opts: {
  archivo: string;
  titulo: string;
  notas: string[];
  bloques: BloquePrenda[];
  encabezado: EncabezadoInforme;
}) {
  const orientacion = parseOrientacionPdf(
    opts.bloques.find((b) => b.orientacionPdf)?.orientacionPdf ??
      opts.encabezado.orientacionPdf,
  );
  const hoja = medidaHoja(orientacion);
  const notas = notasPdfInforme(opts.notas, Boolean(opts.encabezado.claveSolo));
  const conFoto = await incrustarFotosEnBloques(opts.bloques);
  const bloques = conFoto.map((bloque, i) =>
    bloque.foto ? bloque : opts.bloques[i]!,
  );
  const { canvas, anchoCss, altoCss, marcasCss } = await lienzoDelInforme({
    titulo: opts.encabezado.tituloDoc || opts.titulo,
    empresa: opts.encabezado.empresa,
    sucursal: opts.encabezado.sucursal,
    fecha: opts.encabezado.fecha,
    quien: opts.encabezado.quien,
    notas,
    bloques,
    claveSolo: Boolean(opts.encabezado.claveSolo),
    columnaCodProveedor: opts.encabezado.columnaCodProveedor,
  });
  if (canvas.width < 2 || canvas.height < 2 || anchoCss < 2 || altoCss < 2) {
    throw new Error("No se pudo armar el PDF. Inténtalo otra vez.");
  }
  const anchoUtil = hoja.ancho - MARGEN_MM * 2;
  const altoUtil = hoja.alto - MARGEN_MM * 2;
  const anchoMm = anchoCss / PX_POR_MM;
  const escalaHoja = Math.min(1, anchoUtil / anchoMm);
  const anchoDibujo = anchoMm * escalaHoja;
  const altoPaginaCss = Math.max(40, (altoUtil / escalaHoja) * PX_POR_MM);
  const ratio = canvas.height / altoCss;
  const doc = new jsPDF({
    unit: "mm",
    format: "letter",
    orientation: orientacion === "vertical" ? "portrait" : "landscape",
  });
  let yCss = 0;
  let pagina = 0;
  while (yCss < altoCss - 0.5) {
    const ideal = Math.min(altoCss, yCss + altoPaginaCss);
    let finCss = corteEntreFilas(marcasCss, yCss, ideal, altoCss);
    if (finCss <= yCss + 1) {
      const idealPx = Math.min(canvas.height, Math.round(ideal * ratio));
      const desdePx = Math.round(yCss * ratio);
      finCss =
        corteEnHueco(canvas, idealPx, desdePx + 40) / Math.max(ratio, 0.01);
    }
    if (finCss <= yCss + 1) finCss = Math.min(altoCss, yCss + altoPaginaCss);
    if (finCss <= yCss) break;
    const y0 = Math.max(0, Math.round(yCss * ratio));
    const y1 = Math.min(canvas.height, Math.round(finCss * ratio));
    const altoPx = Math.max(1, y1 - y0);
    const recorte = document.createElement("canvas");
    recorte.width = canvas.width;
    recorte.height = altoPx;
    const ctx = recorte.getContext("2d");
    if (!ctx) break;
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, recorte.width, recorte.height);
    ctx.drawImage(canvas, 0, y0, canvas.width, altoPx, 0, 0, canvas.width, altoPx);
    if (pagina > 0) doc.addPage();
    doc.addImage(
      recorte.toDataURL("image/jpeg", 0.92),
      "JPEG",
      MARGEN_MM,
      MARGEN_MM,
      anchoDibujo,
      (altoPx / ratio / PX_POR_MM) * escalaHoja,
    );
    yCss = finCss;
    pagina += 1;
    if (pagina > 40) break;
  }
  doc.save(opts.archivo);
}

/** Descarga el mismo informe que abre Ver PDF en existencias, recepción y pedidos. */
export async function descargarVistaDeRegistro(
  sesion: SesionCaptura,
  ctx: { catalogos: Catalogos; productos: Producto[] },
) {
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
  await descargarInformePdf({
    archivo: opts.archivo,
    titulo: opts.tituloDoc,
    notas: opts.notas,
    bloques,
    encabezado,
  });
}
