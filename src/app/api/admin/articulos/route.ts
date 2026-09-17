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
    esquemaConteo?: EsquemaConteo;
  } | null;

  const clave = body?.sku?.trim() ?? "";
  const nombre = body?.nombre?.trim() ?? "";

  try {
    const producto = withStore((store) => {
      if (!clave) throw new Error("Escribe la Clave.");
      if (!nombre) throw new Error("Escribe el nombre.");

      const duplicada = store.productos.find(
        (p) =>
          p.sku.toUpperCase() === clave.toUpperCase() && p.id !== body?.id,
      );
      if (duplicada) throw new Error("Esa Clave ya existe.");

      if (!body?.id) {
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
          esquemaConteo: body?.esquemaConteo ?? "accesorio",
          colores: [] as string[],
          tallas: [] as string[],
        };
        store.productos.push(creado);
        return creado;
      }

      const prev = store.productos.find((p) => p.id === body.id);
      if (!prev) throw new Error("Artículo no encontrado.");
      prev.nombre = nombre;
      prev.sku = clave;
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
