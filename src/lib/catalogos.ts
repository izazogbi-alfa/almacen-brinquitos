import { TALLAS_LETRA, TALLAS_NINO, TALLAS_XC1092 } from "@/lib/sucursales";
import { agregarUnicos } from "@/lib/listas";
import {
  listaTallas,
  listaTitulo,
  nombreArticuloAlGuardar,
  tituloEtiqueta,
} from "@/lib/titulo-etiqueta";
import { elegirEstiloPdf, parseEstiloPdf } from "@/lib/pdf-estilo";
import type { Catalogos, EsquemaCatalogo, Producto } from "@/lib/types";

/** Solo para detectar la semilla de fábrica; no se asigna a artículos ni se restaura al arrancar. */
export const ESQUEMAS_INICIALES: EsquemaCatalogo[] = [
  {
    id: "nino",
    nombre: "Ropa de Niño",
    tallas: listaTallas([...TALLAS_NINO]),
  },
  {
    id: "letra",
    nombre: "Talla de Letra",
    tallas: listaTallas([...TALLAS_LETRA]),
  },
  {
    id: "accesorio",
    nombre: "Accesorio",
    tallas: [],
  },
];

const COLORES_INICIALES = [
  "Único",
  "Blanco",
  "Rosa",
  "Azul",
  "Rojo",
  "Negro",
  "Beige",
  "Verde",
  "Amarillo",
  "Gris",
];

function tallasIguales(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  return a.every((t, i) => t === b[i]);
}

export function esEsquemaDeFabrica(esquema: EsquemaCatalogo): boolean {
  const fab = ESQUEMAS_INICIALES.find((e) => e.id === esquema.id);
  if (!fab) return false;
  return fab.nombre === esquema.nombre && tallasIguales(fab.tallas, esquema.tallas);
}

export const NOMBRE_EMPRESA_DEFAULT = "Brinquitos";
const LOGO_MAX = 40_000;

function sanitizarLogo(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const t = raw.trim();
  if (!t) return undefined;
  if (t.startsWith("data:image/")) {
    if (t.length > LOGO_MAX) return undefined;
    return t;
  }
  if (/^https:\/\//i.test(t) && t.length < 2048) return t;
  return undefined;
}

export function nombreEmpresa(
  catalogos?: Pick<Catalogos, "empresaNombre"> | null,
) {
  const n = catalogos?.empresaNombre?.trim();
  return n || NOMBRE_EMPRESA_DEFAULT;
}

function listasTextoIguales(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  return a.every((x, i) => x === b[i]);
}

export function coloresDeFabrica(): string[] {
  return listaTitulo(COLORES_INICIALES);
}

export function tallasDeFabrica(): string[] {
  return listaTallas(agregarUnicos([...TALLAS_XC1092], [...TALLAS_LETRA]));
}

export function esColoresDeFabrica(colores: string[]): boolean {
  return listasTextoIguales(listaTitulo(colores), coloresDeFabrica());
}

export function esTallasDeFabrica(tallas: string[]): boolean {
  return listasTextoIguales(listaTallas(tallas), tallasDeFabrica());
}

export function catalogosVacios(): Catalogos {
  return {
    esquemas: [],
    colores: coloresDeFabrica(),
    tallas: tallasDeFabrica(),
    especificaciones: [],
  };
}

export function normalizarCatalogos(raw?: Catalogos | null): Catalogos {
  const base = catalogosVacios();
  if (!raw) return base;
  const esquemas = Array.isArray(raw.esquemas)
    ? raw.esquemas
        .filter((e) => e && typeof e === "object")
        .map((e) => {
          const estiloPdf = elegirEstiloPdf(e.estiloPdf);
          return {
            id: e.id?.trim() || `esq-${Date.now()}`,
            nombre: tituloEtiqueta(e.nombre?.trim() || "Esquema"),
            tallas: listaTallas(Array.isArray(e.tallas) ? e.tallas : []),
            ...(estiloPdf ? { estiloPdf } : {}),
          };
        })
        .filter((e) => !esEsquemaDeFabrica(e))
    : [];
  const empresaNombre = raw.empresaNombre?.trim().slice(0, 80);
  const logoDataUrl = sanitizarLogo(raw.logoDataUrl);
  return {
    esquemas,
    colores: Array.isArray(raw.colores)
      ? listaTitulo(raw.colores)
      : base.colores,
    tallas: Array.isArray(raw.tallas) ? listaTallas(raw.tallas) : base.tallas,
    especificaciones: Array.isArray(raw.especificaciones)
      ? listaTitulo(raw.especificaciones)
      : [],
    ...(empresaNombre ? { empresaNombre } : {}),
    ...(logoDataUrl ? { logoDataUrl } : {}),
  };
}

export function esquemaPorId(
  catalogos: Catalogos,
  id?: string | null,
): EsquemaCatalogo | undefined {
  if (!id) return undefined;
  return catalogos.esquemas.find((e) => e.id === id);
}

export function claveNombreEsquema(nombre: string): string {
  return tituloEtiqueta(nombre).toLocaleLowerCase("es");
}

/** Otro esquema con el mismo nombre (recortes, mayúsculas). No compara el propio id. */
export function esquemaConNombreRepetido(
  esquemas: EsquemaCatalogo[],
  nombre: string,
  exceptoId?: string,
): EsquemaCatalogo | undefined {
  const clave = claveNombreEsquema(nombre);
  if (!clave) return undefined;
  return esquemas.find(
    (e) =>
      e.id !== exceptoId && claveNombreEsquema(e.nombre) === clave,
  );
}

export function nombreEsquemaDuplicado(
  esquemas: EsquemaCatalogo[],
  nombre: string,
  exceptoId?: string,
): boolean {
  return Boolean(esquemaConNombreRepetido(esquemas, nombre, exceptoId));
}

export function mensajeNombreEsquemaDuplicado(
  esquemas: EsquemaCatalogo[],
  nombre: string,
  exceptoId?: string,
): string | null {
  const otro = esquemaConNombreRepetido(esquemas, nombre, exceptoId);
  if (!otro) return null;
  return `Ya hay un esquema llamado «${otro.nombre}». Ábrelo en la lista o elige otro nombre.`;
}

export function clonarEsquemaCatalogo(
  origen: EsquemaCatalogo,
  esquemas: EsquemaCatalogo[],
): EsquemaCatalogo {
  const base = tituloEtiqueta(`Copia De ${origen.nombre}`) || "Copia De Esquema";
  let nombre = base;
  let n = 2;
  while (nombreEsquemaDuplicado(esquemas, nombre)) {
    nombre = tituloEtiqueta(`${base} ${n}`);
    n += 1;
  }
  const estiloPdf = elegirEstiloPdf(origen.estiloPdf);
  return {
    id: `esq-${Date.now()}`,
    nombre,
    tallas: [...origen.tallas],
    ...(estiloPdf ? { estiloPdf } : {}),
  };
}

export function tallasDeEsquema(
  catalogos: Catalogos,
  esquemaId?: string | null,
): string[] {
  const esquema = esquemaPorId(catalogos, esquemaId);
  if (!esquema) return [];
  return esquema.tallas;
}

export function estiloPdfDeArticulo(
  producto: Pick<Producto, "esquemaConteo"> | undefined,
  catalogos: Catalogos,
) {
  const esquema = esquemaPorId(catalogos, producto?.esquemaConteo);
  return parseEstiloPdf(esquema?.estiloPdf);
}

function esIdEsquemaFabrica(id: string) {
  return ESQUEMAS_INICIALES.some((e) => e.id === id);
}

/** Quita esquema de fábrica y tallas copiadas de esa semilla. Colores se quedan.
 *  No borra una asignación de Iza solo porque el catálogo aún no hidrató. */
export function sanitizarArticuloSinFabrica(
  producto: Producto,
  catalogos: Catalogos,
): Producto {
  const id = producto.esquemaConteo?.trim();
  if (id && esquemaPorId(catalogos, id)) {
    return normalizarEtiquetasProducto(producto);
  }
  if (id && !esIdEsquemaFabrica(id)) {
    return normalizarEtiquetasProducto(producto);
  }
  if (!id && !producto.tallas?.length) {
    return normalizarEtiquetasProducto(producto);
  }
  return normalizarEtiquetasProducto({
    ...producto,
    esquemaConteo: undefined,
    tallas: [],
  });
}

export function normalizarEtiquetasProducto(producto: Producto): Producto {
  return {
    ...producto,
    nombre: nombreArticuloAlGuardar(producto.nombre ?? ""),
    colores: listaTitulo(producto.colores ?? []),
    tallas: listaTallas(producto.tallas ?? []),
    especificaciones: listaTitulo(producto.especificaciones ?? []),
  };
}
