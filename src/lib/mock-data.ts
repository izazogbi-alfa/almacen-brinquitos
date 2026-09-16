import type { ExistenciaSucursal, Pedido, Producto, Recepcion } from "@/lib/types";
import { SUCURSALES } from "@/lib/sucursales";

export { SUCURSALES };

function celdas(
  rows: [string, string, string, number][],
): ExistenciaSucursal[] {
  return rows.map(([sucursalId, talla, color, cantidad]) => ({
    sucursalId,
    talla,
    color,
    cantidad,
  }));
}

function suma(celdas: ExistenciaSucursal[]) {
  return celdas.reduce((acc, c) => acc + c.cantidad, 0);
}

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
    foto: "/productos/harina.png",
    esquemaConteo: "accesorio",
    colores: ["Único"],
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
    foto: "/productos/aceite.png",
    esquemaConteo: "accesorio",
    colores: ["Único"],
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
    esquemaConteo: "accesorio",
    colores: ["Único"],
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
    esquemaConteo: "accesorio",
    colores: ["Único"],
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
    foto: "/productos/arroz.png",
    esquemaConteo: "accesorio",
    colores: ["Único"],
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
    foto: "/productos/leche.png",
    esquemaConteo: "accesorio",
    colores: ["Único"],
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
    esquemaConteo: "accesorio",
    colores: ["Único"],
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
    esquemaConteo: "accesorio",
    colores: ["Único"],
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
    foto: "/productos/cafe.png",
    esquemaConteo: "accesorio",
    colores: ["Único"],
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
    esquemaConteo: "accesorio",
    colores: ["Único"],
  },
  {
    id: "p-playera",
    sku: "ROP-5001",
    nombre: "Playera algodón básica",
    categoria: "Ropa",
    unidad: "pza",
    existencia: 46,
    minimo: 12,
    ubicacion: "Pasillo D · Anaquel 1",
    foto: "/productos/playera.png",
    esquemaConteo: "letra",
    tallas: ["S", "M", "L"],
    colores: ["Negro", "Blanco"],
    variantes: [
      { talla: "S", color: "Negro", existencia: 8 },
      { talla: "S", color: "Blanco", existencia: 6 },
      { talla: "M", color: "Negro", existencia: 10 },
      { talla: "M", color: "Blanco", existencia: 7 },
      { talla: "L", color: "Negro", existencia: 9 },
      { talla: "L", color: "Blanco", existencia: 6 },
    ],
  },
  {
    id: "p-pantalon",
    sku: "ROP-5002",
    nombre: "Pantalón de mezclilla",
    categoria: "Ropa",
    unidad: "pza",
    existencia: 31,
    minimo: 8,
    ubicacion: "Pasillo D · Anaquel 2",
    foto: "/productos/pantalon.png",
    esquemaConteo: "nino",
    tallas: ["28", "30", "32"],
    colores: ["Azul", "Negro"],
    variantes: [
      { talla: "28", color: "Azul", existencia: 5 },
      { talla: "28", color: "Negro", existencia: 4 },
      { talla: "30", color: "Azul", existencia: 8 },
      { talla: "30", color: "Negro", existencia: 6 },
      { talla: "32", color: "Azul", existencia: 5 },
      { talla: "32", color: "Negro", existencia: 3 },
    ],
  },
  ...(() => {
    const ropon = celdas([
      ["s-gloria", "6", "Blanco", 5],
      ["s-gloria", "8", "Blanco", 4],
      ["s-gloria", "10", "Marfil", 3],
      ["s-modelo", "6", "Blanco", 2],
      ["s-modelo", "12", "Rosa", 3],
      ["s-angel", "8", "Blanco", 6],
      ["s-angel", "10", "Blanco", 2],
    ]);
    const trajecito = celdas([
      ["s-gloria", "4", "Blanco", 3],
      ["s-gloria", "6", "Beige", 4],
      ["s-modelo", "6", "Azul", 5],
      ["s-modelo", "8", "Blanco", 2],
      ["s-angel", "4", "Blanco", 4],
      ["s-angel", "10", "Beige", 1],
    ]);
    const chaleco = celdas([
      ["s-gloria", "CHICO", "Negro", 4],
      ["s-gloria", "MEDIANO", "Negro", 6],
      ["s-gloria", "GRANDE", "Beige", 2],
      ["s-modelo", "MEDIANO", "Blanco", 3],
      ["s-modelo", "ADULTO", "Negro", 2],
      ["s-angel", "EXCHICO", "Negro", 1],
      ["s-angel", "EXGRANDE", "Blanco", 3],
    ]);
    const vela = celdas([
      ["s-gloria", "", "Blanco", 18],
      ["s-gloria", "", "Marfil", 9],
      ["s-modelo", "", "Único", 12],
      ["s-angel", "", "Blanco", 7],
      ["s-angel", "", "Dorado", 4],
    ]);
    const extras: Producto[] = [
      {
        id: "p-ropon",
        sku: "BRI-1001",
        nombre: "Ropón de bautizo",
        categoria: "Ropa infantil",
        unidad: "pza",
        existencia: suma(ropon),
        minimo: 6,
        ubicacion: "Ropa de bautizo",
        foto: "/productos/ropon.png",
        esquemaConteo: "nino",
        colores: ["Blanco", "Marfil", "Rosa"],
        existenciasSucursal: ropon,
      },
      {
        id: "p-trajecito",
        sku: "BRI-1002",
        nombre: "Trajecito de bautizo",
        categoria: "Ropa infantil",
        unidad: "pza",
        existencia: suma(trajecito),
        minimo: 4,
        ubicacion: "Ropa de bautizo",
        foto: "/productos/trajecito.png",
        esquemaConteo: "nino",
        colores: ["Blanco", "Beige", "Azul"],
        existenciasSucursal: trajecito,
      },
      {
        id: "p-chaleco",
        sku: "BRI-2001",
        nombre: "Chaleco adulto",
        categoria: "Ropa adulto",
        unidad: "pza",
        existencia: suma(chaleco),
        minimo: 3,
        ubicacion: "Ropa adulto",
        foto: "/productos/chaleco.png",
        esquemaConteo: "letra",
        colores: ["Negro", "Blanco", "Beige"],
        existenciasSucursal: chaleco,
      },
      {
        id: "p-kit-vela",
        sku: "BRI-3001",
        nombre: "Kit vela de bautizo",
        categoria: "Accesorios",
        unidad: "pza",
        existencia: suma(vela),
        minimo: 10,
        ubicacion: "Accesorios",
        foto: "/productos/kit-vela.png",
        esquemaConteo: "accesorio",
        colores: ["Blanco", "Marfil", "Dorado", "Único"],
        existenciasSucursal: vela,
      },
    ];
    return extras;
  })(),
];

export const pedidosIniciales: Pedido[] = [
  {
    id: "po-1041",
    folio: "PO-1041",
    proveedor: "Alimentos del Norte",
    fecha: "2026-09-10T15:20:00.000Z",
    estado: "enviado",
    notas: "Entrega a andén 2. Revisar caducidad de leche.",
    userId: "seed",
    userName: "Carga inicial",
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
    userId: "seed",
    userName: "Carga inicial",
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
    userId: "seed",
    userName: "Carga inicial",
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
    userId: "seed",
    userName: "Carga inicial",
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
    userId: "seed",
    userName: "Carga inicial",
    lineas: [
      { productoId: "p-aceite", cantidad: 16 },
      { productoId: "p-harina", cantidad: 30 },
    ],
  },
  {
    id: "rc-9000",
    pedidoId: "po-1043",
    fecha: "2026-09-05T17:00:00.000Z",
    userId: "seed",
    userName: "Carga inicial",
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
