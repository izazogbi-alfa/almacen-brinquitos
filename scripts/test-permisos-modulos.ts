import assert from "node:assert/strict";
import {
  completarModulos,
  puede,
  puedeAutorizarPedidos,
  MODULOS_ENTRADA,
  MODULOS_SOLO_ALMACEN,
} from "../src/lib/modulos.ts";
import {
  movimientosVisiblesPara,
  pedidosVisiblesPara,
  recepcionesVisiblesPara,
  puedeModuloDeSesion,
} from "../src/lib/estado-cliente.ts";
import { SECCIONES_CONFIGURACION } from "../src/lib/secciones-configuracion.ts";
import type { Movimiento, Pedido, Recepcion, UsuarioPublico } from "../src/lib/types.ts";

const admin: UsuarioPublico = {
  id: "u-iza",
  username: "iza",
  nombre: "Iza",
  rol: "admin",
  modulos: completarModulos({ rol: "admin", username: "iza" }),
};
const almacen1: UsuarioPublico = {
  id: "u-almacen1",
  username: "almacen1",
  nombre: "Ana",
  rol: "operador",
  modulos: completarModulos({ rol: "operador", username: "almacen1" }),
};
const almacen2: UsuarioPublico = {
  id: "u-almacen2",
  username: "almacen2",
  nombre: "Carlos",
  rol: "operador",
  modulos: completarModulos({ rol: "operador", username: "almacen2" }),
};

assert.deepEqual(almacen1.modulos, MODULOS_ENTRADA);
assert.deepEqual(almacen2.modulos, MODULOS_SOLO_ALMACEN);
assert.equal(puede(almacen2, "pedidos"), false);
assert.equal(puede(almacen2, "configuracion"), false);
assert.equal(puede(almacen2, "articulos"), false);
assert.equal(puede(almacen1, "pedidos"), false);
assert.equal(puede(almacen1, "recepcion"), true);
assert.equal(puede(almacen1, "existencias"), true);
assert.equal(puede(admin, "configuracion"), true);
assert.equal(puedeAutorizarPedidos(almacen1), false);
assert.equal(puedeAutorizarPedidos(admin), true);
assert.equal(puedeModuloDeSesion(almacen2, "pedidos"), false);
assert.equal(puedeModuloDeSesion(admin, "pedidos"), true);

assert.equal(
  SECCIONES_CONFIGURACION.find((s) => s.slug === "actualizar-catalogo")
    ?.soloAdmin,
  true,
);

const pedidos: Pedido[] = [
  {
    id: "po-1",
    folio: "PO-1",
    proveedor: "X",
    estado: "borrador",
    notas: "",
    fecha: "2026-09-26T00:00:00.000Z",
    lineas: [],
    userId: "u-iza",
    userName: "Iza",
  },
];
assert.equal(pedidosVisiblesPara(almacen2, pedidos).length, 0);
assert.equal(pedidosVisiblesPara(admin, pedidos).length, 1);

const recepciones: Recepcion[] = [
  {
    id: "r-1",
    pedidoId: "po-1",
    fecha: "2026-09-26T00:00:00.000Z",
    lineas: [],
    userId: "u-almacen1",
    userName: "Ana",
  },
];
assert.equal(recepcionesVisiblesPara(almacen2, recepciones).length, 0);
assert.equal(recepcionesVisiblesPara(almacen1, recepciones).length, 1);

const movs: Movimiento[] = [
  {
    id: "m1",
    tipo: "conteo",
    cantidad: 1,
    userId: "u-iza",
    userName: "Iza",
    timestamp: "2026-09-26T00:00:00.000Z",
    nota: "",
  },
  {
    id: "m2",
    tipo: "pedido",
    cantidad: 1,
    userId: "u-iza",
    userName: "Iza",
    timestamp: "2026-09-26T00:00:00.000Z",
    nota: "",
  },
];
assert.equal(movimientosVisiblesPara(almacen2, movs).length, 1);
assert.equal(movimientosVisiblesPara(almacen2, movs)[0].tipo, "conteo");
assert.equal(movimientosVisiblesPara(admin, movs).length, 2);

console.log("ok permisos-modulos");
