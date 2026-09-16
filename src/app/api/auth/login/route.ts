import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { cookieSesion, jsonUsuario } from "@/server/auth";
import { login } from "@/server/store";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    username?: string;
    password?: string;
  } | null;
  const username = body?.username?.trim() ?? "";
  const password = body?.password ?? "";
  if (!username || !password) {
    return NextResponse.json(
      { error: "Escribe usuario y contraseña." },
      { status: 400 },
    );
  }
  const result = login(username, password);
  if (!result) {
    return NextResponse.json(
      { error: "Usuario o contraseña incorrectos." },
      { status: 401 },
    );
  }
  const jar = await cookies();
  jar.set(cookieSesion(result.token));
  return NextResponse.json({ user: jsonUsuario(result.user) });
}
