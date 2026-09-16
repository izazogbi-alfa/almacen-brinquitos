import { NextResponse } from "next/server";
import { fechaClave } from "@/lib/format";
import { pendienteDeLinea } from "@/lib/mock-data";
import {
  ajustarCantidad,
  cantidadEn,
  coloresProducto,
  esquemaDe,
  fijarConteo,
  sucursalPorId,
} from "@/lib/sucursales";
import { exigirUsuario } from "@/server/auth";
import { modulosDe } from "@/lib/modulos";
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
    talla?: string;
    color?: string;
    sucursalId?: string;
    nota?: string;
    proveedor?: string;
    notas?: string;
    lineas?: {
      productoId: string;
      cantidad: number;
      costoUnitario?: number;
      talla?: string;
      color?: string;
      sucursalId?: string;
      sucursalNombre?: string;
    }[];
    pedidoId?: string;
  } | null;

  const accion = body?.accion;
  if (!accion) {
    return NextResponse.json({ error: "Falta la acción." }, { status: 400 });
  }

  try {
    const mods = modulosDe(user);
    const result = withStore((store) => {
      if (accion === "retirar") {
        if (!mods.existencias) throw new Error("No tienes módulo de existencias.");
        const producto = store.productos.find((p) => p.id === body?.productoId);
        if (!producto) throw new Error("Producto no encontrado.");
        const cantidad = Number(body?.cantidad);
        if (!Number.isFinite(cantidad) || cantidad <= 0) {
          throw new Error("Indica cuántas piezas se sacan.");
        }
        const sucursalId = body?.sucursalId?.trim();
        const sucursal = sucursalId ? sucursalPorId(sucursalId) : undefined;
        if (!sucursal) {
          throw new Error("Elige la sucursal.");
        }
        const esquema = esquemaDe(producto);
        const talla = esquema === "accesorio" ? "" : body?.talla?.trim() || "";
        const color =
          body?.color?.trim() || coloresProducto(producto)[0] || "Único";
        if (esquema !== "accesorio" && !talla) {
          throw new Error("Elige la talla.");
        }
        const { antes, despues } = ajustarCantidad(
          producto,
          sucursal.id,
          talla,
          color,
          -cantidad,
        );
        agregarMovimiento(store, user, {
          tipo: "retiro",
          productoId: producto.id,
          productoNombre: producto.nombre,
          cantidad,
          existenciaAntes: antes,
          existenciaDespues: despues,
          talla: talla || undefined,
          color,
          sucursalId: sucursal.id,
          sucursalNombre: sucursal.nombre,
          nota: `Salida ${sucursal.nombre}${talla ? ` · ${talla}` : ""} · ${color}`,
        });
        marcarGuardado(store, user);
        return { ok: true };
      }

      if (accion === "contar") {
        if (!mods.existencias) throw new Error("No tienes módulo de existencias.");
        const producto = store.productos.find((p) => p.id === body?.productoId);
        if (!producto) throw new Error("Producto no encontrado.");
        const existencia = Number(body?.existencia);
        if (!Number.isFinite(existencia) || existencia < 0) {
          throw new Error("La existencia contada no es válida.");
        }
        const sucursalId = body?.sucursalId?.trim();
        const sucursal = sucursalId ? sucursalPorId(sucursalId) : undefined;
        if (!sucursal) {
          throw new Error("Elige la sucursal donde estás contando.");
        }
        const esquema = esquemaDe(producto);
        const talla =
          esquema === "accesorio" ? "" : body?.talla?.trim() || "";
        const color = body?.color?.trim() || coloresProducto(producto)[0] || "Único";
        if (esquema !== "accesorio" && !talla) {
          throw new Error("Elige la talla de este producto.");
        }
        if (!color) {
          throw new Error("Elige el color.");
        }
        const antes = cantidadEn(producto, sucursal.id, talla, color);
        fijarConteo(producto, sucursal.id, talla, color, existencia);
        agregarMovimiento(store, user, {
          tipo: "conteo",
          productoId: producto.id,
          productoNombre: producto.nombre,
          cantidad: existencia - antes,
          existenciaAntes: antes,
          existenciaDespues: existencia,
          talla: talla || undefined,
          color,
          sucursalId: sucursal.id,
          sucursalNombre: sucursal.nombre,
          nota: `Conteo ${sucursal.nombre}${talla ? ` · ${talla}` : ""} · ${color}`,
        });
        marcarGuardado(store, user);
        return { ok: true };
      }

      if (accion === "entrada") {
        if (!mods.recepcion) throw new Error("No tienes módulo de recepción.");
        const producto = store.productos.find((p) => p.id === body?.productoId);
        if (!producto) throw new Error("Producto no encontrado.");
        const cantidad = Number(body?.cantidad);
        if (!Number.isFinite(cantidad) || cantidad <= 0) {
          throw new Error("Indica cuántas piezas entran.");
        }
        const sucursalId = body?.sucursalId?.trim();
        const sucursal = sucursalId ? sucursalPorId(sucursalId) : undefined;
        if (!sucursal) {
          throw new Error("Elige la sucursal.");
        }
        const esquema = esquemaDe(producto);
        const talla = esquema === "accesorio" ? "" : body?.talla?.trim() || "";
        const color =
          body?.color?.trim() || coloresProducto(producto)[0] || "Único";
        if (esquema !== "accesorio" && !talla) {
          throw new Error("Elige la talla.");
        }
        const { antes, despues } = ajustarCantidad(
          producto,
          sucursal.id,
          talla,
          color,
          cantidad,
        );
        agregarMovimiento(store, user, {
          tipo: "recepcion",
          productoId: producto.id,
          productoNombre: producto.nombre,
          cantidad,
          existenciaAntes: antes,
          existenciaDespues: despues,
          talla: talla || undefined,
          color,
          sucursalId: sucursal.id,
          sucursalNombre: sucursal.nombre,
          nota: `Entrada ${sucursal.nombre}${talla ? ` · ${talla}` : ""} · ${color}`,
        });
        marcarGuardado(store, user);
        return { ok: true };
      }

      if (accion === "cerrar-dia") {
        if (!mods.existencias) throw new Error("No tienes módulo de existencias.");
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
        if (user.rol !== "admin") {
          throw new Error("Solo la administradora arma y autoriza pedidos.");
        }
        const lineas = (body?.lineas ?? []).filter((l) => l.cantidad > 0);
        if (!body?.proveedor || lineas.length === 0) {
          throw new Error("Elige proveedor y al menos una línea.");
        }
        const pedido = {
          id: `po-${Date.now()}`,
          folio: siguienteFolio(store.pedidos),
          proveedor: body.proveedor,
          fecha: new Date().toISOString(),
          estado: "borrador" as const,
          notas: body.notas?.trim() ?? "",
          lineas: lineas.map((l) => ({
            productoId: l.productoId,
            cantidad: l.cantidad,
            recibido: 0,
            costoUnitario: l.costoUnitario ?? 22,
            talla: l.talla,
            color: l.color,
            sucursalId: l.sucursalId,
            sucursalNombre: l.sucursalNombre,
          })),
          userId: user.id,
          userName: user.nombre,
        };
        store.pedidos.unshift(pedido);
        agregarMovimiento(store, user, {
          tipo: "pedido",
          cantidad: lineas.reduce((a, l) => a + l.cantidad, 0),
          pedidoId: pedido.id,
          nota: `Pedido ${pedido.folio} (por autorizar)`,
        });
        marcarGuardado(store, user);
        return { pedido };
      }

      if (accion === "autorizar-pedido") {
        if (user.rol !== "admin") {
          throw new Error("Solo la administradora autoriza pedidos.");
        }
        const pedido = store.pedidos.find((p) => p.id === body?.pedidoId);
        if (!pedido) throw new Error("No encontramos ese pedido.");
        if (pedido.estado !== "borrador") {
          throw new Error("Ese pedido ya no está por autorizar.");
        }
        pedido.estado = "enviado";
        pedido.autorizadoPorId = user.id;
        pedido.autorizadoPorNombre = user.nombre;
        pedido.autorizadoEn = new Date().toISOString();
        agregarMovimiento(store, user, {
          tipo: "pedido",
          cantidad: pedido.lineas.reduce((a, l) => a + l.cantidad, 0),
          pedidoId: pedido.id,
          nota: `Autorizó ${pedido.folio}`,
        });
        marcarGuardado(store, user);
        return { pedido };
      }

      if (accion === "recepcion") {
        if (!mods.recepcion) throw new Error("No tienes módulo de recepción.");
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
