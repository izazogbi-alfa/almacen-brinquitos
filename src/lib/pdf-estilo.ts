export type EstiloPdf = "compacto" | "detallado";

export const MENSAJE_ESTILO_PDF_OBLIGATORIO =
  "Elige PDF compacto o PDF detallado. Sin una de las dos, este esquema no se guarda.";

/** Solo si Iza eligió. Vacío o basura = sin elección (no Compacto silencioso). */
export function elegirEstiloPdf(raw: unknown): EstiloPdf | undefined {
  return raw === "compacto" || raw === "detallado" ? raw : undefined;
}

/** PDF: si el esquema aún no tiene corte, Compacto. No sirve para Guardar. */
export function parseEstiloPdf(raw: unknown): EstiloPdf {
  return elegirEstiloPdf(raw) ?? "compacto";
}

export function exigirEstiloPdf(raw: unknown): EstiloPdf {
  const elegido = elegirEstiloPdf(raw);
  if (!elegido) {
    throw new Error(MENSAJE_ESTILO_PDF_OBLIGATORIO);
  }
  return elegido;
}
