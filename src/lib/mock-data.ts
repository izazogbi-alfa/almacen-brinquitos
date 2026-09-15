import type { Pedido, Producto, Recepcion } from "@/lib/types";

export const PROVEEDORES = [
  "Distribuidora del Valle",
  "Alimentos del Norte",
  "Empaques y Más",
  "Lácteos La Sierra",
] as const;

export const productosIniciales: Producto[] = [
  {
    id: "p-harina",
    sku: "ALI-1001",
    nombre: "Harina de trigo 1 kg",
    categoria: "Abarrotes",
    unidad: "pza",
    existencia: 42,
    minimo: 24,
    ubicacion: "Pasillo A · Anaquel 2",
  },
  {
    id: "p-aceite",
    sku: "ALI-1002",
    nombre: "Aceite vegetal 900 ml",
    categoria: "Abarrotes",
    unidad: "pza",
    existencia: 8,
    minimo: 18,
    ubicacion: "Pasillo A · Anaquel 4",
  },
  {
    id: "p-azucar",
    sku: "ALI-1003",
    nombre: "Azúcar estándar 1 kg",
    categoria: "Abarrotes",
    unidad: "pza",
    existencia: 16,
    minimo: 20,
    ubicacion: "Pasillo A · Anaquel 1",
  },
  {
    id: "p-frijol",
    sku: "ALI-1004",
    nombre: "Frijol negro 1 kg",
    categoria: "Abarrotes",
    unidad: "pza",
    existencia: 55,
    minimo: 30,
    ubicacion: "Pasillo B · Anaquel 1",
  },
  {
    id: "p-arroz",
    sku: "ALI-1005",
    nombre: "Arroz súper extra 1 kg",
    categoria: "Abarrotes",
    unidad: "pza",
    existencia: 12,
    minimo: 24,
    ubicacion: "Pasillo B · Anaquel 2",
  },
  {
    id: "p-leche",
    sku: "LAC-2001",
    nombre: "Leche entera 1 L",
    categoria: "Lácteos",
    unidad: "pza",
    existencia: 6,
    minimo: 36,
    ubicacion: "Cámara 1 · Nivel 2",
  },
  {
    id: "p-papel",
    sku: "LIM-3008",
    nombre: "Papel higiénico 12 rollos",
    categoria: "Limpieza",
    unidad: "paq",
    existencia: 21,
    minimo: 12,
    ubicacion: "Pasillo C · Anaquel 3",
  },
  {
    id: "p-detergente",
    sku: "LIM-3010",
    nombre: "Detergente en polvo 1 kg",
    categoria: "Limpieza",
    unidad: "pza",
    existencia: 4,
    minimo: 15,
    ubicacion: "Pasillo C · Anaquel 1",
  },
  {
    id: "p-cafe",
    sku: "ALI-1018",
    nombre: "Café tostado molido 500 g",
    categoria: "Abarrotes",
    unidad: "pza",
    existencia: 19,
    minimo: 10,
    ubicacion: "Pasillo A · Anaquel 6",
  },
  {
    id: "p-jugo",
    sku: "BEB-4102",
    nombre: "Jugo de naranja 1 L",
    categoria: "Bebidas",
    unidad: "pza",
    existencia: 28,
    minimo: 16,
    ubicacion: "Cámara 2 · Nivel 1",
  },
];

export const pedidosIniciales: Pedido[] = [
  {
    id: "po-1041",
    folio: "PO-1041",
    proveedor: "Alimentos del Norte",
    fecha: "2026-09-10T15:20:00.000Z",
    estado: "enviado",
    notas: "Entrega a andén 2. Revisar caducidad de leche.",
    lineas: [
      { productoId: "p-leche", cantidad: 48, recibido: 0, costoUnitario: 18.5 },
      { productoId: "p-azucar", cantidad: 24, recibido: 0, costoUnitario: 27.9 },
      { productoId: "p-arroz", cantidad: 36, recibido: 0, costoUnitario: 22.4 },
    ],
  },
  {
    id: "po-1042",
    folio: "PO-1042",
    proveedor: "Distribuidora del Valle",
    fecha: "2026-09-12T18:05:00.000Z",
    estado: "parcial",
    notas: "Faltó una tarima de aceite; el resto llegó el viernes.",
    lineas: [
      { productoId: "p-aceite", cantidad: 40, recibido: 16, costoUnitario: 41.0 },
      { productoId: "p-harina", cantidad: 30, recibido: 30, costoUnitario: 19.8 },
      { productoId: "p-detergente", cantidad: 20, recibido: 0, costoUnitario: 33.5 },
    ],
  },
  {
    id: "po-1043",
    folio: "PO-1043",
    proveedor: "Empaques y Más",
    fecha: "2026-09-04T13:40:00.000Z",
    estado: "recibido",
    notas: "",
    lineas: [
      { productoId: "p-papel", cantidad: 18, recibido: 18, costoUnitario: 89.0 },
    ],
  },
  {
    id: "po-1044",
    folio: "PO-1044",
    proveedor: "Lácteos La Sierra",
    fecha: "2026-09-14T21:10:00.000Z",
    estado: "enviado",
    notas: "Pedido de reposición urgente de lácteos y jugo.",
    lineas: [
      { productoId: "p-leche", cantidad: 24, recibido: 0, costoUnitario: 18.5 },
      { productoId: "p-jugo", cantidad: 12, recibido: 0, costoUnitario: 21.0 },
    ],
  },
];

export const recepcionesIniciales: Recepcion[] = [
  {
    id: "rc-9001",
    pedidoId: "po-1042",
    fecha: "2026-09-13T16:30:00.000Z",
    lineas: [
      { productoId: "p-aceite", cantidad: 16 },
      { productoId: "p-harina", cantidad: 30 },
    ],
  },
  {
    id: "rc-9000",
    pedidoId: "po-1043",
    fecha: "2026-09-05T17:00:00.000Z",
    lineas: [{ productoId: "p-papel", cantidad: 18 }],
  },
];

export function pendienteDeLinea(linea: { cantidad: number; recibido: number }) {
  return Math.max(0, linea.cantidad - linea.recibido);
}

export function totalPedido(pedido: Pedido) {
  return pedido.lineas.reduce(
    (acc, linea) => acc + linea.cantidad * linea.costoUnitario,
    0,
  );
}

export function progresoRecepcion(pedido: Pedido) {
  const pedidoTotal = pedido.lineas.reduce((acc, l) => acc + l.cantidad, 0);
  const recibido = pedido.lineas.reduce((acc, l) => acc + l.recibido, 0);
  return {
    pedidoTotal,
    recibido,
    pendiente: Math.max(0, pedidoTotal - recibido),
  };
}
