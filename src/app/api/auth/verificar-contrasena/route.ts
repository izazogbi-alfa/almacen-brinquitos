import { NextResponse } from "next/server";
import { exigirUsuario } from "@/server/auth";
import { contrasenaCoincide } from "@/server/store";

export async function POST(request: Request) {
  const { user, error } = await exigirUsuario();
  if (!user) {
    return (
      error ??
      NextResponse.json(
        { error: "Inicia sesión para continuar." },
        { status: 401 },
      )
    );
  }

  const body = (await request.json().catch(() => null)) as {
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
        { error: "Contraseña incorrecta. No se quitó." },
        { status: 401 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch {
    console.error("password verify failed");
    return NextResponse.json(
      {
        error:
          "No se pudo comprobar la contraseña. No se quitó.",
      },
      { status: 500 },
    );
  }
}
