import { cookiesAsignaciones } from "@/server/asignaciones-persist";
import { cookiesCatalogos } from "@/server/catalogos-persist";
import {
  aArchivo,
  diaCalendario,
  metaPublica,
  parseArchivoRespaldo,
  recortarColeccion,
  respaldoTieneDatos,
  snapshotDesdeStore,
  yaHayAutomaticoDelDia,
  type ArchivoRespaldo,
  type OrigenRespaldo,
  type RespaldoCompleto,
  type RespaldoMeta,
} from "@/lib/respaldos";
import {
  guardarColeccionRespaldos,
  leerColeccionRespaldos,
} from "@/server/respaldos-persist";
import {
  aplicarCargaRespaldo,
  guardarAsignacionesEnStore,
  guardarCatalogosEnStore,
  hidratarCatalogos,
} from "@/server/store";

export type ResultadoNuevoRespaldo = {
  meta: RespaldoMeta;
  archivo: ReturnType<typeof aArchivo>;
  creado: boolean;
  yaHabia: boolean;
};

async function hidratar(leerCookie: (name: string) => string | undefined) {
  return hidratarCatalogos(leerCookie);
}

export async function agregarRespaldo(input: {
  origen: OrigenRespaldo;
  leerCookie: (name: string) => string | undefined;
  forzar?: boolean;
}): Promise<ResultadoNuevoRespaldo> {
  const store = await hidratar(input.leerCookie);
  const coleccion = await leerColeccionRespaldos();
  const dia = diaCalendario();
  if (
    input.origen === "automatico" &&
    !input.forzar &&
    yaHayAutomaticoDelDia(coleccion.items, dia)
  ) {
    const existente = coleccion.items.find(
      (it) => it.origen === "automatico" && it.dia === dia,
    )!;
    return {
      meta: metaPublica(existente),
      archivo: aArchivo(existente),
      creado: false,
      yaHabia: true,
    };
  }

  const nuevo = snapshotDesdeStore({
    catalogos: store.catalogos,
    productos: store.productos,
    origen: input.origen,
    sesiones: store.sesiones,
  });
  coleccion.items = recortarColeccion([nuevo, ...coleccion.items]);
  coleccion.savedAt = nuevo.createdAt;
  const remoto = await guardarColeccionRespaldos(coleccion);
  if (!remoto.vias.length) {
    throw new Error(
      "No se pudo guardar el respaldo en la app. Intenta de nuevo.",
    );
  }
  return {
    meta: metaPublica(nuevo),
    archivo: aArchivo(nuevo),
    creado: true,
    yaHabia: false,
  };
}

export async function listarRespaldos(): Promise<RespaldoMeta[]> {
  const coleccion = await leerColeccionRespaldos();
  return recortarColeccion(coleccion.items)
    .slice()
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .map(metaPublica);
}

export async function obtenerRespaldo(
  id: string,
): Promise<RespaldoCompleto | null> {
  const coleccion = await leerColeccionRespaldos();
  return coleccion.items.find((it) => it.id === id) ?? null;
}

async function aplicarArchivoRespaldo(archivo: ArchivoRespaldo) {
  if (!respaldoTieneDatos(archivo)) {
    throw new Error("Ese respaldo viene vacío. No se restauró.");
  }

  let catalogos = archivo.catalogos;
  let catalogosGuardadosEn: string | undefined;
  let cookiesCat: ReturnType<typeof cookiesCatalogos> = [];
  if (archivo.catalogos) {
    const { data } = await guardarCatalogosEnStore(archivo.catalogos);
    catalogos = data.catalogos;
    catalogosGuardadosEn = data.savedAt;
    cookiesCat = cookiesCatalogos(data);
  }

  let asignaciones = archivo.asignaciones;
  let asignacionesGuardadosEn: string | undefined;
  let cookiesAsig: ReturnType<typeof cookiesAsignaciones> = [];
  if (archivo.asignaciones) {
    const { data } = await guardarAsignacionesEnStore(archivo.asignaciones);
    asignaciones = data.asignaciones;
    asignacionesGuardadosEn = data.savedAt;
    cookiesAsig = cookiesAsignaciones(data);
  }

  aplicarCargaRespaldo({
    existencias: archivo.existencias,
    sesiones: archivo.sesiones,
  });

  return {
    catalogos,
    catalogosGuardadosEn,
    cookiesCatalogos: cookiesCat,
    asignaciones,
    asignacionesGuardadosEn,
    cookiesAsignaciones: cookiesAsig,
  };
}

export async function restaurarRespaldo(id: string) {
  const respaldo = await obtenerRespaldo(id);
  if (!respaldo) {
    throw new Error("No está esa copia. Elige otra de la lista.");
  }
  return aplicarArchivoRespaldo(aArchivo(respaldo));
}

export async function restaurarDesdeArchivo(raw: unknown) {
  const archivo = parseArchivoRespaldo(raw);
  if (!archivo) {
    throw new Error("Ese archivo no es un respaldo válido. No se restauró.");
  }
  return aplicarArchivoRespaldo(archivo);
}
