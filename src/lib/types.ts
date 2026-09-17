export type EstadoPedido =
  | "borrador"
  | "enviado"
  | "parcial"
  | "recibido"
  | "cancelado";

export type RolUsuario = "admin" | "operador";

export type ModulosUsuario = {
  existencias: boolean;
  recepcion: boolean;
  pedidos: boolean;
};

export type EsquemaConteo = "nino" | "letra" | "accesorio";

export type Sucursal = {
  id: string;
  nombre: string;
};

export type ExistenciaSucursal = {
  sucursalId: string;
  talla: string;
  color: string;
  cantidad: number;
};

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
  esquemaConteo?: EsquemaConteo;
  tallas?: string[];
  colores?: string[];
  existenciasSucursal?: ExistenciaSucursal[];
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
  talla?: string;
  color?: string;
  sucursalId?: string;
  sucursalNombre?: string;
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
  autorizadoPorId?: string;
  autorizadoPorNombre?: string;
  autorizadoEn?: string;
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
  modulos: ModulosUsuario;
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
  sucursalId?: string;
  sucursalNombre?: string;
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
