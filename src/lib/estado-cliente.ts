import { puede } from "@/lib/modulos";
import type { ModuloSesion } from "@/lib/sesion-captura";
import type {
  Movimiento,
  Pedido,
  Recepcion,
  UsuarioPublico,
} from "@/lib/types";

export function pedidosVisiblesPara(
  user: UsuarioPublico | null | undefined,
  pedidos: Pedido[],
) {
  return puede(user, "pedidos") ? pedidos : [];
}

export function recepcionesVisiblesPara(
  user: UsuarioPublico | null | undefined,
  recepciones: Recepcion[],
) {
  return puede(user, "recepcion") ? recepciones : [];
}

export function movimientosVisiblesPara(
  user: UsuarioPublico | null | undefined,
  movimientos: Movimiento[],
) {
  return movimientos.filter((m) => {
    if (m.tipo === "conteo" || m.tipo === "retiro" || m.tipo === "cierre") {
      return puede(user, "existencias");
    }
    if (m.tipo === "recepcion") return puede(user, "recepcion");
    if (m.tipo === "pedido") return puede(user, "pedidos");
    return true;
  });
}

export function puedeModuloDeSesion(
  user: UsuarioPublico | null | undefined,
  modulo: ModuloSesion,
) {
  return puede(user, modulo);
}
