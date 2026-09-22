/** Nombres de entorno: no imprimir ni registrar valores. */

export function postgresDisponible() {
  return Boolean(
    process.env.DATABASE_URL?.trim() || process.env.POSTGRES_URL?.trim(),
  );
}

export function cadenaPostgres(): string {
  return (
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    ""
  );
}

export function blobDisponible() {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN?.trim() ||
      process.env.BLOB_STORE_ID?.trim(),
  );
}

export function esViaDuradera(via: string) {
  if (
    via === "postgres" ||
    via === "blob" ||
    via === "kv" ||
    via === "github" ||
    via === "http"
  ) {
    return true;
  }
  if (via === "archivo" && !process.env.VERCEL) return true;
  return false;
}
