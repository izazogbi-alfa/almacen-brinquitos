import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  filtrarEnCatalogo,
  opcionesTallaArticulo,
} from "@/lib/asignacion-articulo";
import { normalizarCatalogos } from "@/lib/catalogos";
import { cookiesAsignaciones } from "@/server/asignaciones-persist";
import { exigirCsrf, exigirModulo } from "@/server/auth";
import {
  ERROR_ESQUEMA_NO_PERSISTIO,
  contrasenaCoincide,
  guardarAsignacionesEnStore,
  hidratarCatalogos,
  withStore,
} from "@/server/store";
import type { Producto } from "@/lib/types";
import { nombreArticuloAlGuardar } from "@/lib/titulo-etiqueta";

export const dynamic = "force-dynamic";

async function persistirEsquemas(jar: Awaited<ReturnType<typeof cookies>>) {
  const { data, remoto } = await guardarAsignacionesEnStore();
  try {
    for (const c of cookiesAsignaciones(data)) {
      jar.set(c);
    }
  } catch (cookieError) {
    console.error("asignaciones cookie failed", cookieError);
  }
  if (!remoto.persistio) {
    return { error: ERROR_ESQUEMA_NO_PERSISTIO, data };
  }
  return { data, error: null as string | null };
}

export async function POST(request: Request) {
  const { user, error } = await exigirModulo("articulos");
  if (!user) {
    return (
      error ??
      NextResponse.json({ error: "No tienes módulo de artículos." }, { status: 403 })
    );
  }
  const csrf = exigirCsrf(request);
  if (csrf.error) return csrf.error;

  const body = (await request.json().catch(() => null)) as {
    id?: string;
    nombre?: string;
    sku?: string;
    esquemaConteo?: string;
    colores?: unknown;
    tallas?: unknown;
    especificaciones?: unknown;
    soloIdentidad?: unknown;
    password?: unknown;
  } | null;

  const clave = body?.sku?.trim() ?? "";
  const nombre = body?.nombre?.trim() ?? "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!password) {
    return NextResponse.json(
      { error: "Escribe tu contraseña." },
      { status: 400 },
    );
  }

  try {
    if (!contrasenaCoincide(user.id, password)) {
      return NextResponse.json(
        { error: "Contraseña incorrecta. El artículo no se guardó." },
        { status: 401 },
      );
    }
  } catch {
    console.error("password verify failed");
    return NextResponse.json(
      {
        error:
          "No se pudo comprobar la contraseña. El artículo no se guardó.",
      },
      { status: 500 },
    );
  }

  const jar = await cookies();
  await hidratarCatalogos((name) => jar.get(name)?.value);

  const soloIdentidad = body?.soloIdentidad === true;
  let snapshot: Producto[] | null = null;

  try {
    const producto = await withStore((store) => {
      if (!clave) throw new Error("Escribe la Clave.");
      const nombreTitulo = nombreArticuloAlGuardar(nombre);
      if (!nombreTitulo) throw new Error("Escribe el nombre.");
      snapshot = store.productos.map((p) => ({ ...p }));

      const catalogos = normalizarCatalogos(store.catalogos);
      const esquemaPedido = body?.esquemaConteo?.trim() ?? "";
      const esquemaId = catalogos.esquemas.find((e) => e.id === esquemaPedido)
        ?.id;
      const opcionesTalla = opcionesTallaArticulo(catalogos, esquemaId);
      const colores = filtrarEnCatalogo(catalogos.colores, body?.colores);
      const tallas = filtrarEnCatalogo(opcionesTalla, body?.tallas);
      const especificaciones = filtrarEnCatalogo(
        catalogos.especificaciones,
        body?.especificaciones,
      );

      const duplicada = store.productos.find(
        (p) =>
          p.sku.toUpperCase() === clave.toUpperCase() && p.id !== body?.id,
      );
      if (duplicada) throw new Error("Esa Clave ya existe.");

      if (!body?.id) {
        if (!soloIdentidad && !esquemaId) {
          throw new Error(
            "Elige el esquema que mejor le queda a este artículo.",
          );
        }
        let id = `p-${clave.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
        if (store.productos.some((p) => p.id === id)) {
          id = `${id}-${Date.now()}`;
        }
        const creado = {
          id,
          sku: clave,
          nombre: nombreTitulo,
          categoria: "",
          unidad: "pza",
          existencia: 0,
          minimo: 0,
          ubicacion: "",
          esquemaConteo: soloIdentidad ? undefined : esquemaId,
          colores: soloIdentidad ? [] : colores,
          tallas: soloIdentidad ? [] : tallas,
          especificaciones: soloIdentidad ? [] : especificaciones,
        };
        store.productos.push(creado);
        return creado;
      }

      const prev = store.productos.find((p) => p.id === body.id);
      if (!prev) throw new Error("Artículo no encontrado.");
      prev.nombre = nombreTitulo;
      prev.sku = clave;
      if (!soloIdentidad) {
        if (!esquemaId) {
          throw new Error("Elige el esquema que mejor le queda a este artículo.");
        }
        prev.esquemaConteo = esquemaId;
        prev.colores = colores;
        prev.tallas = tallas;
        prev.especificaciones = especificaciones;
      }
      return prev;
    });

    if (!soloIdentidad) {
      const persistido = await persistirEsquemas(jar);
      if (persistido.error) {
        if (snapshot) {
          await withStore((store) => {
            store.productos = snapshot as Producto[];
          });
        }
        return NextResponse.json({ error: persistido.error }, { status: 500 });
      }
      return NextResponse.json({
        producto,
        asignaciones: persistido.data.asignaciones,
        asignacionesGuardadosEn: persistido.data.savedAt,
      });
    }

    return NextResponse.json({ producto });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "No se pudo guardar." },
      { status: 400 },
    );
  }
}
