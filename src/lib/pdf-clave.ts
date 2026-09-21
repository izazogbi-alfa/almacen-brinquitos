/** Existencias PDF: no imprimir esquema; la franja verde solo muestra la Clave. */
export function esPdfExistencias(titulo: string) {
  return /existencia/i.test(titulo);
}

export function notasPdfInforme(notas: string[], claveSolo: boolean) {
  if (!claveSolo) return notas;
  return notas.filter((n) => !/esquema/i.test(n));
}
