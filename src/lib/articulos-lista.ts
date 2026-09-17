import type { Producto } from "@/lib/types";

export const ARTICULOS_POR_PAGINA = 10;

export type OrdenArticulos = "nombre" | "clave";

export function compararClave(a: string, b: string) {
  return a.localeCompare(b, "es", { numeric: true, sensitivity: "base" });
}

export function filtrarArticulos(productos: Producto[], consulta: string) {
  const t = consulta.trim().toLowerCase();
  if (!t) return productos;
  return productos.filter(
    (p) =>
      p.nombre.toLowerCase().includes(t) || p.sku.toLowerCase().includes(t),
  );
}

export function ordenarArticulos(
  productos: Producto[],
  orden: OrdenArticulos,
) {
  const copia = [...productos];
  if (orden === "nombre") {
    copia.sort((a, b) =>
      a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }),
    );
  } else {
    copia.sort((a, b) => compararClave(a.sku, b.sku));
  }
  return copia;
}

export function paginarArticulos<T>(items: T[], pagina: number, porPagina = ARTICULOS_POR_PAGINA) {
  const totalPaginas = Math.max(1, Math.ceil(items.length / porPagina));
  const paginaSegura = Math.min(Math.max(1, pagina), totalPaginas);
  const inicio = (paginaSegura - 1) * porPagina;
  return {
    pagina: paginaSegura,
    totalPaginas,
    total: items.length,
    items: items.slice(inicio, inicio + porPagina),
  };
}
