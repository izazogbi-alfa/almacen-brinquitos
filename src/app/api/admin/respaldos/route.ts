import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { exigirAdmin } from "@/server/auth";
import { agregarRespaldo, listarRespaldos } from "@/server/respaldos";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, error } = await exigirAdmin();
  if (!user) {
    return (
      error ??
      NextResponse.json(
        { error: "Solo quien administra puede ver los respaldos." },
        { status: 403 },
      )
    );
  }
  try {
    const items = await listarRespaldos();
    return NextResponse.json({ items, limite: 10 });
  } catch {
    console.error("respaldos list failed");
    return NextResponse.json(
      { error: "No se pudo cargar la lista de copias. Intenta de nuevo." },
      { status: 500 },
    );
  }
}

export async function POST() {
  const { user, error } = await exigirAdmin();
  if (!user) {
    return (
      error ??
      NextResponse.json(
        { error: "Solo quien administra puede guardar un respaldo." },
        { status: 403 },
      )
    );
  }
  try {
    const jar = await cookies();
    const resultado = await agregarRespaldo({
      origen: "manual",
      leerCookie: (name) => jar.get(name)?.value,
    });
    const items = await listarRespaldos();
    return NextResponse.json({
      ...resultado,
      items,
    });
  } catch (err) {
    console.error("respaldo manual failed");
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "No se pudo guardar el respaldo. Intenta de nuevo.",
      },
      { status: 500 },
    );
  }
}
