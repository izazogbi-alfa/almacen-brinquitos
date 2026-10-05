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

type MedidaBloque = {
  tieneFoto: boolean;
  altoClave: number;
  altoClaveSinFoto: number;
  filas: number[];
  altoCierre: number;
  gapAntes: number;
};

type Trozo = {
  index: number;
  desde: number;
  hasta: number;
  foto: boolean;
  totales: boolean;
};

type PaginaInforme = {
  portada: boolean;
  trozos: Trozo[];
};

function altoTrozo(
  m: MedidaBloque,
  desde: number,
  hasta: number,
  foto: boolean,
  totales: boolean,
) {
  const clave =
    foto && m.tieneFoto
      ? m.altoClave
      : m.tieneFoto
        ? m.altoClaveSinFoto
        : m.altoClave;
  let alto = clave;
  for (let i = desde; i < hasta; i += 1) alto += m.filas[i] ?? 0;
  if (totales) alto += m.altoCierre;
  return alto;
}

/** Cada prenda entra completa. Si no cabe, sigue en la hoja siguiente. */
export function empaquetarBloques(
  medidas: MedidaBloque[],
  opts: {
    preamble: number;
    padTop: number;
    padBottom: number;
    altoPagina: number;
  },
): PaginaInforme[] {
  const paginas: PaginaInforme[] = [];
  let pagina: PaginaInforme = { portada: true, trozos: [] };
  let usado = opts.preamble;

  function cabe(extra: number) {
    return usado + extra + opts.padBottom <= opts.altoPagina + 0.5;
  }

  function cerrar() {
    if (pagina.portada || pagina.trozos.length > 0) paginas.push(pagina);
    pagina = { portada: false, trozos: [] };
    usado = opts.padTop;
  }

  if (medidas.length === 0) {
    paginas.push(pagina);
    return paginas;
  }

  for (let i = 0; i < medidas.length; i += 1) {
    const m = medidas[i]!;
    let desde = 0;
    let totalesListos = false;
    let guard = 0;
    while (!totalesListos && guard < 80) {
      guard += 1;
      const foto = desde === 0 && m.tieneFoto;
      const n = m.filas.length;
      const gap = pagina.trozos.length > 0 ? m.gapAntes || 8 : 0;
      if (n === 0) {
        const solo = altoTrozo(m, 0, 0, foto, true);
        if (!cabe(gap + solo) && pagina.trozos.length > 0) {
          cerrar();
          continue;
        }
        pagina.trozos.push({ index: i, desde: 0, hasta: 0, foto, totales: true });
        usado += gap + solo;
        totalesListos = true;
        break;
      }
      const todo = altoTrozo(m, desde, n, foto, true);
      if (cabe(gap + todo)) {
        pagina.trozos.push({ index: i, desde, hasta: n, foto, totales: true });
        usado += gap + todo;
        totalesListos = true;
        break;
      }
      const cabeEnBlanco =
        todo + opts.padTop + opts.padBottom <= opts.altoPagina + 0.5;
      if (pagina.trozos.length > 0 && cabeEnBlanco) {
        cerrar();
        continue;
      }
      let hasta = desde;
      for (let j = desde; j < n; j += 1) {
        const h = altoTrozo(m, desde, j + 1, foto, false);
        if (cabe(gap + h)) hasta = j + 1;
        else break;
      }
      if (hasta === desde) {
        if (pagina.trozos.length > 0) {
          cerrar();
          continue;
        }
        hasta = Math.min(n, desde + 1);
      }
      const esFin = hasta >= n;
      const conTotales =
        esFin && cabe(gap + altoTrozo(m, desde, hasta, foto, true));
      const h = altoTrozo(m, desde, hasta, foto, conTotales);
      pagina.trozos.push({
        index: i,
        desde,
        hasta,
        foto,
        totales: conTotales,
      });
      usado += gap + h;
      desde = hasta;
      if (conTotales) totalesListos = true;
      else cerrar();
    }
  }
  if (pagina.portada || pagina.trozos.length > 0) paginas.push(pagina);
  return paginas;
}

function medirBloques(host: HTMLElement) {
  const article = host.querySelector("article");
  const estilo = article ? getComputedStyle(article) : null;
  const padTop = estilo ? Number.parseFloat(estilo.paddingTop) || 0 : 0;
  const padBottom = estilo ? Number.parseFloat(estilo.paddingBottom) || 0 : 0;
  const secciones = [...host.querySelectorAll<HTMLElement>("section")];
  const caja = host.getBoundingClientRect();
  const preamble = secciones[0]
    ? secciones[0].getBoundingClientRect().top - caja.top
    : caja.height;
  const bloques: MedidaBloque[] = secciones.map((section, i) => {
    const sb = section.getBoundingClientRect();
    const filasEl = [...section.querySelectorAll<HTMLElement>("[data-pdf-fila]")];
    const primera = filasEl[0]?.getBoundingClientRect();
    const altoClave = primera ? Math.max(0, primera.top - sb.top) : sb.height;
    const barra = section.querySelector<HTMLElement>("[data-pdf-clave]");
    const altoBarra = barra?.getBoundingClientRect().height ?? 0;
    const textos = barra ? [...barra.querySelectorAll("p")] : [];
    const altoTextos = textos.reduce(
      (suma, p) => suma + p.getBoundingClientRect().height,
      0,
    );
    const tieneFoto = Boolean(section.querySelector("img"));
    const altoClaveSinFoto = tieneFoto
      ? Math.max(24, altoTextos + 16 + Math.max(0, altoClave - altoBarra))
      : altoClave;
    const ultima = filasEl[filasEl.length - 1]?.getBoundingClientRect();
    const altoCierre = ultima ? Math.max(0, sb.bottom - ultima.bottom) : 0;
    const anterior = secciones[i - 1];
    const gapAntes = anterior
      ? Math.max(0, sb.top - anterior.getBoundingClientRect().bottom)
      : 0;
    return {
      tieneFoto,
      altoClave,
      altoClaveSinFoto,
      filas: filasEl.map((el) => el.getBoundingClientRect().height),
      altoCierre,
      gapAntes,
    };
  });
  return {
    preamble,
    padTop,
    padBottom,
    bloques,
    anchoCss: caja.width,
    altoCss: caja.height,
  };
}

type DatosInforme = {
  titulo: string;
  empresa?: string;
  sucursal?: string;
  fecha?: string;
  quien?: string;
  notas: string[];
  bloques: BloquePrenda[];
  claveSolo: boolean;
  columnaCodProveedor?: boolean;
  ocultarPortada?: boolean;
  partes?: Trozo[];
  anchoMinMm: number;
};

async function esperarInforme(host: HTMLElement) {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
  if (!host.querySelector("article")) {
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
}

function pintarInforme(root: ReturnType<typeof createRoot>, informe: DatosInforme) {
  const trozos = informe.partes;
  const bloques = trozos
    ? trozos.map((t) => informe.bloques[t.index]!).filter(Boolean)
    : informe.bloques;
  const partes = trozos?.map((t) => ({
    desde: t.desde,
    hasta: t.hasta,
    foto: t.foto,
    totales: t.totales,
  }));
  root.render(
    <InformeRegistro
      titulo={informe.titulo}
      empresa={informe.empresa}
      sucursal={informe.sucursal}
      fecha={informe.fecha}
      quien={informe.quien}
      notas={informe.notas}
      bloques={bloques}
      claveSolo={informe.claveSolo}
      columnaCodProveedor={informe.columnaCodProveedor}
      ocultarPortada={informe.ocultarPortada}
      partes={partes}
      completo
    />,
  );
}

async function conInforme<T>(
  informe: DatosInforme,
  usar: (host: HTMLElement) => Promise<T>,
) {
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "0";
  host.style.top = "0";
  host.style.zIndex = "-1";
  host.style.width = "max-content";
  host.style.minWidth = `${informe.anchoMinMm}mm`;
  host.style.background = "#f8fafc";
  host.style.pointerEvents = "none";
  document.body.appendChild(host);
  const root = createRoot(host);
  pintarInforme(root, informe);
  try {
    await esperarInforme(host);
    return await usar(host);
  } finally {
    root.unmount();
    host.remove();
  }
}

async function canvasDe(informe: DatosInforme) {
  return conInforme(informe, (host) =>
    domToCanvas(host, {
      scale: ESCALA,
      backgroundColor: "#f8fafc",
      type: "image/png",
    }),
  );
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
  const anchoUtil = hoja.ancho - MARGEN_MM * 2;
  const altoUtil = hoja.alto - MARGEN_MM * 2;
  const base: DatosInforme = {
    titulo: opts.encabezado.tituloDoc || opts.titulo,
    empresa: opts.encabezado.empresa,
    sucursal: opts.encabezado.sucursal,
    fecha: opts.encabezado.fecha,
    quien: opts.encabezado.quien,
    notas,
    bloques,
    claveSolo: Boolean(opts.encabezado.claveSolo),
    columnaCodProveedor: opts.encabezado.columnaCodProveedor,
    anchoMinMm: anchoUtil,
  };
  const medidas = await conInforme(base, async (host) => medirBloques(host));
  if (medidas.anchoCss < 2 || medidas.altoCss < 2) {
    throw new Error("No se pudo armar el PDF. Inténtalo otra vez.");
  }
  const anchoMm = medidas.anchoCss / PX_POR_MM;
  const escalaHoja = Math.min(1, anchoUtil / anchoMm);
  const altoPaginaCss = Math.max(80, (altoUtil / escalaHoja) * PX_POR_MM);
  const paginas = empaquetarBloques(medidas.bloques, {
    preamble: medidas.preamble,
    padTop: medidas.padTop,
    padBottom: medidas.padBottom,
    altoPagina: altoPaginaCss,
  }).slice(0, 40);
  const doc = new jsPDF({
    unit: "mm",
    format: "letter",
    orientation: orientacion === "vertical" ? "portrait" : "landscape",
  });
  for (let i = 0; i < paginas.length; i += 1) {
    const pagina = paginas[i]!;
    const canvas = await canvasDe({
      ...base,
      ocultarPortada: !pagina.portada,
      partes: pagina.trozos,
    });
    if (canvas.width < 2 || canvas.height < 2) {
      throw new Error("No se pudo armar el PDF. Inténtalo otra vez.");
    }
    const anchoNatural = canvas.width / ESCALA / PX_POR_MM;
    const altoNatural = canvas.height / ESCALA / PX_POR_MM;
    const escala = Math.min(
      escalaHoja,
      anchoUtil / Math.max(anchoNatural, 1),
      altoUtil / Math.max(altoNatural, 1),
    );
    if (i > 0) doc.addPage();
    doc.addImage(
      canvas.toDataURL("image/jpeg", 0.92),
      "JPEG",
      MARGEN_MM,
      MARGEN_MM,
      anchoNatural * escala,
      altoNatural * escala,
    );
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
