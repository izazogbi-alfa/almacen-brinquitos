/** Known demo fallback — never use in production. */
export const SESSION_SECRET_DEMO = "almacen-brinquitos-demo";

export function esProduccion() {
  return process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
}

/** Session signing secret. In production SESSION_SECRET must be set in the environment. */
export function sessionSecret(): string {
  const env = process.env.SESSION_SECRET?.trim();
  if (env) return env;
  if (esProduccion()) {
    throw new Error("SESSION_SECRET is required in production");
  }
  return SESSION_SECRET_DEMO;
}

/** For middleware: returns null when production has no secret (fail closed). */
export function sessionSecretSeguro(): string | null {
  const env = process.env.SESSION_SECRET?.trim();
  if (env) return env;
  if (esProduccion()) return null;
  return SESSION_SECRET_DEMO;
}
