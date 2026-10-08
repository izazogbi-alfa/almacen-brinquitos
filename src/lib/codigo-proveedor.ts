import type { Producto } from "@/lib/types";

export const CODIGO_PROVEEDOR_MAX = 40;

/** Texto de la ficha. Vacío = el artículo no lleva código. */
export function codigoProveedorAlGuardar(raw: unknown): string {
  if (typeof raw !== "string") {
    throw new Error("El código de proveedor no es válido.");
  }
  const codigo = raw.trim();
  if (codigo.length > CODIGO_PROVEEDOR_MAX) {
    throw new Error("El código de proveedor es muy largo.");
  }
  if (/[\u0000-\u001F\u007F]/.test(codigo)) {
    throw new Error("El código de proveedor no es válido.");
  }
  return codigo;
}

export function ponerCodigoProveedor(producto: Producto, codigo: string) {
  if (codigo) producto.codigoProveedor = codigo;
  else delete producto.codigoProveedor;
}
