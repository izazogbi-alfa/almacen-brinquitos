import {
  SESION_INACTIVIDAD_MS,
  sesionVencidaPorInactividad,
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
    nota: `Sesión cerrada por inactividad · ${modulo}`,
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
): SesionCaptura | null {
  aplicarCierresPorInactividad(store, ahora);
  const abierta = store.sesiones.find((s) => s.modulo === modulo && !s.cerradaEn);
  if (!abierta) return null;
  abierta.cerradaEn = ahora.toISOString();
  abierta.motivoCierre = "inactividad";
  pushCierre(store, user, abierta, modulo);
  store.ultimoGuardado = {
    timestamp: ahora.toISOString(),
    userId: user.id,
    userName: user.nombre,
  };
  return abierta;
}

export function tocarSesionCaptura(
  store: StoreConSesiones,
  user: UsuarioMin,
  modulo: ModuloSesion,
  ahora = new Date(),
): SesionCaptura {
  aplicarCierresPorInactividad(store, ahora);
  const iso = ahora.toISOString();
  let abierta = store.sesiones.find((s) => s.modulo === modulo && !s.cerradaEn);
  if (!abierta) {
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
  return abierta;
}
