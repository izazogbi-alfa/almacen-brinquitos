import assert from "node:assert/strict";
import {
  etiquetaBotonPendiente,
  sesionPendienteDe,
  sesionTieneTrabajo,
  type SesionCaptura,
} from "../src/lib/sesion-captura.ts";
import { sesionVencidaPorInactividad } from "../src/lib/sesion-captura.ts";

const abiertaEn = "2026-09-18T12:00:00.000Z";
const t0 = Date.parse(abiertaEn);

function base(): SesionCaptura {
  return {
    id: "ss-pend",
    modulo: "existencias",
    abiertaEn,
    ultimaActividad: abiertaEn,
    userId: "u-iza",
    userName: "Iza",
    conteos: 3,
    entradas: 0,
    pedidos: 0,
  };
}

assert.equal(sesionTieneTrabajo(base()), true);
assert.equal(sesionTieneTrabajo({ ...base(), conteos: 0 }), false);
assert.equal(
  sesionTieneTrabajo({
    ...base(),
    conteos: 0,
    borrador: {
      lineas: [
        {
          key: "a",
          productoId: "p1",
          sku: "X",
          nombre: "Prenda",
          color: "Rojo",
          sucursalId: "s1",
          sucursalNombre: "Centro",
          pares: [{ talla: "8", cantidad: 2 }],
        },
      ],
    },
  }),
  true,
);

function cerrarPorIdle(sesion: SesionCaptura, ahoraMs: number) {
  if (sesion.cerradaEn) return;
  if (!sesionVencidaPorInactividad(sesion.ultimaActividad, ahoraMs)) return;
  sesion.cerradaEn = new Date(ahoraMs).toISOString();
  sesion.motivoCierre = "inactividad";
  sesion.pendiente = sesionTieneTrabajo(sesion);
}

const conTrabajo = base();
cerrarPorIdle(conTrabajo, t0 + 9 * 60 * 1000);
assert.equal(conTrabajo.cerradaEn, undefined);
cerrarPorIdle(conTrabajo, t0 + 10 * 60 * 1000);
assert.equal(conTrabajo.pendiente, true);
assert.ok(conTrabajo.cerradaEn);

const vacia = { ...base(), id: "ss-vacia", conteos: 0 };
cerrarPorIdle(vacia, t0 + 10 * 60 * 1000);
assert.equal(vacia.pendiente, false);

const lista: SesionCaptura[] = [conTrabajo, vacia];
assert.equal(sesionPendienteDe(lista, "existencias")?.id, "ss-pend");
assert.equal(sesionPendienteDe(lista, "pedidos"), undefined);

function reanudar(sesiones: SesionCaptura[], modulo: SesionCaptura["modulo"]) {
  if (sesiones.some((s) => s.modulo === modulo && !s.cerradaEn)) return null;
  const p = sesionPendienteDe(sesiones, modulo);
  if (!p) return null;
  delete p.cerradaEn;
  delete p.motivoCierre;
  p.pendiente = false;
  return p;
}

const retomada = reanudar([conTrabajo], "existencias");
assert.equal(retomada?.id, "ss-pend");
assert.equal(retomada?.cerradaEn, undefined);
assert.equal(retomada?.pendiente, false);

assert.equal(
  etiquetaBotonPendiente("existencias"),
  "Seguir existencias pendientes",
);
assert.equal(etiquetaBotonPendiente("pedidos"), "Seguir pedidos pendientes");
assert.equal(
  etiquetaBotonPendiente("recepcion"),
  "Seguir recepción pendiente",
);

function abandonarAlSalir(sesion: SesionCaptura, ahora: Date) {
  if (sesion.cerradaEn) return sesion;
  sesion.cerradaEn = ahora.toISOString();
  sesion.motivoCierre = "pagina";
  sesion.pendiente = sesionTieneTrabajo(sesion);
  return sesion;
}

const abiertaAhora = base();
const alSalir = abandonarAlSalir(
  abiertaAhora,
  new Date("2026-09-19T12:00:05.000Z"),
);
assert.equal(alSalir.id, "ss-pend");
assert.equal(alSalir.pendiente, true);
assert.equal(alSalir.motivoCierre, "pagina");
assert.ok(alSalir.cerradaEn);
assert.equal(sesionPendienteDe([abiertaAhora], "existencias")?.id, "ss-pend");

const vaciaAbierta = { ...base(), id: "ss-vacia-abierta", conteos: 0 };
abandonarAlSalir(vaciaAbierta, new Date());
assert.equal(vaciaAbierta.pendiente, false);
assert.equal(sesionPendienteDe([vaciaAbierta], "existencias"), undefined);

console.log("ok sesion-pendiente");
