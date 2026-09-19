export const SESION_INACTIVIDAD_MS = 10 * 60 * 1000;

export type ModuloSesion = "existencias" | "pedidos" | "recepcion";

export type SesionCaptura = {
  id: string;
  modulo: ModuloSesion;
  abiertaEn: string;
  ultimaActividad: string;
  cerradaEn?: string;
  userId: string;
  userName: string;
  motivoCierre?: "inactividad";
  conteos: number;
  entradas: number;
  pedidos: number;
};

export function esModuloSesion(valor: unknown): valor is ModuloSesion {
  return valor === "existencias" || valor === "pedidos" || valor === "recepcion";
}

export function sesionEstaAbierta(sesion: SesionCaptura) {
  return !sesion.cerradaEn;
}

export function sesionVencidaPorInactividad(
  ultimaActividad: string,
  ahoraMs: number,
  idleMs = SESION_INACTIVIDAD_MS,
) {
  const ultimo = Date.parse(ultimaActividad);
  if (!Number.isFinite(ultimo)) return true;
  return ahoraMs - ultimo >= idleMs;
}

export function msHastaCierre(
  ultimaActividad: string,
  ahoraMs: number,
  idleMs = SESION_INACTIVIDAD_MS,
) {
  const ultimo = Date.parse(ultimaActividad);
  if (!Number.isFinite(ultimo)) return 0;
  return Math.max(0, idleMs - (ahoraMs - ultimo));
}

export function sesionAbiertaDe(
  sesiones: SesionCaptura[],
  modulo: ModuloSesion,
) {
  return sesiones.find((s) => s.modulo === modulo && sesionEstaAbierta(s));
}

export function sesionVisibleHoy(
  sesiones: SesionCaptura[],
  modulo: ModuloSesion,
) {
  const abierta = sesionAbiertaDe(sesiones, modulo);
  if (abierta) return abierta;
  return sesiones.find((s) => s.modulo === modulo && s.cerradaEn);
}

/** En desarrollo, `?idleMs=8000` acorta el temporizador del navegador para probar el aviso. */
export function idleMsCliente() {
  if (typeof window === "undefined") return SESION_INACTIVIDAD_MS;
  if (process.env.NODE_ENV === "production") return SESION_INACTIVIDAD_MS;
  const crudo = new URLSearchParams(window.location.search).get("idleMs");
  const n = Number(crudo);
  if (Number.isFinite(n) && n >= 3000) return n;
  return SESION_INACTIVIDAD_MS;
}
