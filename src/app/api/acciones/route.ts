import { NextResponse } from "next/server";
import { pendienteDeLinea } from "@/lib/mock-data";
import {
  ajustarCantidad,
  cantidadEn,
  coloresProducto,
  fijarConteo,
  sucursalPorId,
} from "@/lib/sucursales";
import { exigirUsuario } from "@/server/auth";
import { modulosDe } from "@/lib/modulos";
import {
  agregarMovimiento,
  contrasenaCoincide,
  marcarGuardado,
  siguienteFolio,
  withStore,
} from "@/server/store";
import {
  abandonarSesionesAbiertas,
  aplicarCierresPorInactividad,
  borrarSesionPendiente,
  cerrarSesionModulo,
  reanudarSesionPendiente,
  terminarSesionModulo,
  borrarSesionTerminada,
  tocarSesionCaptura,
  guardarRegistroCaptura,
} from "@/lib/sesion-store";
import { esModuloSesion } from "@/lib/sesion-captura";

function normalizarCeldas(
  body: {
    talla?: string;
    color?: string;
    cantidad?: number;
    existencia?: number;
    celdas?: {
      talla?: string;
      color?: string;
      cantidad?: number;
      existencia?: number;
    }[];
  } | null,
  producto: Parameters<typeof coloresProducto>[0],
  modo: "contar" | "delta",
) {
  const raw =
    body?.celdas && body.celdas.length > 0
      ? body.celdas
      : [
          {
            talla: body?.talla,
            color: body?.color,
            cantidad: body?.cantidad,
            existencia: body?.existencia,
          },
        ];
  return raw.map((c) => {
    const talla = (c.talla ?? "").trim();
    const color =
      (c.color ?? "").trim() || coloresProducto(producto)[0] || "Único";
    const cantidad = Number(
      modo === "contar" ? (c.existencia ?? c.cantidad) : c.cantidad,
    );
    if (!Number.isFinite(cantidad) || cantidad < 0) {
      throw new Error("Hay una cantidad inválida en la cuadrícula.");
    }
    return { talla, color, cantidad };
  });
}

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
    celdas?: { talla?: string; color?: string; cantidad?: number; existencia?: number }[];
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
    modulo?: string;
    borrador?: unknown;
    borradores?: Partial<
      Record<"existencias" | "pedidos" | "recepcion", unknown>
    >;
    crearSiFalta?: boolean;
    sesionId?: string;
    password?: string;
  } | null;

  const accion = body?.accion;
  if (!accion) {
    return NextResponse.json({ error: "Falta la acción." }, { status: 400 });
  }

  try {
    const mods = modulosDe(user);
    const result = withStore((store) => {
      aplicarCierresPorInactividad(store);

      if (accion === "latido-sesion") {
        if (!esModuloSesion(body?.modulo)) {
          throw new Error("Falta el módulo de la sesión.");
        }
        if (body.modulo === "existencias" && !mods.existencias) {
          throw new Error("No tienes módulo de existencias.");
        }
        if (body.modulo === "recepcion" && !mods.recepcion) {
          throw new Error("No tienes módulo de recepción.");
        }
        if (body.modulo === "pedidos" && !mods.pedidos) {
          throw new Error("No tienes módulo de pedidos.");
        }
        const sesion = tocarSesionCaptura(store, user, body.modulo, new Date(), {
          borrador: body.borrador,
        });
        marcarGuardado(store, user);
        return { sesion };
      }

      if (accion === "guardar-borrador") {
        if (!esModuloSesion(body?.modulo)) {
          throw new Error("Falta el módulo de la sesión.");
        }
        if (body.modulo === "existencias" && !mods.existencias) {
          throw new Error("No tienes módulo de existencias.");
        }
        if (body.modulo === "recepcion" && !mods.recepcion) {
          throw new Error("No tienes módulo de recepción.");
        }
        if (body.modulo === "pedidos" && !mods.pedidos) {
          throw new Error("No tienes módulo de pedidos.");
        }
        const sesion = tocarSesionCaptura(store, user, body.modulo, new Date(), {
          crearSiFalta: false,
          borrador: body.borrador,
        });
        return { sesion };
      }

      if (accion === "reanudar-sesion") {
        if (!esModuloSesion(body?.modulo)) {
          throw new Error("Falta el módulo de la sesión.");
        }
        if (body.modulo === "existencias" && !mods.existencias) {
          throw new Error("No tienes módulo de existencias.");
        }
        if (body.modulo === "recepcion" && !mods.recepcion) {
          throw new Error("No tienes módulo de recepción.");
        }
        if (body.modulo === "pedidos" && !mods.pedidos) {
          throw new Error("No tienes módulo de pedidos.");
        }
        const sesion = reanudarSesionPendiente(
          store,
          user,
          body.modulo,
          new Date(),
          typeof body.sesionId === "string" ? body.sesionId : undefined,
        );
        if (!sesion) {
          throw new Error("No hay una captura pendiente en este módulo.");
        }
        marcarGuardado(store, user);
        return { sesion };
      }

      if (accion === "borrar-sesion-pendiente") {
        const sesionId =
          typeof body?.sesionId === "string" ? body.sesionId.trim() : "";
        if (!sesionId) {
          throw new Error("Falta la captura pendiente.");
        }
        const password = typeof body?.password === "string" ? body.password : "";
        if (!password) {
          throw new Error("Escribe tu contraseña.");
        }
        if (!contrasenaCoincide(user.id, password)) {
          throw new Error("Contraseña incorrecta. No se quitó.");
        }
        const objetivo = store.sesiones.find((s) => s.id === sesionId);
        if (
          !objetivo ||
          !objetivo.cerradaEn ||
          !objetivo.pendiente ||
          !esModuloSesion(objetivo.modulo)
        ) {
          throw new Error("Esa captura pendiente ya no está.");
        }
        if (objetivo.modulo === "existencias" && !mods.existencias) {
          throw new Error("No tienes módulo de existencias.");
        }
        if (objetivo.modulo === "recepcion" && !mods.recepcion) {
          throw new Error("No tienes módulo de recepción.");
        }
        if (objetivo.modulo === "pedidos" && !mods.pedidos) {
          throw new Error("No tienes módulo de pedidos.");
        }
        const sesion = borrarSesionPendiente(store, sesionId);
        if (!sesion) {
          throw new Error("Esa captura pendiente ya no está.");
        }
        marcarGuardado(store, user);
        return { sesion };
      }

      if (accion === "terminar-sesion") {
        if (!esModuloSesion(body?.modulo)) {
          throw new Error("Falta el módulo de la sesión.");
        }
        if (body.modulo === "existencias" && !mods.existencias) {
          throw new Error("No tienes módulo de existencias.");
        }
        if (body.modulo === "recepcion" && !mods.recepcion) {
          throw new Error("No tienes módulo de recepción.");
        }
        if (body.modulo === "pedidos" && !mods.pedidos) {
          throw new Error("No tienes módulo de pedidos.");
        }
        const sesion = terminarSesionModulo(store, user, body.modulo, new Date(), {
          borrador: body.borrador,
        });
        if (!sesion) {
          throw new Error(
            "No hay una captura abierta con trabajo para marcar como terminada.",
          );
        }
        marcarGuardado(store, user);
        return { sesion };
      }

      if (accion === "borrar-sesion-terminada") {
        const sesionId =
          typeof body?.sesionId === "string" ? body.sesionId.trim() : "";
        if (!sesionId) {
          throw new Error("Falta la captura terminada.");
        }
        const password = typeof body?.password === "string" ? body.password : "";
        if (!password) {
          throw new Error("Escribe tu contraseña.");
        }
        if (!contrasenaCoincide(user.id, password)) {
          throw new Error("Contraseña incorrecta. No se quitó.");
        }
        const objetivo = store.sesiones.find((s) => s.id === sesionId);
        if (!objetivo || !objetivo.cerradaEn || objetivo.pendiente) {
          throw new Error("Esa captura terminada ya no está.");
        }
        if (objetivo.modulo === "existencias" && !mods.existencias) {
          throw new Error("No tienes módulo de existencias.");
        }
        if (objetivo.modulo === "recepcion" && !mods.recepcion) {
          throw new Error("No tienes módulo de recepción.");
        }
        if (objetivo.modulo === "pedidos" && !mods.pedidos) {
          throw new Error("No tienes módulo de pedidos.");
        }
        const sesion = borrarSesionTerminada(store, sesionId);
        if (!sesion) {
          throw new Error("Esa captura terminada ya no está.");
        }
        marcarGuardado(store, user);
        return { sesion };
      }

      if (accion === "guardar-registro") {
        if (!esModuloSesion(body?.modulo)) {
          throw new Error("Falta el módulo de la sesión.");
        }
        if (body.modulo === "existencias" && !mods.existencias) {
          throw new Error("No tienes módulo de existencias.");
        }
        if (body.modulo === "recepcion" && !mods.recepcion) {
          throw new Error("No tienes módulo de recepción.");
        }
        if (body.modulo === "pedidos" && !mods.pedidos) {
          throw new Error("No tienes módulo de pedidos.");
        }
        const cierre =
          body?.cierre === "terminada" ? "terminada" : "pendiente";
        const sesion = guardarRegistroCaptura(
          store,
          user,
          body.modulo,
          cierre,
          new Date(),
          body.borrador,
        );
        if (!sesion) {
          throw new Error(
            cierre === "terminada"
              ? "No se pudo terminar. Cuenta al menos una talla."
              : "No se pudo dejar pendiente. Cuenta al menos una talla.",
          );
        }
        marcarGuardado(store, user);
        return { sesion };
      }

      if (accion === "cerrar-sesion") {
        if (!esModuloSesion(body?.modulo)) {
          throw new Error("Falta el módulo de la sesión.");
        }
        const sesion = cerrarSesionModulo(store, user, body.modulo);
        return { sesion, aviso: sesion ? "Sesión cerrada por inactividad" : null };
      }

      if (accion === "abandonar-pagina") {
        const modulo = esModuloSesion(body?.modulo) ? body.modulo : undefined;
        if (modulo === "existencias" && !mods.existencias) {
          throw new Error("No tienes módulo de existencias.");
        }
        if (modulo === "recepcion" && !mods.recepcion) {
          throw new Error("No tienes módulo de recepción.");
        }
        if (modulo === "pedidos" && !mods.pedidos) {
          throw new Error("No tienes módulo de pedidos.");
        }
        const sesiones = abandonarSesionesAbiertas(
          store,
          user,
          new Date(),
          modulo,
          body.borrador,
          body.borradores,
        );
        if (sesiones.some((s) => s.pendiente)) marcarGuardado(store, user);
        return { sesiones };
      }

      if (accion === "contar") {
        if (!mods.existencias) throw new Error("No tienes módulo de existencias.");
        const producto = store.productos.find((p) => p.id === body?.productoId);
        if (!producto) throw new Error("Producto no encontrado.");
        const sucursalId = body?.sucursalId?.trim();
        const sucursal = sucursalId ? sucursalPorId(sucursalId) : undefined;
        if (!sucursal) {
          throw new Error("Elige la sucursal donde estás contando.");
        }
        const lista = normalizarCeldas(body, producto, "contar");
        if (lista.length === 0) throw new Error("No hay celdas para guardar.");
        const sesion = tocarSesionCaptura(store, user, "existencias");
        if (!sesion) throw new Error("No se pudo abrir la sesión.");
        for (const celda of lista) {
          const antes = cantidadEn(producto, sucursal.id, celda.talla, celda.color);
          fijarConteo(
            producto,
            sucursal.id,
            celda.talla,
            celda.color,
            celda.cantidad,
          );
          agregarMovimiento(store, user, {
            tipo: "conteo",
            productoId: producto.id,
            productoNombre: producto.nombre,
            cantidad: celda.cantidad - antes,
            existenciaAntes: antes,
            existenciaDespues: celda.cantidad,
            talla: celda.talla || undefined,
            color: celda.color,
            sucursalId: sucursal.id,
            sucursalNombre: sucursal.nombre,
            sesionId: sesion.id,
            nota: `Conteo ${sucursal.nombre}${celda.talla ? ` · ${celda.talla}` : ""} · ${celda.color}`,
          });
          sesion.conteos += 1;
        }
        marcarGuardado(store, user);
        return { ok: true };
      }

      if (accion === "entrada") {
        if (!mods.recepcion) throw new Error("No tienes módulo de recepción.");
        const producto = store.productos.find((p) => p.id === body?.productoId);
        if (!producto) throw new Error("Producto no encontrado.");
        const sucursalId = body?.sucursalId?.trim();
        const sucursal = sucursalId ? sucursalPorId(sucursalId) : undefined;
        if (!sucursal) {
          throw new Error("Elige la sucursal.");
        }
        const lista = normalizarCeldas(body, producto, "delta").filter(
          (c) => c.cantidad > 0,
        );
        if (lista.length === 0) throw new Error("Indica al menos una pieza de entrada.");
        const sesion = tocarSesionCaptura(store, user, "recepcion");
        if (!sesion) throw new Error("No se pudo abrir la sesión.");
        for (const celda of lista) {
          const { antes, despues } = ajustarCantidad(
            producto,
            sucursal.id,
            celda.talla,
            celda.color,
            celda.cantidad,
          );
          agregarMovimiento(store, user, {
            tipo: "recepcion",
            productoId: producto.id,
            productoNombre: producto.nombre,
            cantidad: celda.cantidad,
            existenciaAntes: antes,
            existenciaDespues: despues,
            talla: celda.talla || undefined,
            color: celda.color,
            sucursalId: sucursal.id,
            sucursalNombre: sucursal.nombre,
            sesionId: sesion.id,
            nota: `Entrada ${sucursal.nombre}${celda.talla ? ` · ${celda.talla}` : ""} · ${celda.color}`,
          });
          sesion.entradas += 1;
        }
        marcarGuardado(store, user);
        return { ok: true };
      }

      if (accion === "pedido") {
        if (!mods.pedidos) {
          throw new Error("No tienes módulo de pedidos.");
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
        const sesion = tocarSesionCaptura(store, user, "pedidos");
        if (!sesion) throw new Error("No se pudo abrir la sesión.");
        sesion.pedidos += 1;
        agregarMovimiento(store, user, {
          tipo: "pedido",
          cantidad: lineas.reduce((a, l) => a + l.cantidad, 0),
          pedidoId: pedido.id,
          sesionId: sesion.id,
          nota: `Pedido ${pedido.folio} (por autorizar)`,
        });
        marcarGuardado(store, user);
        terminarSesionModulo(store, user, "pedidos");
        return { pedido };
      }

      if (accion === "autorizar-pedido") {
        if (user.rol !== "admin") {
          throw new Error("Solo quien administra autoriza pedidos.");
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
        const sesion = tocarSesionCaptura(store, user, "recepcion");
        if (!sesion) throw new Error("No se pudo abrir la sesión.");
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
            sesionId: sesion.id,
            nota: `Recepción ${pedido.folio}`,
          });
          sesion.entradas += 1;
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
