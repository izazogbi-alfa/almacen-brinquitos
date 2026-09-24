type Bucket = { count: number; resetAt: number };

const VENTANA_MS = 15 * 60 * 1000;
const MAX_POR_USUARIO = 8;
const MAX_POR_IP = 40;

const porUsuario = new Map<string, Bucket>();
const porIp = new Map<string, Bucket>();

function tocar(mapa: Map<string, Bucket>, clave: string, max: number): boolean {
  const ahora = Date.now();
  let b = mapa.get(clave);
  if (!b || b.resetAt <= ahora) {
    b = { count: 0, resetAt: ahora + VENTANA_MS };
    mapa.set(clave, b);
  }
  b.count += 1;
  return b.count <= max;
}

/** Returns false when the client should receive a generic 401. */
export function loginPermitido(ip: string, username: string): boolean {
  const ipOk = tocar(porIp, ip || "desconocido", MAX_POR_IP);
  const userOk = tocar(
    porUsuario,
    `${ip || "desconocido"}:${username.trim().toLowerCase()}`,
    MAX_POR_USUARIO,
  );
  return ipOk && userOk;
}

export function detalleRateLimitLogin() {
  return {
    ventanaMinutos: VENTANA_MS / 60_000,
    maxIntentosPorUsuario: MAX_POR_USUARIO,
    maxIntentosPorIp: MAX_POR_IP,
  };
}
