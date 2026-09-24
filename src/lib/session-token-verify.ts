import { SESSION_SECRET_DEMO, sessionSecretSeguro } from "@/server/session-secret";

const PREFIX = "brq1";
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

function firmasIguales(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function hmacHex(secret: string, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Edge-safe HMAC session verification (middleware). */
export async function verificarTokenSesionAsync(
  token: string,
  secretOverride?: string | null,
): Promise<string | null> {
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== PREFIX) return null;
  const [prefix, userId, exp, sig] = parts;
  if (!userId || !exp || !sig) return null;
  const secret = secretOverride ?? sessionSecretSeguro();
  if (!secret) return null;
  const payload = `${prefix}.${userId}.${exp}`;
  const expected = await hmacHex(secret, payload);
  if (!firmasIguales(sig, expected)) return null;
  const expMs = Number(exp);
  if (!Number.isFinite(expMs) || expMs < Date.now()) return null;
  return userId;
}

export { PREFIX, MAX_AGE_MS, SESSION_SECRET_DEMO };
