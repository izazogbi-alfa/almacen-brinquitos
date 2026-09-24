import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { exigirAdmin, exigirCsrf } from "@/server/auth";
import { restaurarDesdeArchivo } from "@/server/respaldos";
import { contrasenaCoincide } from "@/server/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { user, error } = await exigirAdmin();
  if (!user) {
    return (
      error ??
      NextResponse.json(
        { error: "Solo quien administra puede restaurar." },
        { status: 403 },
      )
    );
  }
  const csrf = exigirCsrf(request);
  if (csrf.error) return csrf.error;

  const body = (await request.json().catch(() => null)) as {
    password?: unknown;
    archivo?: unknown;
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
        { error: "Contraseña incorrecta. No se restauró." },
        { status: 401 },
      );
    }
  } catch {
    console.error("respaldo file restore password failed");
    return NextResponse.json(
      { error: "No se pudo comprobar la contraseña. No se restauró." },
      { status: 500 },
    );
  }

  try {
    const restaurado = await restaurarDesdeArchivo(body?.archivo);
    const jar = await cookies();
    try {
      for (const c of restaurado.cookiesCatalogos) jar.set(c);
      for (const c of restaurado.cookiesAsignaciones) jar.set(c);
    } catch (cookieError) {
      console.error("restore file cookies failed", cookieError);
    }
    return NextResponse.json({
      ok: true,
      catalogos: restaurado.catalogos,
      catalogosGuardadosEn: restaurado.catalogosGuardadosEn,
      asignaciones: restaurado.asignaciones,
      asignacionesGuardadosEn: restaurado.asignacionesGuardadosEn,
      restauroExistencias: restaurado.restauroExistencias,
      restauroSesiones: restaurado.restauroSesiones,
    });
  } catch (err) {
    console.error("respaldo file restore failed");
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "No se pudo restaurar. Nada se cambió.",
      },
      { status: 400 },
    );
  }
}
