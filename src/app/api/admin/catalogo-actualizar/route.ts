import { NextResponse } from "next/server";
import {
  aplicarFilasCatalogo,
  diffCatalogo,
  sanitizarFotoCatalogo,
  type FilaCatalogo,
} from "@/lib/actualizar-catalogo";
import { sanitizarArticuloSinFabrica } from "@/lib/catalogos";
import { exigirAdmin } from "@/server/auth";
import { contrasenaCoincide, withStore } from "@/server/store";

export const dynamic = "force-dynamic";

function filasValidas(raw: unknown): FilaCatalogo[] | null {
  if (!Array.isArray(raw)) return null;
  const out: FilaCatalogo[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as { clave?: unknown; nombre?: unknown; foto?: unknown };
    const clave = typeof o.clave === "string" ? o.clave.trim() : "";
    const nombre = typeof o.nombre === "string" ? o.nombre.trim() : "";
    if (!clave || !nombre) continue;
    const id = clave.toUpperCase();
    if (seen.has(id)) {
      const i = out.findIndex((f) => f.clave.trim().toUpperCase() === id);
      if (i >= 0) out.splice(i, 1);
    }
    seen.add(id);
    const foto = sanitizarFotoCatalogo(o.foto);
    out.push({ clave, nombre, ...(foto ? { foto } : {}) });
  }
  return out;
}

export async function POST(request: Request) {
  const { user, error } = await exigirAdmin();
  if (!user) {
    return (
      error ??
      NextResponse.json(
        { error: "Solo quien administra puede actualizar el catálogo." },
        { status: 403 },
      )
    );
  }

  const body = (await request.json().catch(() => null)) as {
    filas?: unknown;
    password?: unknown;
  } | null;
  if (!body) {
    return NextResponse.json({ error: "Falta el cuerpo." }, { status: 400 });
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (!password) {
    return NextResponse.json(
      { error: "Escribe tu contraseña." },
      { status: 400 },
    );
  }
  try {
    if (!contrasenaCoincide(user.id, password)) {
      return NextResponse.json(
        { error: "Contraseña incorrecta. El catálogo no se tocó." },
        { status: 401 },
      );
    }
  } catch {
    return NextResponse.json(
      {
        error: "No se pudo comprobar la contraseña. El catálogo no se tocó.",
      },
      { status: 500 },
    );
  }

  const filas = filasValidas(body.filas);
  if (!filas || filas.length === 0) {
    return NextResponse.json(
      { error: "No hay artículos con Clave y Nombre para aplicar." },
      { status: 400 },
    );
  }

  const resultado = await withStore((store) => {
    const sesionesAntes = store.sesiones;
    const movimientosAntes = store.movimientos;
    const pedidosAntes = store.pedidos;
    const preview = diffCatalogo(store.productos, filas);
    if (preview.actualizar.length === 0 && preview.nuevos.length === 0) {
      return { preview, total: store.productos.length };
    }
    store.productos = aplicarFilasCatalogo(store.productos, filas).map((p) =>
      sanitizarArticuloSinFabrica(p, store.catalogos),
    );
    store.sesiones = sesionesAntes;
    store.movimientos = movimientosAntes;
    store.pedidos = pedidosAntes;
    return { preview, total: store.productos.length };
  });

  return NextResponse.json({
    ok: true,
    actualizar: resultado.preview.actualizar.length,
    nuevos: resultado.preview.nuevos.length,
    sinCambio: resultado.preview.sinCambio.length,
    fotosCambian: resultado.preview.fotosCambian.length,
    total: resultado.total,
  });
}
