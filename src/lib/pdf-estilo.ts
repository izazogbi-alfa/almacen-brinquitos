export type EstiloPdf = "compacto" | "detallado";

export function parseEstiloPdf(raw: unknown): EstiloPdf {
  return raw === "detallado" ? "detallado" : "compacto";
}
