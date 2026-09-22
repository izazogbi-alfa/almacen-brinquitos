import type { ModuloSesion } from "@/lib/sesion-captura";

/** Hub de Registros (`/pendientes`). Un botón por módulo de captura, no una sola lista. */
export const SECCIONES_PENDIENTES = [
  {
    slug: "existencias" as const,
    modulo: "existencias" as ModuloSesion,
    href: "/pendientes/existencias",
    titulo: "Existencias pendientes",
    detalle: "En curso. Fecha y sucursal. Continuar o borrar.",
  },
  {
    slug: "recepcion" as const,
    modulo: "recepcion" as ModuloSesion,
    href: "/pendientes/recepcion",
    titulo: "Recepción pendientes",
    detalle: "En curso. Fecha y sucursal. Continuar o borrar.",
  },
  {
    slug: "pedidos" as const,
    modulo: "pedidos" as ModuloSesion,
    href: "/pendientes/pedidos",
    titulo: "Pedidos pendientes",
    detalle: "En curso. Fecha y sucursal. Continuar o borrar.",
  },
] as const;

/** Archivo de capturas ya cerradas con trabajo (no pendientes). */
export const SECCIONES_TERMINADAS = [
  {
    slug: "existencias-terminadas" as const,
    modulo: "existencias" as ModuloSesion,
    href: "/pendientes/existencias/terminadas",
    titulo: "Existencias ya terminadas",
    detalle: "Terminados. Fecha y sucursal. PDF, borrar; Iza puede pasar a pendientes.",
  },
  {
    slug: "recepcion-terminadas" as const,
    modulo: "recepcion" as ModuloSesion,
    href: "/pendientes/recepcion/terminadas",
    titulo: "Recepción ya terminada",
    detalle: "Terminados. Fecha y sucursal. PDF, borrar; Iza puede pasar a pendientes.",
  },
  {
    slug: "pedidos-terminados" as const,
    modulo: "pedidos" as ModuloSesion,
    href: "/pendientes/pedidos/terminadas",
    titulo: "Pedidos ya terminados",
    detalle: "Terminados. Fecha y sucursal. PDF, borrar; Iza puede pasar a pendientes.",
  },
] as const;

export const HREF_PENDIENTES = "/pendientes";

export function seccionPendienteDe(modulo: ModuloSesion) {
  return SECCIONES_PENDIENTES.find((s) => s.modulo === modulo)!;
}

export function seccionTerminadaDe(modulo: ModuloSesion) {
  return SECCIONES_TERMINADAS.find((s) => s.modulo === modulo)!;
}
