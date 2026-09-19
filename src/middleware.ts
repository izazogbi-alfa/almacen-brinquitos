import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_SESION, COOKIE_SESION_ANTIGUA } from "@/lib/session-cookie";

function respuestaConLimpieza(request: NextRequest, response: NextResponse) {
  const https = request.nextUrl.protocol === "https:";
  if (request.cookies.has(COOKIE_SESION_ANTIGUA)) {
    response.cookies.set({
      name: COOKIE_SESION_ANTIGUA,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
      secure: https,
    });
  }
  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sesion = request.cookies.get(COOKIE_SESION)?.value?.trim();

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/productos") ||
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/cron/") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.webmanifest"
  ) {
    return respuestaConLimpieza(request, NextResponse.next());
  }

  if (pathname === "/login") {
    if (sesion) {
      return respuestaConLimpieza(
        request,
        NextResponse.redirect(new URL("/", request.url)),
      );
    }
    const login = NextResponse.next();
    login.headers.set("Cache-Control", "no-store");
    return respuestaConLimpieza(request, login);
  }

  if (!sesion) {
    if (pathname.startsWith("/api/")) {
      return respuestaConLimpieza(
        request,
        NextResponse.json(
          { error: "Inicia sesión para continuar." },
          { status: 401 },
        ),
      );
    }
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    const redirect = NextResponse.redirect(url);
    redirect.headers.set("Cache-Control", "no-store");
    return respuestaConLimpieza(request, redirect);
  }

  return respuestaConLimpieza(request, NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
