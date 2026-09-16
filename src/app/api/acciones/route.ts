import { NextResponse } from "next/server";
import { fechaClave } from "@/lib/format";
import { pendienteDeLinea } from "@/lib/mock-data";
import { exigirUsuario } from "@/server/auth";
import {
  agregarMovimiento,
  marcarGuardado,
  siguienteFolio,
  withStore,
} from "@/server/store";

export async function POST(request: Request) {
  const { user, error } = await exigirUsuario();
  if (!user) {
    return (
      error ??
      NextResponse.json({ error: "Inicia sesión para continuar." }, { status: 401 })
    );
  }

  const body = (await request.json().catch(() => null)) as {
    accion?: string;
    productoId?: string;
    cantidad?: number;
    existencia?: number;
    nota?: string;
    proveedor?: string;
    notas?: string;
    lineas?: { productoId: string; cantidad: number; costoUnitario?: number }[];
    pedidoId?: string;
  } | null;

  const accion = body?.accion;
  if (!accion) {
    return NextResponse.json({ error: "Falta la acción." }, { status: 400 });
  }

  try {
    const result = withStore((store) => {
      if (accion === "retirar") {
        const producto = store.productos.find((p) => p.id === body?.productoId);
        if (!producto) throw new Error("Producto no encontrado.");
        const cantidad = Number(body?.cantidad);
        if (!Number.isFinite(cantidad) || cantidad <= 0) {
          throw new Error("Indica cuántas piezas se sacan.");
        }
        if (cantidad > producto.existencia) {
          throw new Error(
            `Solo hay ${producto.existencia} ${producto.unidad} de ${producto.nombre}.`,
          );
        }
        const antes = producto.existencia;
        producto.existencia -= cantidad;
        agregarMovimiento(store, user, {
          tipo: "retiro",
          productoId: producto.id,
          productoNombre: producto.nombre,
          cantidad,
          existenciaAntes: antes,
          existenciaDespues: producto.existencia,
          nota: body?.nota?.trim() || "Salida de piso",
        });
        marcarGuardado(store, user);
        return { ok: true };
      }

      if (accion === "contar") {
        const producto = store.productos.find((p) => p.id === body?.productoId);
        if (!producto) throw new Error("Producto no encontrado.");
        const existencia = Number(body?.existencia);
        if (!Number.isFinite(existencia) || existencia < 0) {
          throw new Error("La existencia contada no es válida.");
        }
        const antes = producto.existencia;
        producto.existencia = existencia;
        agregarMovimiento(store, user, {
          tipo: "conteo",
          productoId: producto.id,
          productoNombre: producto.nombre,
          cantidad: existencia - antes,
          existenciaAntes: antes,
          existenciaDespues: producto.existencia,
          nota: "Conteo de existencias",
        });
        marcarGuardado(store, user);
        return { ok: true };
      }

      if (accion === "cerrar-dia") {
        const fecha = fechaClave();
        const delDia = store.movimientos.filter(
          (m) =>
            fechaClave(new Date(m.timestamp)) === fecha &&
            (m.tipo === "retiro" || m.tipo === "conteo"),
        );
        const cierre = {
          id: `cj-${Date.now()}`,
          fecha,
          timestamp: new Date().toISOString(),
          userId: user.id,
          userName: user.nombre,
          retiros: delDia.filter((m) => m.tipo === "retiro").length,
          conteos: delDia.filter((m) => m.tipo === "conteo").length,
        };
        store.cierres.unshift(cierre);
        agregarMovimiento(store, user, {
          tipo: "cierre" as const,
          cantidad: delDia.length,
          nota: "Cierre del día de existencias",
        });
        marcarGuardado(store, user);
        return { cierre };
      }

      if (accion === "pedido") {
        const lineas = (body?.lineas ?? []).filter((l) => l.cantidad > 0);
        if (!body?.proveedor || lineas.length === 0) {
          throw new Error("Elige proveedor y al menos una línea.");
        }
        const pedido = {
          id: `po-${Date.now()}`,
          folio: siguienteFolio(store.pedidos),
          proveedor: body.proveedor,
          fecha: new Date().toISOString(),
          estado: "enviado" as const,
          notas: body.notas?.trim() ?? "",
          lineas: lineas.map((l) => ({
            productoId: l.productoId,
            cantidad: l.cantidad,
            recibido: 0,
            costoUnitario: l.costoUnitario ?? 22,
          })),
          userId: user.id,
          userName: user.nombre,
        };
        store.pedidos.unshift(pedido);
        agregarMovimiento(store, user, {
          tipo: "pedido",
          cantidad: lineas.reduce((a, l) => a + l.cantidad, 0),
          pedidoId: pedido.id,
          nota: `Pedido ${pedido.folio}`,
        });
        marcarGuardado(store, user);
        return { pedido };
      }

      if (accion === "recepcion") {
        const pedido = store.pedidos.find((p) => p.id === body?.pedidoId);
        if (!pedido) throw new Error("No encontramos ese pedido.");
        const aplicadas = (body?.lineas ?? []).filter((l) => l.cantidad > 0);
        if (aplicadas.length === 0) {
          throw new Error("Indica al menos una cantidad a recibir.");
        }
        for (const linea of aplicadas) {
          const original = pedido.lineas.find(
            (l) => l.productoId === linea.productoId,
          );
          if (!original) {
            throw new Error("Hay un producto que no pertenece al pedido.");
          }
          if (linea.cantidad > pendienteDeLinea(original)) {
            throw new Error("No puedes recibir más de lo pendiente.");
          }
        }
        for (const linea of aplicadas) {
          const producto = store.productos.find((p) => p.id === linea.productoId);
          if (!producto) continue;
          const antes = producto.existencia;
          producto.existencia += linea.cantidad;
          agregarMovimiento(store, user, {
            tipo: "recepcion",
            productoId: producto.id,
            productoNombre: producto.nombre,
            cantidad: linea.cantidad,
            existenciaAntes: antes,
            existenciaDespues: producto.existencia,
            pedidoId: pedido.id,
            nota: `Recepción ${pedido.folio}`,
          });
        }
        pedido.lineas = pedido.lineas.map((linea) => {
          const extra =
            aplicadas.find((l) => l.productoId === linea.productoId)?.cantidad ??
            0;
          return { ...linea, recibido: linea.recibido + extra };
        });
        pedido.estado = pedido.lineas.every((l) => l.recibido >= l.cantidad)
          ? "recibido"
          : "parcial";
        store.recepciones.unshift({
          id: `rc-${Date.now()}`,
          pedidoId: pedido.id,
          fecha: new Date().toISOString(),
          lineas: aplicadas.map((l) => ({
            productoId: l.productoId,
            cantidad: l.cantidad,
          })),
          userId: user.id,
          userName: user.nombre,
        });
        marcarGuardado(store, user);
        return { pedido };
      }

      throw new Error("Acción no reconocida.");
    });

    return NextResponse.json(result);
  } catch (err) {
    const mensaje =
      err instanceof Error ? err.message : "No se pudo guardar.";
    return NextResponse.json({ error: mensaje }, { status: 400 });
  }
}
