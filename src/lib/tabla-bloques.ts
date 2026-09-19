import { tallasDeEsquema } from "@/lib/catalogos";
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

export function conOrdenDeEsquema(
  celdas: CeldaPlana[],
  ctx: ContextoTallas,
): CeldaPlana[] {
  return celdas.map((c) => {
    if (c.ordenTallas?.length) return c;
    const prod = ctx.productos.find(
      (p) => p.id === c.productoId || p.sku === c.sku,
    );
    return {
      ...c,
      ordenTallas: ordenTallasDeProducto(prod, ctx.catalogos),
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

function etiquetaTalla(talla: string) {
  return talla || "Cant.";
}

function claveTalla(talla: string) {
  return (talla === "Cant." ? "" : talla).toLocaleLowerCase("es");
}

/** Columnas = solo tallas capturadas, en el orden del esquema (Configuración). */
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
      filas: Map<string, FilaColorBloque>;
    }
  >();

  for (const c of lista) {
    const bk = claveBloque(c);
    if (!mapa.has(bk)) {
      orden.push(bk);
      mapa.set(bk, {
        bloque: {
          key: bk,
          productoId: c.productoId ?? c.sku,
          sku: c.sku,
          nombre: c.nombre,
          sucursalId: c.sucursalId ?? "",
          sucursalNombre: c.sucursalNombre ?? "",
        },
        tallas: [],
        ordenEsquema: c.ordenTallas ?? [],
        filas: new Map(),
      });
    }
    const g = mapa.get(bk)!;
    if (!g.ordenEsquema.length && c.ordenTallas?.length) {
      g.ordenEsquema = c.ordenTallas;
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
    return {
      ...g.bloque,
      tallas: ordenarTallasPorEsquema(g.tallas, g.ordenEsquema),
      filas: [...g.filas.values()],
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
  return fila.especificacion
    ? `${fila.color} · ${fila.especificacion}`
    : fila.color;
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
