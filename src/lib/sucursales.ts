import type { Producto, Sucursal } from "@/lib/types";

export const SUCURSALES: Sucursal[] = [
  { id: "s-gloria", nombre: "La Gloria" },
  { id: "s-modelo", nombre: "El Modelo" },
  { id: "s-angel", nombre: "El Ángel" },
];

export const TALLAS_NINO = Array.from({ length: 31 }, (_, i) => String(i * 2));

export const TALLAS_LETRA = [
  "EXCHICO",
  "CHICO",
  "MEDIANO",
  "GRANDE",
  "EXGRANDE",
  "ADULTO",
] as const;

export function sucursalPorId(id: string) {
  return SUCURSALES.find((s) => s.id === id);
}

export function esquemaDe(producto: Producto) {
  return producto.esquemaConteo ?? "accesorio";
}

export function tallasProducto(producto: Producto): string[] {
  if (producto.tallas?.length) return producto.tallas;
  const esquema = esquemaDe(producto);
  if (esquema === "nino") return [...TALLAS_NINO];
  if (esquema === "letra") return [...TALLAS_LETRA];
  return [];
}

export function coloresProducto(producto: Producto): string[] {
  if (producto.colores?.length) return producto.colores;
  return ["Único"];
}

export function usaTalla(producto: Producto) {
  return esquemaDe(producto) !== "accesorio" && tallasProducto(producto).length > 0;
}

export function claveCelda(sucursalId: string, talla: string, color: string) {
  return `${sucursalId}::${talla}::${color}`;
}

export function cantidadEn(
  producto: Producto,
  sucursalId: string,
  talla: string,
  color: string,
) {
  return (
    producto.existenciasSucursal?.find(
      (c) =>
        c.sucursalId === sucursalId && c.talla === talla && c.color === color,
    )?.cantidad ?? 0
  );
}

export function totalProducto(producto: Producto) {
  if (producto.existenciasSucursal?.length) {
    return producto.existenciasSucursal.reduce((acc, c) => acc + c.cantidad, 0);
  }
  if (producto.variantes?.length) {
    return producto.variantes.reduce((acc, v) => acc + v.existencia, 0);
  }
  return producto.existencia;
}

export function totalEnSucursal(producto: Producto, sucursalId: string) {
  return (producto.existenciasSucursal ?? [])
    .filter((c) => c.sucursalId === sucursalId)
    .reduce((acc, c) => acc + c.cantidad, 0);
}

export function totalesPorSucursal(producto: Producto) {
  return SUCURSALES.map((s) => ({
    ...s,
    cantidad: totalEnSucursal(producto, s.id),
  }));
}

export function sincronizarTotalProducto(producto: Producto) {
  producto.existencia = totalProducto(producto);
}

export function fijarConteo(
  producto: Producto,
  sucursalId: string,
  talla: string,
  color: string,
  cantidad: number,
) {
  if (!producto.existenciasSucursal) producto.existenciasSucursal = [];
  const i = producto.existenciasSucursal.findIndex(
    (c) =>
      c.sucursalId === sucursalId && c.talla === talla && c.color === color,
  );
  if (i >= 0) {
    producto.existenciasSucursal[i].cantidad = cantidad;
  } else {
    producto.existenciasSucursal.push({ sucursalId, talla, color, cantidad });
  }
  sincronizarTotalProducto(producto);
}

export function ajustarCantidad(
  producto: Producto,
  sucursalId: string,
  talla: string,
  color: string,
  delta: number,
) {
  const antes = cantidadEn(producto, sucursalId, talla, color);
  const despues = antes + delta;
  if (despues < 0) {
    throw new Error(
      `Solo hay ${antes} pzas en esa sucursal / talla / color.`,
    );
  }
  fijarConteo(producto, sucursalId, talla, color, despues);
  return { antes, despues };
}
