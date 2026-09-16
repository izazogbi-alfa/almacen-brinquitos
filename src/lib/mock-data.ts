import type { Pedido, Recepcion } from "@/lib/types";
import { SUCURSALES } from "@/lib/sucursales";

export { SUCURSALES };

export const PROVEEDORES = [
  "Distribuidora del Valle",
  "Alimentos del Norte",
  "Empaques y Más",
  "Lácteos La Sierra",
] as const;

export const pedidosIniciales: Pedido[] = [];
export const recepcionesIniciales: Recepcion[] = [];

export function pendienteDeLinea(linea: { cantidad: number; recibido: number }) {
  return Math.max(0, linea.cantidad - linea.recibido);
}

export function totalPedido(pedido: Pedido) {
  return pedido.lineas.reduce(
    (acc, linea) => acc + linea.cantidad * linea.costoUnitario,
    0,
  );
}

export function progresoRecepcion(pedido: Pedido) {
  const pedidoTotal = pedido.lineas.reduce((acc, l) => acc + l.cantidad, 0);
  const recibido = pedido.lineas.reduce((acc, l) => acc + l.recibido, 0);
  return {
    pedidoTotal,
    recibido,
    pendiente: Math.max(0, pedidoTotal - recibido),
  };
}
