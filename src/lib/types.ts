export type EstadoPedido =
  | "borrador"
  | "enviado"
  | "parcial"
  | "recibido"
  | "cancelado";

export type RolUsuario = "admin" | "operador";

export type Producto = {
  id: string;
  sku: string;
  nombre: string;
  categoria: string;
  unidad: string;
  existencia: number;
  minimo: number;
  ubicacion: string;
  foto?: string;
  variantes?: Variante[];
};

export type Variante = {
  talla: string;
  color: string;
  existencia: number;
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
  userId: string;
  userName: string;
};

export type Recepcion = {
  id: string;
  pedidoId: string;
  fecha: string;
  lineas: { productoId: string; cantidad: number }[];
  userId: string;
  userName: string;
};

export type UsuarioPublico = {
  id: string;
  username: string;
  nombre: string;
  rol: RolUsuario;
};

export type TipoMovimiento =
  | "retiro"
  | "conteo"
  | "recepcion"
  | "pedido"
  | "cierre";

export type Movimiento = {
  id: string;
  tipo: TipoMovimiento;
  productoId?: string;
  productoNombre?: string;
  cantidad: number;
  existenciaAntes?: number;
  existenciaDespues?: number;
  pedidoId?: string;
  userId: string;
  userName: string;
  timestamp: string;
  nota: string;
  talla?: string;
  color?: string;
};

export type Guardado = {
  timestamp: string;
  userId: string;
  userName: string;
};

export type CierreDia = {
  id: string;
  fecha: string;
  timestamp: string;
  userId: string;
  userName: string;
  retiros: number;
  conteos: number;
};

export type AppStatus = "loading" | "ready" | "error";
