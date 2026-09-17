/** Hub de Configuración. Agrega un ítem aquí y su página para un botón nuevo. */
export const SECCIONES_CONFIGURACION = [
  {
    slug: "esquemas",
    href: "/admin/configuracion/esquemas",
    titulo: "Esquemas de conteo",
    detalle: "Cómo se cuenta: niño, letra, accesorio u otro.",
  },
  {
    slug: "colores",
    href: "/admin/configuracion/colores",
    titulo: "Colores",
    detalle: "Colores que se eligen al capturar.",
  },
  {
    slug: "tallas",
    href: "/admin/configuracion/tallas",
    titulo: "Tallas",
    detalle: "Catálogo general de tallas.",
  },
  {
    slug: "especificaciones",
    href: "/admin/configuracion/especificaciones",
    titulo: "Especificaciones",
    detalle: "Notas: manga, forro, paquete, etc.",
  },
] as const;

export const HREF_CONFIGURACION = "/admin/configuracion";
