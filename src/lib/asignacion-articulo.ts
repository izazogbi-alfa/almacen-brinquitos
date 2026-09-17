import { esquemaPorId, tallasDeEsquema } from "@/lib/catalogos";
import { agregarUnicos } from "@/lib/listas";
import type { Catalogos, Producto } from "@/lib/types";

function claveEs(valor: string) {
  return valor.toLocaleLowerCase("es");
}

export function estaElegido(items: string[], valor: string) {
  const clave = claveEs(valor);
  return items.some((x) => claveEs(x) === clave);
}

/** Deja solo valores que existen en el catálogo (mismo texto, orden del catálogo). */
export function filtrarEnCatalogo(catalogo: string[], elegidos: unknown): string[] {
  if (!Array.isArray(elegidos)) return [];
  const pedidos = new Set(
    elegidos
      .filter((x): x is string => typeof x === "string")
      .map((x) => claveEs(x.trim()))
      .filter(Boolean),
  );
  return catalogo.filter((item) => pedidos.has(claveEs(item)));
}

export function opcionesTallaArticulo(
  catalogos: Catalogos,
  esquemaId?: string | null,
): string[] {
  const delEsquema = tallasDeEsquema(catalogos, esquemaId);
  return agregarUnicos(delEsquema, catalogos.tallas);
}

export function alternarDeCatalogo(
  catalogo: string[],
  elegidos: string[],
  valor: string,
): string[] {
  const siguiente = estaElegido(elegidos, valor)
    ? elegidos.filter((x) => claveEs(x) !== claveEs(valor))
    : [...elegidos, valor];
  return filtrarEnCatalogo(catalogo, siguiente);
}

export function coloresDeCaptura(producto: Producto, catalogos: Catalogos) {
  if (producto.colores?.length) return producto.colores;
  return catalogos.colores.length ? catalogos.colores : ["Único"];
}

export function tallasDeCaptura(
  producto: Producto,
  catalogos: Catalogos,
  esquemaId?: string | null,
) {
  const id = esquemaId || producto.esquemaConteo;
  if (
    producto.tallas?.length &&
    (!esquemaId || esquemaId === producto.esquemaConteo)
  ) {
    return producto.tallas;
  }
  return tallasDeEsquema(catalogos, id);
}

export function especificacionesDeCaptura(
  producto: Producto,
  catalogos: Catalogos,
) {
  if (producto.especificaciones?.length) return producto.especificaciones;
  return catalogos.especificaciones;
}

export function textoLista(items: string[], vacio: string) {
  if (items.length === 0) return vacio;
  return items.join(" · ");
}

export function resumenConteo(
  catalogos: Catalogos,
  esquemaId: string,
  colores: string[],
  tallas: string[],
  especificaciones: string[],
) {
  const esquema = esquemaPorId(catalogos, esquemaId);
  const tallasEsquema = esquema?.tallas?.length ? esquema.tallas : [];
  const tallasVista = tallas.length > 0 ? tallas : tallasEsquema;
  return {
    esquemaNombre: esquema?.nombre ?? "Sin esquema",
    esquemaDetalle: esquema?.detalle?.trim() || "",
    sinTalla: tallasVista.length === 0,
    colores,
    tallas: tallasVista,
    especificaciones,
  };
}
