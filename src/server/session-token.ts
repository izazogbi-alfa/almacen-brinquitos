import { createHmac, timingSafeEqual } from "node:crypto";

const PREFIX = "brq1";
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

function secret() {
  return process.env.SESSION_SECRET?.trim() || "almacen-brinquitos-demo";
}

function hmac(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

export function firmarTokenSesion(userId: string) {
  const exp = String(Date.now() + MAX_AGE_MS);
  const payload = `${PREFIX}.${userId}.${exp}`;
  return `${payload}.${hmac(payload)}`;
}

export function verificarTokenSesion(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== PREFIX) return null;
  const [prefix, userId, exp, sig] = parts;
  if (!userId || !exp || !sig) return null;
  const payload = `${prefix}.${userId}.${exp}`;
  const expected = hmac(payload);
  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const expMs = Number(exp);
  if (!Number.isFinite(expMs) || expMs < Date.now()) return null;
  return userId;
}
