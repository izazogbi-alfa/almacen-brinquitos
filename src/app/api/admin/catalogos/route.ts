import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { cookiesCatalogos } from "@/server/catalogos-persist";
import { normalizarCatalogos } from "@/lib/catalogos";
import { fuentesAlGuardarCatalogos } from "@/lib/persist-merge";
import { parseLista } from "@/lib/listas";
import { elegirEstiloPdf, MENSAJE_ESTILO_PDF_OBLIGATORIO } from "@/lib/pdf-estilo";
import type { Catalogos, EsquemaCatalogo } from "@/lib/types";
import { exigirCsrf, exigirModulo } from "@/server/auth";
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
  const csrf = exigirCsrf(request);
  if (csrf.error) return csrf.error;

  const body = (await request.json().catch(() => null)) as Partial<Catalogos> | null;
  if (!body) {
    return NextResponse.json({ error: "Falta el cuerpo." }, { status: 400 });
  }

  try {
    const jar = await cookies();
    const store = await hidratarCatalogos((name) => jar.get(name)?.value);
    const base = normalizarCatalogos(store.catalogos);
    const fuentes = fuentesAlGuardarCatalogos(body, base);
    const esquemas: EsquemaCatalogo[] =
      fuentes.esquemas === "base" || !Array.isArray(body.esquemas)
        ? base.esquemas
        : body.esquemas.map((e, i) => {
            const estiloPdf = elegirEstiloPdf(e.estiloPdf);
            return {
              id: (e.id || `esq-${i + 1}`).trim(),
              nombre: (e.nombre || "Esquema").trim(),
              tallas: Array.isArray(e.tallas)
                ? e.tallas.map((t) => t.trim()).filter(Boolean)
                : parseLista(String(e.tallas ?? "")),
              ...(estiloPdf ? { estiloPdf } : {}),
            };
          });
    const ids = new Set<string>();
    for (const e of esquemas) {
      if (ids.has(e.id)) throw new Error("Hay esquemas con el mismo id.");
      ids.add(e.id);
      const existia = base.esquemas.some((b) => b.id === e.id);
      if (!elegirEstiloPdf(e.estiloPdf) && !existia) {
        throw new Error(MENSAJE_ESTILO_PDF_OBLIGATORIO);
      }
    }
    const siguiente = normalizarCatalogos({
      esquemas,
      colores: fuentes.colores === "base" ? base.colores : body.colores,
      tallas: fuentes.tallas === "base" ? base.tallas : body.tallas,
      especificaciones:
        fuentes.especificaciones === "base"
          ? base.especificaciones
          : body.especificaciones,
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
    try {
      for (const c of cookiesCatalogos(data)) {
        jar.set(c);
      }
    } catch (cookieError) {
      console.error("catalogos cookie failed", cookieError);
    }

    if (!remoto.persistio) {
      return NextResponse.json(
        {
          error:
            "No se pudo guardar las listas en el servidor. Intenta de nuevo. No se finge el éxito.",
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
