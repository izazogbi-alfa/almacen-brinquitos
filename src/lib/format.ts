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

export function etiquetaEstado(estado: EstadoPedido) {
  switch (estado) {
    case "borrador":
      return "Borrador";
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

