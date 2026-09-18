import { TALLAS_LETRA, TALLAS_NINO, TALLAS_XC1092 } from "@/lib/sucursales";
import { agregarUnicos } from "@/lib/listas";
import type { Catalogos, EsquemaCatalogo, Producto } from "@/lib/types";

/** Solo para detectar la semilla de fábrica; no se asigna a artículos ni se restaura al arrancar. */
export const ESQUEMAS_INICIALES: EsquemaCatalogo[] = [
  {
    id: "nino",
    nombre: "Ropa de niño",
    tallas: [...TALLAS_NINO],
  },
  {
    id: "letra",
    nombre: "Talla de letra",
    tallas: [...TALLAS_LETRA],
  },
  {
    id: "accesorio",
    nombre: "Accesorio",
    tallas: [],
  },
];

const COLORES_INICIALES = [
  "Único",
  "blanco",
  "rosa",
  "azul",
  "rojo",
  "negro",
  "beige",
  "verde",
  "amarillo",
  "gris",
];

function tallasIguales(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  return a.every((t, i) => t === b[i]);
}

export function esEsquemaDeFabrica(esquema: EsquemaCatalogo): boolean {
  const fab = ESQUEMAS_INICIALES.find((e) => e.id === esquema.id);
  if (!fab) return false;
  return fab.nombre === esquema.nombre && tallasIguales(fab.tallas, esquema.tallas);
}

export function catalogosVacios(): Catalogos {
  return {
    esquemas: [],
    colores: [...COLORES_INICIALES],
    tallas: agregarUnicos([...TALLAS_XC1092], [...TALLAS_LETRA]),
    especificaciones: [],
  };
}

export function normalizarCatalogos(raw?: Catalogos | null): Catalogos {
  const base = catalogosVacios();
  if (!raw) return base;
  const esquemas = Array.isArray(raw.esquemas)
    ? raw.esquemas
        .filter((e) => e && typeof e === "object")
        .map((e) => ({
          id: e.id?.trim() || `esq-${Date.now()}`,
          nombre: e.nombre?.trim() || "Esquema",
          tallas: Array.isArray(e.tallas) ? e.tallas.filter(Boolean) : [],
        }))
        .filter((e) => !esEsquemaDeFabrica(e))
    : [];
  return {
    esquemas,
    colores: Array.isArray(raw.colores)
      ? raw.colores.filter(Boolean)
      : base.colores,
    tallas: Array.isArray(raw.tallas)
      ? raw.tallas.filter(Boolean)
      : base.tallas,
    especificaciones: Array.isArray(raw.especificaciones)
      ? raw.especificaciones.filter(Boolean)
      : [],
  };
}

export function esquemaPorId(
  catalogos: Catalogos,
  id?: string | null,
): EsquemaCatalogo | undefined {
  if (!id) return undefined;
  return catalogos.esquemas.find((e) => e.id === id);
}

export function tallasDeEsquema(
  catalogos: Catalogos,
  esquemaId?: string | null,
): string[] {
  const esquema = esquemaPorId(catalogos, esquemaId);
  if (!esquema) return [];
  return esquema.tallas;
}

/** Quita esquema de fábrica y tallas copiadas de esa semilla. Colores se quedan. */
export function sanitizarArticuloSinFabrica(
  producto: Producto,
  catalogos: Catalogos,
): Producto {
  const id = producto.esquemaConteo?.trim();
  if (id && esquemaPorId(catalogos, id)) return producto;
  if (!id && !producto.tallas?.length) return producto;
  return {
    ...producto,
    esquemaConteo: undefined,
    tallas: [],
  };
}
