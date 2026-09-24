/** Same-origin relative path only; rejects protocol-relative and absolute URLs. */
export function rutaSeguraTrasLogin(next: string | null | undefined): string {
  const raw = (next ?? "").trim();
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) {
    return "/";
  }
  if (raw.includes("://")) return "/";
  return raw;
}
