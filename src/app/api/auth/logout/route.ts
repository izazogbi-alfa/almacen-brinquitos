import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE_SESION_ANTIGUA } from "@/lib/session-cookie";
import { cookieSesionCaducada, COOKIE, tokenActual } from "@/server/auth";
import { logout } from "@/server/store";

export async function POST() {
  await logout(await tokenActual());
  const jar = await cookies();
  jar.set(cookieSesionCaducada(COOKIE));
  jar.set(cookieSesionCaducada(COOKIE_SESION_ANTIGUA));
  return NextResponse.json({ ok: true });
}
