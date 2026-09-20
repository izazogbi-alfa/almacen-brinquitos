import type { EstadoPedido } from "@/lib/types";

export function formatoFecha(iso: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatoMoneda(valor: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(valor);
}

export function etiquetaUnidad(unidad: string, cantidad: number) {
  return `${cantidad.toLocaleString("es-MX")} ${unidad}`;
}

export function formatoFechaHora(iso: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function fechaClave(valor: Date | string = new Date()) {
  const d = typeof valor === "string" ? new Date(valor) : valor;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
  }).format(d);
}

export function grupoRegistro(
  iso: string,
  ahora: Date | string = new Date(),
): "Hoy" | "Ayer" | "Más antiguos" {
  const dia = fechaClave(iso);
  const hoy = fechaClave(ahora);
  if (dia === hoy) return "Hoy";
  const [y, m, d] = hoy.split("-").map(Number);
  const ayer = new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
  if (dia === ayer) return "Ayer";
  return "Más antiguos";
}

export const GRUPOS_REGISTRO = ["Hoy", "Ayer", "Más antiguos"] as const;

export function etiquetaEstado(estado: EstadoPedido) {
  switch (estado) {
    case "borrador":
      return "Por autorizar";
    case "enviado":
      return "Enviado";
    case "parcial":
      return "Parcial";
    case "recibido":
      return "Recibido";
    case "cancelado":
      return "Cancelado";
  }
}

