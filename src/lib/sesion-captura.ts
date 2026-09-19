export const SESION_INACTIVIDAD_MS = 10 * 60 * 1000;

export type ModuloSesion = "existencias" | "pedidos" | "recepcion";

export type ParBorrador = { talla: string; cantidad: number };

export type LineaBorrador = {
  key: string;
  productoId: string;
  sku: string;
  nombre: string;
  color: string;
  especificacion?: string;
  sucursalId: string;
  sucursalNombre: string;
  pares: ParBorrador[];
};

export type BorradorSesion = {
  sucursalId?: string;
  proveedor?: string;
  notasPedido?: string;
  lineas: LineaBorrador[];
};

export type SesionCaptura = {
  id: string;
  modulo: ModuloSesion;
  abiertaEn: string;
  ultimaActividad: string;
  cerradaEn?: string;
  userId: string;
  userName: string;
  motivoCierre?: "inactividad";
  /** Cerrada por inactividad con trabajo; se retoma con el botón, no con una sesión nueva. */
  pendiente?: boolean;
  conteos: number;
  entradas: number;
  pedidos: number;
  borrador?: BorradorSesion;
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

export function piezasDeSesion(sesion: SesionCaptura) {
  if (sesion.modulo === "existencias") return sesion.conteos;
  if (sesion.modulo === "recepcion") return sesion.entradas;
  return sesion.pedidos;
}

export function sesionTieneTrabajo(sesion: SesionCaptura) {
  if (piezasDeSesion(sesion) > 0) return true;
  return (sesion.borrador?.lineas.length ?? 0) > 0;
}

/** Cerrada, con captura, y no “terminada”: se puede retomar el mismo id. */
export function sesionPendienteDe(
  sesiones: SesionCaptura[],
  modulo: ModuloSesion,
) {
  return sesiones.find(
    (s) => s.modulo === modulo && Boolean(s.cerradaEn) && s.pendiente,
  );
}

export function etiquetaBotonPendiente(
  cerradaEn: string,
  ahora = new Date(),
) {
  const diaMexico = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Mexico_City",
    }).format(d);
  const diaCierre = diaMexico(new Date(cerradaEn));
  const hoy = diaMexico(ahora);
  if (diaCierre < hoy) return "Pendiente de ayer";
  return "Continuar pendiente";
}

function textoCorto(valor: unknown, max = 120) {
  if (typeof valor !== "string") return undefined;
  const t = valor.trim();
  if (!t) return undefined;
  return t.slice(0, max);
}

export function sanitizarBorrador(raw: unknown): BorradorSesion | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const crudas = Array.isArray(o.lineas) ? o.lineas.slice(0, 200) : [];
  const lineas: LineaBorrador[] = [];
  for (const item of crudas) {
    if (!item || typeof item !== "object") continue;
    const ln = item as Record<string, unknown>;
    const paresIn = Array.isArray(ln.pares) ? ln.pares.slice(0, 80) : [];
    const pares: ParBorrador[] = [];
    for (const p of paresIn) {
      if (!p || typeof p !== "object") continue;
      const par = p as Record<string, unknown>;
      const cantidad = Number(par.cantidad);
      if (!Number.isFinite(cantidad) || cantidad < 0) continue;
      pares.push({
        talla: String(par.talla ?? "").slice(0, 24),
        cantidad,
      });
    }
    lineas.push({
      key: String(ln.key ?? "").slice(0, 80) || `ln-${lineas.length}`,
      productoId: String(ln.productoId ?? "").slice(0, 80),
      sku: String(ln.sku ?? "").slice(0, 40),
      nombre: String(ln.nombre ?? "").slice(0, 120),
      color: String(ln.color ?? "Único").slice(0, 40),
      especificacion: textoCorto(ln.especificacion, 40),
      sucursalId: String(ln.sucursalId ?? "").slice(0, 40),
      sucursalNombre: String(ln.sucursalNombre ?? "").slice(0, 80),
      pares,
    });
  }
  return {
    sucursalId: textoCorto(o.sucursalId, 40),
    proveedor: textoCorto(o.proveedor, 80),
    notasPedido: textoCorto(o.notasPedido, 200),
    lineas,
  };
}

export function sesionesParaCliente(
  sesiones: SesionCaptura[],
  limite = 40,
) {
  const seen = new Set<string>();
  const out: SesionCaptura[] = [];
  const push = (s?: SesionCaptura) => {
    if (!s || seen.has(s.id)) return;
    seen.add(s.id);
    out.push(s);
  };
  const mods: ModuloSesion[] = ["existencias", "pedidos", "recepcion"];
  for (const m of mods) {
    push(sesionAbiertaDe(sesiones, m));
    push(sesionPendienteDe(sesiones, m));
  }
  for (const s of sesiones) {
    if (out.length >= limite) break;
    push(s);
  }
  return out;
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
