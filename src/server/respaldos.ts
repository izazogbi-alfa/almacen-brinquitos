import { cookiesAsignaciones } from "@/server/asignaciones-persist";
import { cookiesCatalogos } from "@/server/catalogos-persist";
import {
  aArchivo,
  diaCalendario,
  metaPublica,
  recortarColeccion,
  snapshotDesdeStore,
  yaHayAutomaticoDelDia,
  type OrigenRespaldo,
  type RespaldoCompleto,
  type RespaldoMeta,
} from "@/lib/respaldos";
import {
  guardarColeccionRespaldos,
  leerColeccionRespaldos,
} from "@/server/respaldos-persist";
import {
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

export async function restaurarRespaldo(id: string) {
  const respaldo = await obtenerRespaldo(id);
  if (!respaldo) {
    throw new Error("No está esa copia. Elige otra de la lista.");
  }
  const { data: catalogosData } = await guardarCatalogosEnStore(
    respaldo.catalogos,
  );
  const { data: asigData } = await guardarAsignacionesEnStore(
    respaldo.asignaciones,
  );
  return {
    catalogos: catalogosData.catalogos,
    catalogosGuardadosEn: catalogosData.savedAt,
    cookiesCatalogos: cookiesCatalogos(catalogosData),
    asignaciones: asigData.asignaciones,
    asignacionesGuardadosEn: asigData.savedAt,
    cookiesAsignaciones: cookiesAsignaciones(asigData),
  };
}
