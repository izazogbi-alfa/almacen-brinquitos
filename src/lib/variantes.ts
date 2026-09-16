import type { Producto, Variante } from "@/lib/types";

export function tieneVariantes(producto: Producto) {
  return (producto.variantes?.length ?? 0) > 0;
}

export function existenciaTotal(producto: Producto) {
  if (producto.existenciasSucursal?.length) {
    return producto.existenciasSucursal.reduce((acc, v) => acc + v.cantidad, 0);
  }
  if (!tieneVariantes(producto)) return producto.existencia;
  return producto.variantes!.reduce((acc, v) => acc + v.existencia, 0);
}

export function tallasDe(producto: Producto) {
  return [...new Set((producto.variantes ?? []).map((v) => v.talla))];
}

export function coloresDe(producto: Producto, talla?: string) {
  return [
    ...new Set(
      (producto.variantes ?? [])
        .filter((v) => !talla || v.talla === talla)
        .map((v) => v.color),
    ),
  ];
}

export function varianteDe(
  producto: Producto,
  talla: string,
  color: string,
): Variante | undefined {
  return producto.variantes?.find((v) => v.talla === talla && v.color === color);
}

export function sincronizarExistencia(producto: Producto) {
  if (tieneVariantes(producto)) {
    producto.existencia = existenciaTotal(producto);
  }
}
