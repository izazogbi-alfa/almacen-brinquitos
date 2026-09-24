import {
  coloresDeCaptura,
  tallasDeCaptura,
} from "@/lib/asignacion-articulo";
import { estiloPdfDeArticulo, tallasDeEsquema } from "@/lib/catalogos";
import type { EstiloPdf } from "@/lib/pdf-estilo";
import {
  tituloEtiqueta,
  tituloNombreArticulo,
  tituloTalla,
} from "@/lib/titulo-etiqueta";
import type { Catalogos, Producto } from "@/lib/types";

export type ParTalla = { talla: string; cantidad: number };

export type LineaColorTabla = {
  key: string;
  productoId: string;
  sku: string;
  nombre: string;
  color: string;
  especificacion?: string;
  sucursalId: string;
  sucursalNombre: string;
  pares: ParTalla[];
};

export type FilaColorBloque = {
  keys: string[];
  color: string;
  especificacion?: string;
  porTalla: Record<string, number>;
};

export type BloquePrenda = {
  key: string;
  productoId: string;
  sku: string;
  nombre: string;
  sucursalId: string;
  sucursalNombre: string;
  codigoProveedor?: string;
  estiloPdf?: EstiloPdf;
  tallas: string[];
  filas: FilaColorBloque[];
};

export type CeldaPlana = {
  key?: string;
  productoId?: string;
  sku: string;
  nombre: string;
  color: string;
  especificacion?: string;
  sucursalId?: string;
  sucursalNombre?: string;
  talla: string;
  cantidad: number;
  ordenTallas?: string[];
  ordenColores?: string[];
};

export type ContextoTallas = {
  productos: Producto[];
  catalogos: Catalogos;
};

export function ordenTallasDeProducto(
  producto: Producto | undefined,
  catalogos: Catalogos,
) {
  if (!producto) return [];
  return tallasDeEsquema(catalogos, producto.esquemaConteo);
}

export function ordenColoresDeProducto(
  producto: Producto | undefined,
  catalogos: Catalogos,
) {
  if (!producto) return [];
  return coloresDeCaptura(producto, catalogos);
}

export function tallasPdfDeProducto(
  producto: Producto | undefined,
  catalogos: Catalogos,
) {
  if (!producto) return [];
  const delEsquema = tallasDeCaptura(
    producto,
    catalogos,
    producto.esquemaConteo,
  );
  return delEsquema
    .map((t) => etiquetaTalla(t))
    .filter((t) => t !== "");
}

function claveColor(color: string) {
  return color.toLocaleLowerCase("es");
}

export function conOrdenDeEsquema(
  celdas: CeldaPlana[],
  ctx: ContextoTallas,
): CeldaPlana[] {
  return celdas.map((c) => {
    const prod = ctx.productos.find(
      (p) => p.id === c.productoId || p.sku === c.sku,
    );
    const ordenTallas =
      c.ordenTallas?.length
        ? c.ordenTallas
        : ordenTallasDeProducto(prod, ctx.catalogos);
    const ordenColores =
      c.ordenColores?.length
        ? c.ordenColores
        : ordenColoresDeProducto(prod, ctx.catalogos);
    if (c.ordenTallas?.length && c.ordenColores?.length) return c;
    return {
      ...c,
      ordenTallas,
      ordenColores,
    };
  });
}

function claveBloque(c: {
  productoId?: string;
  sku: string;
  sucursalId?: string;
}) {
  return `${c.productoId || c.sku}::${c.sucursalId || ""}`;
}

function codigoProveedorDe(
  c: Pick<CeldaPlana, "productoId" | "sku">,
  ctx?: ContextoTallas,
) {
  const prod = ctx?.productos.find(
    (p) => p.id === c.productoId || p.sku === c.sku,
  );
  const raw = prod?.codigoProveedor?.trim();
  return raw || undefined;
}

function estiloPdfDeCelda(
  c: Pick<CeldaPlana, "productoId" | "sku">,
  ctx?: ContextoTallas,
): EstiloPdf {
  if (!ctx) return "compacto";
  const prod = ctx.productos.find(
    (p) => p.id === c.productoId || p.sku === c.sku,
  );
  return estiloPdfDeArticulo(prod, ctx.catalogos);
}

function etiquetaTalla(talla: string) {
  return talla ? tituloTalla(talla) : "Cant.";
}

function claveTalla(talla: string) {
  return (talla === "Cant." ? "" : talla).toLocaleLowerCase("es");
}

function tallaTieneCaptura(filas: FilaColorBloque[], talla: string) {
  return filas.some((f) => typeof f.porTalla[talla] === "number");
}

function filaTieneCaptura(fila: FilaColorBloque) {
  return Object.values(fila.porTalla).some((v) => typeof v === "number");
}

/** Tallas con al menos un valor capturado, en orden del esquema de captura. */
export function tallasParaPdf(
  ordenEsquema: string[] | undefined,
  filas: FilaColorBloque[],
  capturadas: string[] = [],
): string[] {
  if (ordenEsquema?.length) {
    const vistas = ordenEsquema
      .map((t) => etiquetaTalla(t))
      .filter((t) => t !== "" && tallaTieneCaptura(filas, t));
    if (vistas.length) return vistas;
  }
  const vistas: string[] = [];
  const seen = new Set<string>();
  for (const t of capturadas) {
    const k = etiquetaTalla(t);
    if (!k || seen.has(k) || !tallaTieneCaptura(filas, k)) continue;
    seen.add(k);
    vistas.push(k);
  }
  if (vistas.length) return vistas;
  return filas.some(filaTieneCaptura) ? [] : ["Cant."];
}

/** @deprecated Usar tallasParaPdf. Conservado para llamadas que solo ordenan capturadas. */
export function ordenarTallasPorEsquema(
  capturadas: string[],
  ordenEsquema: string[] | undefined,
): string[] {
  const vistas: string[] = [];
  const seen = new Set<string>();
  for (const t of capturadas) {
    const k = etiquetaTalla(t);
    if (seen.has(k)) continue;
    seen.add(k);
    vistas.push(k);
  }
  if (!ordenEsquema?.length) return vistas;
  const rank = new Map(
    ordenEsquema.map((t, i) => [claveTalla(t), i] as const),
  );
  return [...vistas].sort((a, b) => {
    const ia = rank.get(claveTalla(a));
    const ib = rank.get(claveTalla(b));
    if (ia == null && ib == null) {
      return vistas.indexOf(a) - vistas.indexOf(b);
    }
    if (ia == null) return 1;
    if (ib == null) return -1;
    return ia - ib;
  });
}

/** Colores con al menos una talla capturada, en orden del esquema de captura. */
export function filasCompletasEsquema(
  filas: FilaColorBloque[],
  ordenColores: string[] | undefined,
): FilaColorBloque[] {
  const conCaptura = filas.filter(filaTieneCaptura);
  if (!ordenColores?.length) return conCaptura;
  const resultado: FilaColorBloque[] = [];
  const usadas = new Set<string>();
  for (const color of ordenColores) {
    const matches = conCaptura.filter(
      (f) => claveColor(f.color) === claveColor(color),
    );
    for (const fila of matches) {
      const k = `${fila.color}::${fila.especificacion ?? ""}`;
      if (usadas.has(k)) continue;
      usadas.add(k);
      resultado.push(fila);
    }
  }
  for (const fila of conCaptura) {
    const k = `${fila.color}::${fila.especificacion ?? ""}`;
    if (!usadas.has(k)) resultado.push(fila);
  }
  return resultado;
}

export function bloquesDesdeCeldas(
  celdas: CeldaPlana[],
  ctx?: ContextoTallas,
): BloquePrenda[] {
  const lista = ctx ? conOrdenDeEsquema(celdas, ctx) : celdas;
  const orden: string[] = [];
  const mapa = new Map<
    string,
    {
      bloque: Omit<BloquePrenda, "tallas" | "filas">;
      tallas: string[];
      ordenEsquema: string[];
      ordenColores: string[];
      filas: Map<string, FilaColorBloque>;
    }
  >();

  for (const c of lista) {
    const bk = claveBloque(c);
    if (!mapa.has(bk)) {
      const prod = ctx?.productos.find(
        (p) => p.id === c.productoId || p.sku === c.sku,
      );
      orden.push(bk);
      mapa.set(bk, {
        bloque: {
          key: bk,
          productoId: c.productoId ?? c.sku,
          sku: c.sku,
          nombre: tituloNombreArticulo(c.nombre),
          sucursalId: c.sucursalId ?? "",
          sucursalNombre: c.sucursalNombre ?? "",
          codigoProveedor: codigoProveedorDe(c, ctx),
          estiloPdf: estiloPdfDeCelda(c, ctx),
        },
        tallas: [],
        ordenEsquema:
          c.ordenTallas?.length
            ? c.ordenTallas
            : ctx
              ? tallasPdfDeProducto(prod, ctx.catalogos)
              : [],
        ordenColores:
          c.ordenColores?.length
            ? c.ordenColores
            : ctx
              ? ordenColoresDeProducto(prod, ctx.catalogos)
              : [],
        filas: new Map(),
      });
    }
    const g = mapa.get(bk)!;
    if (!g.ordenEsquema.length && c.ordenTallas?.length) {
      g.ordenEsquema = c.ordenTallas;
    }
    if (!g.ordenColores.length && c.ordenColores?.length) {
      g.ordenColores = c.ordenColores;
    }
    const talla = etiquetaTalla(c.talla);
    g.tallas.push(talla);
    const fk = `${c.color}::${c.especificacion ?? ""}`;
    const previa = g.filas.get(fk);
    if (!previa) {
      g.filas.set(fk, {
        keys: c.key ? [c.key] : [],
        color: c.color,
        especificacion: c.especificacion,
        porTalla: { [talla]: c.cantidad },
      });
    } else {
      if (c.key && !previa.keys.includes(c.key)) previa.keys.push(c.key);
      previa.porTalla[talla] = c.cantidad;
    }
  }

  return orden.map((k) => {
    const g = mapa.get(k)!;
    const filas = filasCompletasEsquema([...g.filas.values()], g.ordenColores);
    return {
      ...g.bloque,
      tallas: tallasParaPdf(g.ordenEsquema, filas, g.tallas),
      filas,
    };
  });
}

export function bloquesDesdeLineasColor(
  lineas: LineaColorTabla[],
  ctx?: ContextoTallas,
): BloquePrenda[] {
  return bloquesDesdeCeldas(
    lineas.flatMap((ln) =>
      ln.pares.map((p) => ({
        key: ln.key,
        productoId: ln.productoId,
        sku: ln.sku,
        nombre: ln.nombre,
        color: ln.color,
        especificacion: ln.especificacion,
        sucursalId: ln.sucursalId,
        sucursalNombre: ln.sucursalNombre,
        talla: p.talla,
        cantidad: p.cantidad,
      })),
    ),
    ctx,
  );
}

export function etiquetaColor(fila: FilaColorBloque) {
  const color = tituloEtiqueta(fila.color);
  return fila.especificacion
    ? `${color} · ${tituloEtiqueta(fila.especificacion)}`
    : color;
}

export function totalesDeBloque(bloque: BloquePrenda) {
  const porTalla: Record<string, number> = {};
  let piezas = 0;
  for (const t of bloque.tallas) {
    let n = 0;
    for (const fila of bloque.filas) {
      const v = fila.porTalla[t];
      if (typeof v === "number") n += v;
    }
    porTalla[t] = n;
    piezas += n;
  }
  return { porTalla, piezas };
}

export function lineasDesdeCeldasPlanas(
  celdas: CeldaPlana[],
): LineaColorTabla[] {
  const orden: string[] = [];
  const mapa = new Map<string, LineaColorTabla>();
  for (const c of celdas) {
    const k = `${c.productoId || c.sku}::${c.sucursalId || ""}::${c.color}::${c.especificacion ?? ""}`;
    if (!mapa.has(k)) {
      orden.push(k);
      mapa.set(k, {
        key: c.key ?? k,
        productoId: c.productoId ?? c.sku,
        sku: c.sku,
        nombre: c.nombre,
        color: c.color,
        especificacion: c.especificacion,
        sucursalId: c.sucursalId ?? "",
        sucursalNombre: c.sucursalNombre ?? "",
        pares: [],
      });
    }
    const ln = mapa.get(k)!;
    const talla = c.talla || "";
    const i = ln.pares.findIndex((p) => p.talla === talla);
    if (i >= 0) ln.pares[i] = { talla, cantidad: c.cantidad };
    else ln.pares.push({ talla, cantidad: c.cantidad });
  }
  return orden.map((k) => mapa.get(k)!);
}
