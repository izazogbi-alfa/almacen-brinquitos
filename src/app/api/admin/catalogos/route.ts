import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { cookiesCatalogos } from "@/server/catalogos-persist";
import { normalizarCatalogos } from "@/lib/catalogos";
import { parseLista } from "@/lib/listas";
import { parseEstiloPdf } from "@/lib/pdf-estilo";
import type { Catalogos, EsquemaCatalogo } from "@/lib/types";
import { exigirModulo } from "@/server/auth";
import { guardarCatalogosEnStore, hidratarCatalogos } from "@/server/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { user, error } = await exigirModulo("configuracion");
  if (!user) {
    return (
      error ??
      NextResponse.json({ error: "No tienes módulo de configuración." }, { status: 403 })
    );
  }

  const body = (await request.json().catch(() => null)) as Partial<Catalogos> | null;
  if (!body) {
    return NextResponse.json({ error: "Falta el cuerpo." }, { status: 400 });
  }

  try {
    const jar = await cookies();
    const store = await hidratarCatalogos((name) => jar.get(name)?.value);
    const base = normalizarCatalogos(store.catalogos);
    const esquemas: EsquemaCatalogo[] = Array.isArray(body.esquemas)
      ? body.esquemas.map((e, i) => ({
          id: (e.id || `esq-${i + 1}`).trim(),
          nombre: (e.nombre || "Esquema").trim(),
          tallas: Array.isArray(e.tallas)
            ? e.tallas.map((t) => t.trim()).filter(Boolean)
            : parseLista(String(e.tallas ?? "")),
          estiloPdf: parseEstiloPdf(e.estiloPdf),
        }))
      : base.esquemas;
    const ids = new Set<string>();
    for (const e of esquemas) {
      if (ids.has(e.id)) throw new Error("Hay esquemas con el mismo id.");
      ids.add(e.id);
    }
    const siguiente = normalizarCatalogos({
      esquemas,
      colores: Array.isArray(body.colores) ? body.colores : base.colores,
      tallas: Array.isArray(body.tallas) ? body.tallas : base.tallas,
      especificaciones: Array.isArray(body.especificaciones)
        ? body.especificaciones
        : base.especificaciones,
      empresaNombre:
        typeof body.empresaNombre === "string"
          ? body.empresaNombre
          : base.empresaNombre,
      logoDataUrl:
        body.logoDataUrl === ""
          ? undefined
          : typeof body.logoDataUrl === "string"
            ? body.logoDataUrl
            : base.logoDataUrl,
    });
    if (body.logoDataUrl === "") {
      delete siguiente.logoDataUrl;
    }

    const { data, remoto } = await guardarCatalogosEnStore(siguiente);
    let cookieOk = false;
    try {
      for (const c of cookiesCatalogos(data)) {
        jar.set(c);
      }
      cookieOk = true;
    } catch (cookieError) {
      console.error("catalogos cookie failed", cookieError);
      if (!remoto.persistio) {
        const msg =
          cookieError instanceof Error
            ? cookieError.message
            : "No se pudo guardar las listas.";
        return NextResponse.json({ error: msg }, { status: 500 });
      }
    }

    if (!remoto.persistio && !cookieOk) {
      return NextResponse.json(
        {
          error:
            "No se pudo guardar las listas. El servidor no pudo persistir los cambios. Intenta de nuevo.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      catalogos: data.catalogos,
      catalogosGuardadosEn: data.savedAt,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "No se pudo guardar." },
      { status: 400 },
    );
  }
}
