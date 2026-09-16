import { NextResponse } from "next/server";
import { jsonUsuario, usuarioActual } from "@/server/auth";

export async function GET() {
  const user = await usuarioActual();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({ user: jsonUsuario(user) });
}
