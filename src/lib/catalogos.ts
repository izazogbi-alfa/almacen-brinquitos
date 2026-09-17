import { TALLAS_LETRA, TALLAS_NINO, TALLAS_XC1092 } from "@/lib/sucursales";
import { agregarUnicos } from "@/lib/listas";
import type { Catalogos, EsquemaCatalogo } from "@/lib/types";

export const ESQUEMAS_INICIALES: EsquemaCatalogo[] = [
  {
    id: "nino",
    nombre: "Ropa de niño",
    detalle: "Plantilla 0, 2, 4 … 60.",
    tallas: [...TALLAS_NINO],
  },
  {
    id: "letra",
    nombre: "Talla de letra",
    detalle: "EXCHICO, CHICO, MEDIANO, GRANDE, EXGRANDE, ADULTO.",
    tallas: [...TALLAS_LETRA],
  },
  {
    id: "accesorio",
    nombre: "Accesorio",
    detalle: "Se cuenta sin talla.",
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

export function catalogosVacios(): Catalogos {
  return {
    esquemas: ESQUEMAS_INICIALES.map((e) => ({ ...e, tallas: [...e.tallas] })),
    colores: [...COLORES_INICIALES],
    tallas: agregarUnicos([...TALLAS_XC1092], [...TALLAS_LETRA]),
    especificaciones: [],
  };
}

export function normalizarCatalogos(raw?: Catalogos | null): Catalogos {
  const base = catalogosVacios();
  if (!raw) return base;
  const esquemas =
    raw.esquemas?.length > 0
      ? raw.esquemas.map((e) => ({
          id: e.id?.trim() || `esq-${Date.now()}`,
          nombre: e.nombre?.trim() || "Esquema",
          detalle: e.detalle?.trim() || "",
          tallas: Array.isArray(e.tallas) ? e.tallas.filter(Boolean) : [],
        }))
      : base.esquemas;
  return {
    esquemas,
    colores: raw.colores?.length ? raw.colores.filter(Boolean) : base.colores,
    tallas: raw.tallas?.length ? raw.tallas.filter(Boolean) : base.tallas,
    especificaciones: Array.isArray(raw.especificaciones)
      ? raw.especificaciones.filter(Boolean)
      : [],
  };
}

export function esquemaPorId(
  catalogos: Catalogos,
  id?: string | null,
): EsquemaCatalogo | undefined {
  if (!id) return catalogos.esquemas[0];
  return (
    catalogos.esquemas.find((e) => e.id === id) ?? catalogos.esquemas[0]
  );
}

export function tallasDeEsquema(
  catalogos: Catalogos,
  esquemaId?: string | null,
): string[] {
  const esquema = esquemaPorId(catalogos, esquemaId);
  if (!esquema) return catalogos.tallas;
  if (esquema.tallas.length > 0) return esquema.tallas;
  return [];
}
