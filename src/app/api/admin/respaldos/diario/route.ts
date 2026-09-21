import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { exigirAdmin } from "@/server/auth";
import {
  agregarRespaldo,
  cookiesListaRespaldos,
  listarRespaldos,
} from "@/server/respaldos";

export const dynamic = "force-dynamic";

export async function POST() {
  const { user, error } = await exigirAdmin();
  if (!user) {
    return (
      error ??
      NextResponse.json(
        { error: "Solo quien administra puede pedir el respaldo del día." },
        { status: 403 },
      )
    );
  }
  try {
    const jar = await cookies();
    const resultado = await agregarRespaldo({
      origen: "automatico",
      leerCookie: (name) => jar.get(name)?.value,
    });
    const items = await listarRespaldos((name) => jar.get(name)?.value);
    try {
      for (const c of cookiesListaRespaldos(items)) {
        jar.set(c);
      }
    } catch (cookieError) {
      console.error("respaldos diario cookie failed", cookieError);
    }
    return NextResponse.json({ ...resultado, items });
  } catch (err) {
    console.error("respaldo diario admin failed");
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "No se pudo hacer el respaldo del día.",
      },
      { status: 500 },
    );
  }
}
