import type { BorradorSesion, ModuloSesion } from "@/lib/sesion-captura";

const borradorAlSalir: Partial<Record<ModuloSesion, BorradorSesion>> = {};

export function recordarBorradorAlSalir(
  modulo: ModuloSesion,
  borrador: BorradorSesion | undefined,
) {
  if (borrador) borradorAlSalir[modulo] = borrador;
}

/** Cierra la captura al salir: keepalive/beacon, sin esperar 10 minutos. */
export function enviarAbandonoPagina(modulo?: ModuloSesion) {
  if (typeof window === "undefined") return;
  const body = JSON.stringify({
    accion: "abandonar-pagina",
    modulo,
    borrador: modulo ? borradorAlSalir[modulo] : undefined,
    borradores: modulo ? undefined : borradorAlSalir,
  });
  try {
    void fetch("/api/acciones", {
      method: "POST",
      credentials: "include",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body,
    });
  } catch {
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/acciones",
        new Blob([body], { type: "application/json" }),
      );
    }
  }
}
