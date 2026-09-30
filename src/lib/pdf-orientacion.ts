export type OrientacionPdf = "vertical" | "horizontal";

/** Vacío o cualquier otro valor = horizontal, como los esquemas de ahora. */
export function parseOrientacionPdf(raw: unknown): OrientacionPdf {
  return raw === "vertical" ? "vertical" : "horizontal";
}

/** Solo se guarda «vertical». Horizontal no se escribe, para no cambiar esquemas viejos. */
export function elegirOrientacionPdf(raw: unknown): "vertical" | undefined {
  return raw === "vertical" ? "vertical" : undefined;
}
