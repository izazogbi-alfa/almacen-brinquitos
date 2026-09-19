import { esquemaPorId } from "@/lib/catalogos";
import type { Catalogos, Producto } from "@/lib/types";

export function esquemaDeArticulo(producto: Producto, catalogos: Catalogos) {
  return esquemaPorId(catalogos, producto.esquemaConteo);
}

export function esquemaIdDeSeleccion(
  elegidos: Producto[],
  catalogos: Catalogos,
) {
  for (const p of elegidos) {
    const esq = esquemaDeArticulo(p, catalogos);
    if (esq) return esq.id;
  }
  return undefined;
}

/** Texto corto para Iza: por qué no puede marcar este artículo junto a los demás. */
export function motivoNoSePuedeElegir(
  producto: Producto,
  esquemaIdBloqueado: string | undefined,
  catalogos: Catalogos,
): string | null {
  const esq = esquemaDeArticulo(producto, catalogos);
  if (!esq) {
    return `${producto.sku} ${producto.nombre} no tiene esquema. En Artículos abre la ficha y pulsa Agregar esquemas. No se usa un esquema de fábrica.`;
  }
  if (esquemaIdBloqueado && esq.id !== esquemaIdBloqueado) {
    const bloqueado = esquemaPorId(catalogos, esquemaIdBloqueado);
    const nombre = bloqueado?.nombre ?? "el que ya marcaste";
    return `Ese artículo se cuenta distinto. Ya elegiste «${nombre}». Marca solo prendas del mismo esquema (mismas tallas, ej. 1, 1X, 2–18, 34–42, 44–50).`;
  }
  return null;
}

export function articulosDelMismoEsquema(
  articulos: Producto[],
  esquemaId: string | undefined,
  catalogos: Catalogos,
) {
  if (!esquemaId) return [];
  return articulos.filter((p) => esquemaDeArticulo(p, catalogos)?.id === esquemaId);
}

export function notasPdfSeleccion(
  elegidos: Producto[],
  catalogos: Catalogos,
): string[] {
  if (elegidos.length === 0) return [];
  const esq = esquemaDeArticulo(elegidos[0], catalogos);
  const lista = elegidos.map((p) => `${p.sku} ${p.nombre}`).join(" · ");
  const tallas = esq?.tallas?.length
    ? `Tallas del esquema: ${esq.tallas.join(", ")}`
    : "Este esquema no usa talla.";
  return [
    `Artículos en este PDF (${elegidos.length}): ${lista}`,
    esq ? `Esquema: ${esq.nombre}. ${tallas}` : "Sin esquema.",
  ];
}
