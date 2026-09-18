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
};

function claveBloque(c: {
  productoId?: string;
  sku: string;
  sucursalId?: string;
}) {
  return `${c.productoId || c.sku}::${c.sucursalId || ""}`;
}

function ordenTallas(tallas: string[]) {
  const vistas = new Set<string>();
  const out: string[] = [];
  for (const t of tallas) {
    const k = t || "Cant.";
    if (vistas.has(k)) continue;
    vistas.add(k);
    out.push(k);
  }
  return out;
}

export function bloquesDesdeCeldas(celdas: CeldaPlana[]): BloquePrenda[] {
  const orden: string[] = [];
  const mapa = new Map<
    string,
    {
      bloque: Omit<BloquePrenda, "tallas" | "filas">;
      tallas: string[];
      filas: Map<string, FilaColorBloque>;
    }
  >();

  for (const c of celdas) {
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
        filas: new Map(),
      });
    }
    const g = mapa.get(bk)!;
    const talla = c.talla || "Cant.";
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
      tallas: ordenTallas(g.tallas),
      filas: [...g.filas.values()],
    };
  });
}

export function bloquesDesdeLineasColor(
  lineas: LineaColorTabla[],
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
  );
}

export function etiquetaColor(fila: FilaColorBloque) {
  return fila.especificacion
    ? `${fila.color} · ${fila.especificacion}`
    : fila.color;
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
