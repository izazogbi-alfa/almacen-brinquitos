/** Hub de Configuración. Agrega un ítem aquí y su página para un botón nuevo. */
export const SECCIONES_CONFIGURACION = [
  {
    slug: "listas-de-captura",
    href: "/admin/configuracion/listas-de-captura",
    titulo: "Listas de captura",
    detalle: "Esquemas, colores, tallas y especificaciones que se eligen al capturar.",
    soloAdmin: false,
  },
  {
    slug: "respaldos",
    href: "/admin/configuracion/respaldos",
    titulo: "Respaldos",
    detalle: "Copia diaria, Guardar ahora y Restaurar respaldo.",
    soloAdmin: true,
  },
  {
    slug: "informe",
    href: "/admin/configuracion/informe",
    titulo: "Informe PDF",
    detalle: "Subir logo y cambiar el nombre que sale en el encabezado.",
    soloAdmin: false,
  },
  {
    slug: "actualizar-catalogo",
    href: "/admin/configuracion/actualizar-catalogo",
    titulo: "Actualizar catálogo",
    detalle: "Excel o CSV: actualiza nombre y foto por Clave, sin borrar lo capturado.",
    soloAdmin: true,
  },
] as const;

/** Dentro de Listas de captura. No mezclar módulos nuevos de Configuración aquí. */
export const LISTAS_CAPTURA = [
  {
    slug: "esquemas",
    href: "/admin/configuracion/listas-de-captura/esquemas",
    titulo: "Esquemas de conteo",
    detalle: "Tú los armas. Empiezan vacíos, sin niño 0–60 de fábrica.",
  },
  {
    slug: "colores",
    href: "/admin/configuracion/listas-de-captura/colores",
    titulo: "Colores",
    detalle: "Colores que se eligen al capturar.",
  },
  {
    slug: "tallas",
    href: "/admin/configuracion/listas-de-captura/tallas",
    titulo: "Tallas",
    detalle: "Catálogo general de tallas.",
  },
  {
    slug: "especificaciones",
    href: "/admin/configuracion/listas-de-captura/especificaciones",
    titulo: "Especificaciones",
    detalle: "Notas: manga, forro, paquete, etc.",
  },
] as const;

export const HREF_CONFIGURACION = "/admin/configuracion";
export const HREF_LISTAS_CAPTURA = "/admin/configuracion/listas-de-captura";
