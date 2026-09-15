export type EstadoPedido =
  | "borrador"
  | "enviado"
  | "parcial"
  | "recibido"
  | "cancelado";

export type Producto = {
  id: string;
  sku: string;
  nombre: string;
  categoria: string;
  unidad: string;
  existencia: number;
  minimo: number;
  ubicacion: string;
};

export type LineaPedido = {
  productoId: string;
  cantidad: number;
  recibido: number;
  costoUnitario: number;
};

export type Pedido = {
  id: string;
  folio: string;
  proveedor: string;
  fecha: string;
  estado: EstadoPedido;
  notas: string;
  lineas: LineaPedido[];
};

export type Recepcion = {
  id: string;
  pedidoId: string;
  fecha: string;
  lineas: { productoId: string; cantidad: number }[];
};

export type AppStatus = "loading" | "ready" | "error";
