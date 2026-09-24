import { createHmac, timingSafeEqual } from "node:crypto";
import { MAX_AGE_MS, PREFIX } from "@/lib/session-token-verify";
import { sessionSecret } from "@/server/session-secret";

function hmac(payload: string) {
  return createHmac("sha256", sessionSecret()).update(payload).digest("hex");
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
