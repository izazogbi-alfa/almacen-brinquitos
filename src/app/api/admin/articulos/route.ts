import { NextResponse } from "next/server";
import {
  filtrarEnCatalogo,
  opcionesTallaArticulo,
} from "@/lib/asignacion-articulo";
import { normalizarCatalogos } from "@/lib/catalogos";
import { exigirModulo } from "@/server/auth";
import { contrasenaCoincide, withStore } from "@/server/store";

export async function POST(request: Request) {
  const { user, error } = await exigirModulo("articulos");
  if (!user) {
    return (
      error ??
      NextResponse.json({ error: "No tienes módulo de artículos." }, { status: 403 })
    );
  }

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

  try {
    const producto = withStore((store) => {
      if (!clave) throw new Error("Escribe la Clave.");
      if (!nombre) throw new Error("Escribe el nombre.");

      const catalogos = normalizarCatalogos(store.catalogos);
      const soloIdentidad = body?.soloIdentidad === true;
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
          nombre,
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
      prev.nombre = nombre;
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
    return NextResponse.json({ producto });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "No se pudo guardar." },
      { status: 400 },
    );
  }
}
