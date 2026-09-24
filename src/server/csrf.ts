import { NextResponse } from "next/server";

function origenPermitido(request: Request, host: string): boolean {
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    (host.includes("localhost") ? "http" : "https");
  const permitidos = new Set([
    `${proto}://${host}`,
    `http://${host}`,
    `https://${host}`,
  ]);

  const origin = request.headers.get("origin");
  if (origin) return permitidos.has(origin);

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      const url = new URL(referer);
      return url.host === host;
    } catch {
      return false;
    }
  }

  return false;
}

/** Origin/referer check for cookie-authenticated mutating requests (same site). */
export function csrfValido(request: Request): boolean {
  const host = request.headers.get("host");
  if (!host) return false;
  return origenPermitido(request, host);
}

export function rechazarCsrf() {
  return NextResponse.json({ error: "Solicitud no permitida." }, { status: 403 });
}
