import {
  SESION_INACTIVIDAD_MS,
  sanitizarBorrador,
  sesionPendienteDe,
  sesionTieneTrabajo,
  sesionVencidaPorInactividad,
  type BorradorSesion,
  type ModuloSesion,
  type SesionCaptura,
} from "./sesion-captura";
import type { Movimiento } from "./types";

type UsuarioMin = {
  id: string;
  nombre: string;
};

export type StoreConSesiones = {
  sesiones: SesionCaptura[];
  users: UsuarioMin[];
  movimientos: Movimiento[];
  ultimoGuardado?: {
    timestamp: string;
    userId: string;
    userName: string;
  } | null;
  cierres?: unknown[];
};

type CierreLegacy = {
  id?: string;
  timestamp?: string;
  userId?: string;
  userName?: string;
  conteos?: number;
};

function pushCierre(
  store: StoreConSesiones,
  user: UsuarioMin,
  sesion: SesionCaptura,
  modulo: ModuloSesion,
) {
  store.movimientos.unshift({
    id: `mv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    userId: user.id,
    userName: user.nombre,
    timestamp: new Date().toISOString(),
    tipo: "cierre",
    cantidad:
      modulo === "existencias"
        ? sesion.conteos
        : modulo === "recepcion"
          ? sesion.entradas
          : sesion.pedidos,
    sesionId: sesion.id,
    nota: `Sesión cerrada ${
      sesion.motivoCierre === "pagina"
        ? "al salir"
        : sesion.motivoCierre === "terminada"
          ? "al terminar"
          : "por inactividad"
    } · ${modulo}`,
  });
}

export function migrarSesiones(store: StoreConSesiones) {
  const faltaba = !Array.isArray(store.sesiones);
  if (!store.sesiones) store.sesiones = [];
  const viejos = store.cierres as CierreLegacy[] | undefined;
  if (Array.isArray(viejos) && viejos.length > 0) {
    for (const c of viejos) {
      const cuando = c.timestamp || new Date().toISOString();
      store.sesiones.push({
        id: c.id || `ss-${Date.now()}`,
        modulo: "existencias",
        abiertaEn: cuando,
        ultimaActividad: cuando,
        cerradaEn: cuando,
        userId: c.userId || "desconocido",
        userName: c.userName || "—",
        conteos: c.conteos ?? 0,
        entradas: 0,
        pedidos: 0,
      });
    }
    store.cierres = [];
    return true;
  }
  store.cierres = [];
  return faltaba;
}

export function aplicarCierresPorInactividad(
  store: StoreConSesiones,
  ahora = new Date(),
  idleMs = SESION_INACTIVIDAD_MS,
): SesionCaptura[] {
  const cerradas: SesionCaptura[] = [];
  const ahoraMs = ahora.getTime();
  const iso = ahora.toISOString();
  for (const sesion of store.sesiones) {
    if (sesion.cerradaEn) continue;
    if (!sesionVencidaPorInactividad(sesion.ultimaActividad, ahoraMs, idleMs)) {
      continue;
    }
    sesion.cerradaEn = iso;
    sesion.motivoCierre = "inactividad";
    sesion.pendiente = sesionTieneTrabajo(sesion);
    const dueño =
      store.users.find((u) => u.id === sesion.userId) ?? {
        id: sesion.userId,
        nombre: sesion.userName,
      };
    pushCierre(store, dueño, sesion, sesion.modulo);
    cerradas.push(sesion);
  }
  return cerradas;
}

export function cerrarSesionModulo(
  store: StoreConSesiones,
  user: UsuarioMin,
  modulo: ModuloSesion,
  ahora = new Date(),
  opts?: { motivo?: "inactividad" | "pagina" | "terminada"; borrador?: unknown },
): SesionCaptura | null {
  aplicarCierresPorInactividad(store, ahora);
  const abierta = store.sesiones.find((s) => s.modulo === modulo && !s.cerradaEn);
  if (!abierta) return null;
  if (opts?.borrador !== undefined) {
    abierta.borrador = sanitizarBorrador(opts.borrador);
  }
  abierta.cerradaEn = ahora.toISOString();
  abierta.motivoCierre = opts?.motivo ?? "inactividad";
  abierta.pendiente = sesionTieneTrabajo(abierta);
  pushCierre(store, user, abierta, modulo);
  store.ultimoGuardado = {
    timestamp: ahora.toISOString(),
    userId: user.id,
    userName: user.nombre,
  };
  return abierta;
}

/** Cierra al salir de la página: queda pendiente si hay captura, sin esperar 10 minutos. */
export function abandonarSesionesAbiertas(
  store: StoreConSesiones,
  user: UsuarioMin,
  ahora = new Date(),
  modulo?: ModuloSesion,
  borrador?: unknown,
  borradores?: Partial<Record<ModuloSesion, unknown>>,
): SesionCaptura[] {
  const cerradas: SesionCaptura[] = [];
  const mods: ModuloSesion[] = modulo
    ? [modulo]
    : ["existencias", "pedidos", "recepcion"];
  for (const m of mods) {
    const draft = m === modulo ? borrador : borradores?.[m];
    const sesion = cerrarSesionModulo(store, user, m, ahora, {
      motivo: "pagina",
      borrador: draft,
    });
    if (sesion) cerradas.push(sesion);
  }
  return cerradas;
}

export function tocarSesionCaptura(
  store: StoreConSesiones,
  user: UsuarioMin,
  modulo: ModuloSesion,
  ahora = new Date(),
  opts?: { crearSiFalta?: boolean; borrador?: unknown },
): SesionCaptura | null {
  aplicarCierresPorInactividad(store, ahora);
  const iso = ahora.toISOString();
  const crearSiFalta = opts?.crearSiFalta !== false;
  let abierta = store.sesiones.find((s) => s.modulo === modulo && !s.cerradaEn);
  if (!abierta) {
    if (!crearSiFalta) {
      if (opts?.borrador != null) return null;
      return null;
    }
    abierta = {
      id: `ss-${ahora.getTime()}-${Math.random().toString(36).slice(2, 6)}`,
      modulo,
      abiertaEn: iso,
      ultimaActividad: iso,
      userId: user.id,
      userName: user.nombre,
      conteos: 0,
      entradas: 0,
      pedidos: 0,
    };
    store.sesiones.unshift(abierta);
  } else {
    abierta.ultimaActividad = iso;
  }
  if (opts?.borrador !== undefined) {
    abierta.borrador = sanitizarBorrador(opts.borrador);
  }
  return abierta;
}

/** Reabre la sesión pendiente del módulo. No crea un día / id nuevo. */
export function reanudarSesionPendiente(
  store: StoreConSesiones,
  user: UsuarioMin,
  modulo: ModuloSesion,
  ahora = new Date(),
  sesionId?: string,
): SesionCaptura | null {
  aplicarCierresPorInactividad(store, ahora);
  const pendiente = sesionId
    ? store.sesiones.find(
        (s) =>
          s.id === sesionId &&
          s.modulo === modulo &&
          Boolean(s.cerradaEn) &&
          s.pendiente,
      )
    : sesionPendienteDe(store.sesiones, modulo);
  if (!pendiente) return null;
  const abierta = store.sesiones.find((s) => s.modulo === modulo && !s.cerradaEn);
  if (abierta && abierta.id !== pendiente.id) {
    cerrarSesionModulo(store, user, modulo, ahora, { motivo: "pagina" });
  }
  delete pendiente.cerradaEn;
  delete pendiente.motivoCierre;
  pendiente.pendiente = false;
  pendiente.ultimaActividad = ahora.toISOString();
  pendiente.userId = user.id;
  pendiente.userName = user.nombre;
  return pendiente;
}

/** Cierra la captura abierta como archivo (ya terminada), no como pendiente. */
export function terminarSesionModulo(
  store: StoreConSesiones,
  user: UsuarioMin,
  modulo: ModuloSesion,
  ahora = new Date(),
): SesionCaptura | null {
  aplicarCierresPorInactividad(store, ahora);
  const abierta = store.sesiones.find((s) => s.modulo === modulo && !s.cerradaEn);
  if (!abierta) return null;
  if (!sesionTieneTrabajo(abierta)) return null;
  abierta.cerradaEn = ahora.toISOString();
  abierta.motivoCierre = "terminada";
  abierta.pendiente = false;
  store.ultimoGuardado = {
    timestamp: ahora.toISOString(),
    userId: user.id,
    userName: user.nombre,
  };
  return abierta;
}

/** Quita solo esa captura a medias. No toca catálogo ni movimientos ya guardados. */
export function borrarSesionPendiente(
  store: StoreConSesiones,
  sesionId: string,
): SesionCaptura | null {
  const i = store.sesiones.findIndex(
    (s) => s.id === sesionId && Boolean(s.cerradaEn) && s.pendiente,
  );
  if (i < 0) return null;
  const [quitada] = store.sesiones.splice(i, 1);
  return quitada ?? null;
}

/** Quita solo esa captura ya terminada del archivo. No toca catálogo ni piso. */
export function borrarSesionTerminada(
  store: StoreConSesiones,
  sesionId: string,
): SesionCaptura | null {
  const i = store.sesiones.findIndex(
    (s) =>
      s.id === sesionId &&
      Boolean(s.cerradaEn) &&
      !s.pendiente &&
      sesionTieneTrabajo(s),
  );
  if (i < 0) return null;
  const [quitada] = store.sesiones.splice(i, 1);
  return quitada ?? null;
}

export type { BorradorSesion };
