import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  extraerAsignaciones,
  parseAsignacionesPersistidas,
} from "@/lib/asignaciones-articulos";
import { cookiesAsignaciones } from "@/server/asignaciones-persist";
import { exigirModulo } from "@/server/auth";
import {
  ERROR_ESQUEMA_NO_PERSISTIO,
  guardarAsignacionesEnStore,
  hidratarCatalogos,
} from "@/server/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { user, error } = await exigirModulo("articulos");
  if (!user) {
    return (
      error ??
      NextResponse.json({ error: "No tienes módulo de artículos." }, { status: 403 })
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = parseAsignacionesPersistidas(body);
  if (!parsed || Object.keys(parsed.asignaciones).length === 0) {
    return NextResponse.json(
      { error: "No hay esquemas de artículo para guardar." },
      { status: 400 },
    );
  }

  const jar = await cookies();
  const store = await hidratarCatalogos((name) => jar.get(name)?.value);
  const actual = store.asignacionesGuardadosEn;
  if (actual && Date.parse(actual) >= Date.parse(parsed.savedAt)) {
    return NextResponse.json({
      asignaciones: extraerAsignaciones(store.productos),
      asignacionesGuardadosEn: actual,
    });
  }

  const { data, remoto } = await guardarAsignacionesEnStore(parsed.asignaciones);
  let cookieOk = false;
  try {
    for (const c of cookiesAsignaciones(data)) {
      jar.set(c);
    }
    cookieOk = true;
  } catch (cookieError) {
    console.error("asignaciones cookie failed", cookieError);
    if (!remoto.persistio) {
      const msg =
        cookieError instanceof Error
          ? cookieError.message
          : ERROR_ESQUEMA_NO_PERSISTIO;
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }
  if (!remoto.persistio && !cookieOk) {
    return NextResponse.json(
      { error: ERROR_ESQUEMA_NO_PERSISTIO },
      { status: 500 },
    );
  }

  return NextResponse.json({
    asignaciones: data.asignaciones,
    asignacionesGuardadosEn: data.savedAt,
  });
}
