import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE_SESION } from "@/lib/session-cookie";
import { puede } from "@/lib/modulos";
import type { ClaveModulo } from "@/lib/types";
import {
  hidratarUsuarios,
  publicoDe,
  usuarioPorSesion,
  type UsuarioInterno,
} from "@/server/store";

export const COOKIE = COOKIE_SESION;

export async function tokenActual() {
  const jar = await cookies();
  return jar.get(COOKIE)?.value;
}

export async function usuarioActual() {
  const jar = await cookies();
  await hidratarUsuarios((name) => jar.get(name)?.value);
  return usuarioPorSesion(await tokenActual());
}

function atributosCookie() {
  const https =
    process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: https,
  };
}

/** Cookie de sesión: se borra al cerrar el navegador (sin Max-Age). */
export function cookieSesion(token: string) {
  return {
    name: COOKIE,
    value: token,
    ...atributosCookie(),
  };
}

export function cookieSesionCaducada(name: string = COOKIE) {
  return {
    name,
    value: "",
    ...atributosCookie(),
    maxAge: 0,
    expires: new Date(0),
  };
}

export async function exigirUsuario() {
  const user = await usuarioActual();
  if (!user) {
    return {
      user: null as UsuarioInterno | null,
      error: NextResponse.json(
        { error: "Inicia sesión para continuar." },
        { status: 401 },
      ),
    };
  }
  return { user, error: null };
}

export async function exigirAdmin() {
  const { user, error } = await exigirUsuario();
  if (error || !user) return { user: null, error };
  if (user.rol !== "admin") {
    return {
      user: null,
      error: NextResponse.json(
        { error: "Solo quien administra puede hacer esto." },
        { status: 403 },
      ),
    };
  }
  return { user, error: null };
}

export async function exigirModulo(modulo: ClaveModulo) {
  const { user, error } = await exigirUsuario();
  if (error || !user) return { user: null, error };
  if (!puede(publicoDe(user), modulo)) {
    return {
      user: null,
      error: NextResponse.json(
        { error: "No tienes este módulo." },
        { status: 403 },
      ),
    };
  }
  return { user, error: null };
}

export function jsonUsuario(user: UsuarioInterno) {
  return publicoDe(user);
}
