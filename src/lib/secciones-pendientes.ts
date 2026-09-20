import type { ModuloSesion } from "@/lib/sesion-captura";

/** Hub de Pendientes. Un botón por módulo de captura, no una sola lista. */
export const SECCIONES_PENDIENTES = [
  {
    slug: "existencias" as const,
    modulo: "existencias" as ModuloSesion,
    href: "/pendientes/existencias",
    titulo: "Existencias pendientes",
    detalle: "Capturas a medias de existencias. Busca, sigue o borra.",
  },
  {
    slug: "recepcion" as const,
    modulo: "recepcion" as ModuloSesion,
    href: "/pendientes/recepcion",
    titulo: "Recepción pendientes",
    detalle: "Capturas a medias de entrada. Busca, sigue o borra.",
  },
  {
    slug: "pedidos" as const,
    modulo: "pedidos" as ModuloSesion,
    href: "/pendientes/pedidos",
    titulo: "Pedidos pendientes",
    detalle: "Capturas a medias de pedidos. Busca, sigue o borra.",
  },
] as const;

/** Archivo de capturas ya cerradas con trabajo (no pendientes). */
export const SECCIONES_TERMINADAS = [
  {
    slug: "existencias-terminadas" as const,
    modulo: "existencias" as ModuloSesion,
    href: "/pendientes/existencias/terminadas",
    titulo: "Existencias ya terminadas",
    detalle: "Capturas de existencias que ya cerraste. Busca o borra.",
  },
  {
    slug: "recepcion-terminadas" as const,
    modulo: "recepcion" as ModuloSesion,
    href: "/pendientes/recepcion/terminadas",
    titulo: "Recepción ya terminada",
    detalle: "Entradas que ya cerraste. Busca o borra.",
  },
  {
    slug: "pedidos-terminados" as const,
    modulo: "pedidos" as ModuloSesion,
    href: "/pendientes/pedidos/terminadas",
    titulo: "Pedidos ya terminados",
    detalle: "Pedidos que ya cerraste. Busca o borra.",
  },
] as const;

export const HREF_PENDIENTES = "/pendientes";

export function seccionPendienteDe(modulo: ModuloSesion) {
  return SECCIONES_PENDIENTES.find((s) => s.modulo === modulo)!;
}

export function seccionTerminadaDe(modulo: ModuloSesion) {
  return SECCIONES_TERMINADAS.find((s) => s.modulo === modulo)!;
}
