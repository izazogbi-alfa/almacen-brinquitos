import { NextResponse } from "next/server";
import type { EsquemaConteo } from "@/lib/types";
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

  const body = (await request.json().catch(() => null)) as {
    id?: string;
    nombre?: string;
    sku?: string;
    categoria?: string;
    esquemaConteo?: EsquemaConteo;
    colores?: string;
    tallas?: string;
  } | null;

  if (!body?.id) {
    return NextResponse.json({ error: "Falta el artículo." }, { status: 400 });
  }

  try {
    const producto = withStore((store) => {
      const prev = store.productos.find((p) => p.id === body.id);
      if (!prev) throw new Error("Artículo no encontrado.");
      if (body.nombre?.trim()) prev.nombre = body.nombre.trim();
      if (body.sku?.trim()) prev.sku = body.sku.trim();
      if (body.categoria?.trim()) prev.categoria = body.categoria.trim();
      if (body.esquemaConteo) prev.esquemaConteo = body.esquemaConteo;
      if (typeof body.colores === "string") {
        prev.colores = body.colores
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean);
      }
      if (typeof body.tallas === "string") {
        prev.tallas = body.tallas
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean);
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
