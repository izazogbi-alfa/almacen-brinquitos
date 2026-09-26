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
  ERROR_CLON_NO_PERSISTIO,
  contrasenaCoincide,
  guardarAsignacionesEnStore,
  hidratarCatalogos,
  withStore,
} from "@/server/store";
import type { Producto } from "@/lib/types";

export const dynamic = "force-dynamic";

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
    ids?: unknown;
    esquemaConteo?: string;
    colores?: unknown;
    tallas?: unknown;
    especificaciones?: unknown;
    password?: unknown;
  } | null;

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
        {
          error:
            "Contraseña incorrecta. No se copió el esquema a otros artículos.",
        },
        { status: 401 },
      );
    }
  } catch {
    console.error("password verify failed");
    return NextResponse.json(
      {
        error:
          "No se pudo comprobar la contraseña. No se copió el esquema.",
      },
      { status: 500 },
    );
  }

  const idsBrutos = Array.isArray(body?.ids) ? body.ids : [];
  const ids = [
    ...new Set(
      idsBrutos.filter((x): x is string => typeof x === "string" && x.trim() !== ""),
    ),
  ];
  if (ids.length === 0) {
    return NextResponse.json(
      { error: "Elige al menos un artículo para copiar el esquema." },
      { status: 400 },
    );
  }

  const jar = await cookies();
  await hidratarCatalogos((name) => jar.get(name)?.value);
  let snapshot: Producto[] | null = null;

  try {
    const actualizados = await withStore((store) => {
      snapshot = store.productos.map((p) => ({ ...p }));
      const catalogos = normalizarCatalogos(store.catalogos);
      const esquemaId = catalogos.esquemas.find(
        (e) => e.id === body?.esquemaConteo?.trim(),
      )?.id;
      if (!esquemaId) {
        throw new Error(
          "Elige el esquema que mejor le queda. Ármalo en Configuración si aún no está.",
        );
      }
      const opcionesTalla = opcionesTallaArticulo(catalogos, esquemaId);
      const colores = filtrarEnCatalogo(catalogos.colores, body?.colores);
      const tallas = filtrarEnCatalogo(opcionesTalla, body?.tallas);
      const especificaciones = filtrarEnCatalogo(
        catalogos.especificaciones,
        body?.especificaciones,
      );

      const faltantes = ids.filter(
        (id) => !store.productos.some((p) => p.id === id),
      );
      if (faltantes.length > 0) {
        throw new Error("Uno de los artículos ya no está. Recarga e inténtalo.");
      }

      const tocados = [];
      for (const id of ids) {
        const prev = store.productos.find((p) => p.id === id);
        if (!prev) continue;
        prev.esquemaConteo = esquemaId;
        prev.colores = [...colores];
        prev.tallas = [...tallas];
        prev.especificaciones = [...especificaciones];
        tocados.push(prev);
      }
      return tocados.length;
    });

    const { data, remoto } = await guardarAsignacionesEnStore();
    try {
      for (const c of cookiesAsignaciones(data)) {
        jar.set(c);
      }
    } catch (cookieError) {
      console.error("asignaciones cookie failed", cookieError);
    }
    if (!remoto.persistio) {
      if (snapshot) {
        await withStore((store) => {
          store.productos = snapshot as Producto[];
        });
      }
      return NextResponse.json(
        { error: ERROR_CLON_NO_PERSISTIO },
        { status: 500 },
      );
    }

    return NextResponse.json({
      actualizados,
      asignaciones: data.asignaciones,
      asignacionesGuardadosEn: data.savedAt,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "No se pudo copiar." },
      { status: 400 },
    );
  }
}
