import { NextResponse } from "next/server";
import { normalizarCatalogos } from "@/lib/catalogos";
import { parseLista } from "@/lib/listas";
import type { Catalogos, EsquemaCatalogo } from "@/lib/types";
import { exigirAdmin } from "@/server/auth";
import { withStore } from "@/server/store";

export async function POST(request: Request) {
  const { user, error } = await exigirAdmin();
  if (!user) {
    return (
      error ??
      NextResponse.json({ error: "Solo la administradora." }, { status: 403 })
    );
  }

  const body = (await request.json().catch(() => null)) as Partial<Catalogos> | null;
  if (!body) {
    return NextResponse.json({ error: "Falta el cuerpo." }, { status: 400 });
  }

  try {
    const catalogos = withStore((store) => {
      const actual = normalizarCatalogos(store.catalogos);
      const esquemas: EsquemaCatalogo[] = Array.isArray(body.esquemas)
        ? body.esquemas.map((e, i) => ({
            id: (e.id || `esq-${i + 1}`).trim(),
            nombre: (e.nombre || "Esquema").trim(),
            tallas: Array.isArray(e.tallas)
              ? e.tallas.map((t) => t.trim()).filter(Boolean)
              : parseLista(String(e.tallas ?? "")),
          }))
        : actual.esquemas;
      if (esquemas.length === 0) {
        throw new Error("Deja al menos un esquema de conteo.");
      }
      const ids = new Set<string>();
      for (const e of esquemas) {
        if (ids.has(e.id)) throw new Error("Hay esquemas con el mismo id.");
        ids.add(e.id);
      }
      const siguiente = normalizarCatalogos({
        esquemas,
        colores: Array.isArray(body.colores)
          ? body.colores
          : actual.colores,
        tallas: Array.isArray(body.tallas) ? body.tallas : actual.tallas,
        especificaciones: Array.isArray(body.especificaciones)
          ? body.especificaciones
          : actual.especificaciones,
      });
      store.catalogos = siguiente;
      return siguiente;
    });
    return NextResponse.json({ catalogos });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "No se pudo guardar." },
      { status: 400 },
    );
  }
}
