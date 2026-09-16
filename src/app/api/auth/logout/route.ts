import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE, tokenActual } from "@/server/auth";
import { logout } from "@/server/store";

export async function POST() {
  logout(await tokenActual());
  const jar = await cookies();
  jar.delete(COOKIE);
  return NextResponse.json({ ok: true });
}
