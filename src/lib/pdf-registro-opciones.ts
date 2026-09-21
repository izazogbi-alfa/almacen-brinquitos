import type { SesionCaptura } from "./sesion-captura";
import type { LineaColorTabla } from "./tabla-bloques";

export const MENSAJE_REGISTRO_SIN_LINEAS =
  "Este registro no tiene líneas. No hay PDF que mostrar ni descargar.";

export function lineasDeRegistro(sesion: SesionCaptura): LineaColorTabla[] {
  return (sesion.borrador?.lineas ?? []).map((ln) => ({
    key: ln.key,
    productoId: ln.productoId,
    sku: ln.sku,
    nombre: ln.nombre,
    color: ln.color,
    especificacion: ln.especificacion,
    sucursalId: ln.sucursalId,
    sucursalNombre: ln.sucursalNombre,
    pares: ln.pares.map((p) => ({ talla: p.talla, cantidad: p.cantidad })),
  }));
}

export function registroTieneLineas(sesion: SesionCaptura) {
  return lineasDeRegistro(sesion).some((ln) => ln.pares.length > 0);
}

export function mensajeRegistroSinLineas() {
  return MENSAJE_REGISTRO_SIN_LINEAS;
}

export function tituloDocRegistro(sesion: SesionCaptura) {
  if (sesion.modulo === "existencias") return "Existencias";
  if (sesion.modulo === "recepcion") return "Entrada de mercancía";
  return "Pedido";
}

export function archivoPdfRegistro(sesion: SesionCaptura) {
  return `${sesion.modulo}-${sesion.id}.pdf`;
}

export function notasPdfRegistro(sesion: SesionCaptura) {
  if (sesion.modulo !== "pedidos") return [] as string[];
  const notas: string[] = [];
  const proveedor = sesion.borrador?.proveedor?.trim();
  const extra = sesion.borrador?.notasPedido?.trim();
  if (proveedor) notas.push(`Proveedor: ${proveedor}`);
  if (extra) notas.push(extra);
  return notas;
}

function sucursalNombre(sesion: SesionCaptura) {
  const nombre =
    sesion.borrador?.lineas.find((ln) => ln.sucursalNombre)?.sucursalNombre ||
    undefined;
  if (nombre) return nombre;
  return sesion.borrador?.sucursalId;
}

function fechaCorta(iso: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function opcionesPdfRegistro(sesion: SesionCaptura) {
  const tituloDoc = tituloDocRegistro(sesion);
  return {
    tituloDoc,
    archivo: archivoPdfRegistro(sesion),
    notas: notasPdfRegistro(sesion),
    sucursal: sucursalNombre(sesion),
    fecha: fechaCorta(sesion.cerradaEn ?? sesion.ultimaActividad),
    quien: sesion.userName,
    claveSolo: sesion.modulo === "existencias",
  };
}
