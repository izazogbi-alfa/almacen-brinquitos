import assert from "node:assert/strict";
import {
  archivoPdfRegistro,
  mensajeRegistroSinLineas,
  opcionesPdfRegistro,
  registroTieneLineas,
  tituloDocRegistro,
} from "../src/lib/pdf-registro-opciones.ts";
import type { SesionCaptura } from "../src/lib/sesion-captura.ts";

function base(parcial: Partial<SesionCaptura>): SesionCaptura {
  return {
    id: "s1",
    modulo: "existencias",
    abiertaEn: "2026-09-21T10:00:00.000Z",
    ultimaActividad: "2026-09-21T12:00:00.000Z",
    cerradaEn: "2026-09-21T12:00:00.000Z",
    userId: "u1",
    userName: "Iza",
    motivoCierre: "terminada",
    pendiente: false,
    conteos: 1,
    entradas: 0,
    pedidos: 0,
    ...parcial,
  };
}

const conLineas = base({
  borrador: {
    sucursalId: "suc-1",
    lineas: [
      {
        key: "a",
        productoId: "p1",
        sku: "XC1092",
        nombre: "Camisa",
        color: "Rosa",
        sucursalId: "suc-1",
        sucursalNombre: "Centro",
        pares: [{ talla: "4", cantidad: 3 }],
      },
    ],
  },
});

const vacia = base({
  id: "vacia",
  borrador: { lineas: [] },
});

assert.equal(tituloDocRegistro(conLineas), "Existencias");
assert.equal(
  tituloDocRegistro(base({ modulo: "recepcion" })),
  "Entrada de mercancía",
);
assert.equal(tituloDocRegistro(base({ modulo: "pedidos" })), "Pedido");
assert.equal(archivoPdfRegistro(conLineas), "existencias-s1.pdf");
assert.equal(opcionesPdfRegistro(conLineas).claveSolo, true);
assert.equal(opcionesPdfRegistro(base({ modulo: "recepcion" })).claveSolo, false);
assert.equal(opcionesPdfRegistro(base({ modulo: "pedidos" })).claveSolo, false);
assert.equal(registroTieneLineas(conLineas), true);
assert.equal(registroTieneLineas(vacia), false);
assert.ok(mensajeRegistroSinLineas().includes("no tiene líneas"));

const ped = opcionesPdfRegistro(
  base({
    modulo: "pedidos",
    borrador: {
      proveedor: "Tela Iza",
      notasPedido: "Urgente",
      lineas: [
        {
          key: "a",
          productoId: "p1",
          sku: "XC1092",
          nombre: "Camisa",
          color: "Rosa",
          sucursalId: "suc-1",
          sucursalNombre: "Centro",
          pares: [{ talla: "4", cantidad: 1 }],
        },
      ],
    },
  }),
);
assert.deepEqual(ped.notas, ["Proveedor: Tela Iza", "Urgente"]);

console.log("ok pdf registro terminado");
