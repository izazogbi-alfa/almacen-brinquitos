import { sanitizarArticuloSinFabrica } from "@/lib/catalogos";
import { listaTallas, listaTitulo } from "@/lib/titulo-etiqueta";
import type { Catalogos, Producto } from "@/lib/types";

export type AsignacionArticulo = {
  esquemaConteo: string;
  colores: string[];
  tallas: string[];
  especificaciones: string[];
};

export type AsignacionesPersistidas = {
  savedAt: string;
  asignaciones: Record<string, AsignacionArticulo>;
};

export function claveAsignacion(producto: {
  sku?: string;
  id?: string;
}): string {
  const sku = producto.sku?.trim().toUpperCase();
  if (sku) return sku;
  return producto.id?.trim() ?? "";
}

function lista(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim())
    .filter(Boolean);
}

export function parseAsignacion(raw: unknown): AsignacionArticulo | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const compacto = obj.e || obj.esquemaConteo;
  const esquemaConteo =
    typeof compacto === "string" ? compacto.trim() : "";
  if (!esquemaConteo) return null;
  return {
    esquemaConteo,
    colores: listaTitulo(lista(obj.c ?? obj.colores)),
    tallas: listaTallas(lista(obj.t ?? obj.tallas)),
    especificaciones: listaTitulo(lista(obj.s ?? obj.especificaciones)),
  };
}

export function parseAsignacionesPersistidas(
  raw: unknown,
): AsignacionesPersistidas | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as {
    savedAt?: unknown;
    asignaciones?: unknown;
    a?: unknown;
  };
  const mapa =
    obj.asignaciones && typeof obj.asignaciones === "object"
      ? obj.asignaciones
      : obj.a && typeof obj.a === "object"
        ? obj.a
        : null;
  if (!mapa) return null;
  const asignaciones: Record<string, AsignacionArticulo> = {};
  for (const [clave, valor] of Object.entries(
    mapa as Record<string, unknown>,
  )) {
    const parsed = parseAsignacion(valor);
    const id = clave.trim().toUpperCase();
    if (!id || !parsed) continue;
    asignaciones[id] = parsed;
  }
  const savedAt =
    typeof obj.savedAt === "string" && obj.savedAt
      ? obj.savedAt
      : new Date(0).toISOString();
  return { savedAt, asignaciones };
}

export function extraerAsignaciones(
  productos: Producto[],
): Record<string, AsignacionArticulo> {
  const asignaciones: Record<string, AsignacionArticulo> = {};
  for (const producto of productos) {
    const esquema = producto.esquemaConteo?.trim();
    if (!esquema) continue;
    const clave = claveAsignacion(producto);
    if (!clave) continue;
    asignaciones[clave] = {
      esquemaConteo: esquema,
      colores: [...(producto.colores ?? [])],
      tallas: [...(producto.tallas ?? [])],
      especificaciones: [...(producto.especificaciones ?? [])],
    };
  }
  return asignaciones;
}

export function aplicarAsignaciones(
  productos: Producto[],
  asignaciones: Record<string, AsignacionArticulo>,
  catalogos: Catalogos,
): Producto[] {
  return productos.map((producto) => {
    const clave = claveAsignacion(producto);
    const asignada =
      (clave ? asignaciones[clave] : undefined) ??
      (producto.id ? asignaciones[producto.id] : undefined);
    if (!asignada) {
      return sanitizarArticuloSinFabrica(producto, catalogos);
    }
    return sanitizarArticuloSinFabrica(
      {
        ...producto,
        esquemaConteo: asignada.esquemaConteo,
        colores: asignada.colores.length ? asignada.colores : producto.colores,
        tallas: asignada.tallas,
        especificaciones: asignada.especificaciones.length
          ? asignada.especificaciones
          : producto.especificaciones,
      },
      catalogos,
    );
  });
}
