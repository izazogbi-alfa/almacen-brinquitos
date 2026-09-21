import assert from "node:assert/strict";
import { grupoRegistro } from "../src/lib/format.ts";
import { puede } from "../src/lib/modulos.ts";
import { SECCIONES_PENDIENTES, SECCIONES_TERMINADAS } from "../src/lib/secciones-pendientes.ts";
import {
  coincideBusquedaPendiente,
  etiquetaBotonPendiente,
  esSesionTerminada,
  ORDEN_MODULOS_PENDIENTES,
  sesionesPendientes,
  sesionesTerminadas,
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
  "Continuar este registro",
);
assert.equal(etiquetaBotonPendiente("pedidos"), "Continuar este registro");
assert.equal(
  etiquetaBotonPendiente("recepcion"),
  "Continuar este registro",
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

const conSucursal: SesionCaptura = {
  ...alSalir,
  id: "ss-busca",
  pendiente: true,
  cerradaEn: alSalir.cerradaEn,
  userName: "Iza Zogbi",
  borrador: {
    sucursalId: "s-gloria",
    lineas: [
      {
        key: "a",
        productoId: "p1",
        sku: "330",
        nombre: "Camisa",
        color: "Rojo",
        sucursalId: "s-gloria",
        sucursalNombre: "La Gloria",
        pares: [{ talla: "8", cantidad: 7 }],
      },
    ],
  },
};
assert.equal(sesionesPendientes([conSucursal, vaciaAbierta]).length, 1);
assert.equal(coincideBusquedaPendiente(conSucursal, "gloria"), true);
assert.equal(coincideBusquedaPendiente(conSucursal, "pedidos"), false);
assert.equal(coincideBusquedaPendiente(conSucursal, "iza"), true);

assert.equal(ORDEN_MODULOS_PENDIENTES.join(","), "existencias,recepcion,pedidos");
const pedidoPend: SesionCaptura = {
  ...conSucursal,
  id: "ss-pe",
  modulo: "pedidos",
};
const mix = [pedidoPend, conSucursal];
const grupos = ORDEN_MODULOS_PENDIENTES.map((m) =>
  mix.filter((s) => s.modulo === m),
).filter((g) => g.length > 0);
assert.equal(grupos[0][0].modulo, "existencias");
assert.equal(grupos[1][0].modulo, "pedidos");

function borrarPendiente(sesiones: SesionCaptura[], id: string) {
  const i = sesiones.findIndex(
    (s) => s.id === id && Boolean(s.cerradaEn) && s.pendiente,
  );
  if (i < 0) return false;
  sesiones.splice(i, 1);
  return true;
}
const movimientos = [{ id: "mv-1", tipo: "conteo", sesionId: "ss-busca" }];
assert.equal(borrarPendiente(mix, "ss-busca"), true);
assert.equal(mix.length, 1);
assert.equal(mix[0].id, "ss-pe");
assert.equal(movimientos.length, 1);

assert.deepEqual(
  SECCIONES_PENDIENTES.map((s) => s.titulo),
  [
    "Existencias pendientes",
    "Recepción pendientes",
    "Pedidos pendientes",
  ],
);
const iza = {
  id: "u-iza",
  username: "iza",
  nombre: "Iza",
  rol: "admin" as const,
  modulos: {
    existencias: true,
    recepcion: true,
    pedidos: true,
    articulos: true,
    configuracion: true,
  },
};
const almacen2 = {
  id: "u-a2",
  username: "almacen2",
  nombre: "Almacén 2",
  rol: "operador" as const,
  modulos: {
    existencias: true,
    recepcion: false,
    pedidos: false,
    articulos: false,
    configuracion: false,
  },
};
assert.equal(
  SECCIONES_PENDIENTES.filter((s) => puede(iza, s.modulo)).length,
  3,
);
assert.deepEqual(
  SECCIONES_PENDIENTES.filter((s) => puede(almacen2, s.modulo)).map(
    (s) => s.slug,
  ),
  ["existencias"],
);
assert.deepEqual(
  SECCIONES_TERMINADAS.map((s) => s.titulo),
  [
    "Existencias ya terminadas",
    "Recepción ya terminada",
    "Pedidos ya terminados",
  ],
);
assert.deepEqual(
  SECCIONES_TERMINADAS.filter((s) => puede(almacen2, s.modulo)).map(
    (s) => s.slug,
  ),
  ["existencias-terminadas"],
);

const aMedias: SesionCaptura = {
  ...base(),
  id: "ss-medias",
  cerradaEn: "2026-09-20T12:00:00.000Z",
  pendiente: true,
};
const hecha: SesionCaptura = {
  ...base(),
  id: "ss-hecha",
  cerradaEn: "2026-09-20T13:00:00.000Z",
  pendiente: false,
  motivoCierre: "terminada",
};
const vaciaCerrada: SesionCaptura = {
  ...base(),
  id: "ss-vacia-c",
  conteos: 0,
  cerradaEn: "2026-09-20T13:00:00.000Z",
  pendiente: false,
};
assert.equal(esSesionTerminada(aMedias), false);
assert.equal(esSesionTerminada(hecha), true);
assert.equal(esSesionTerminada(vaciaCerrada), false);
assert.deepEqual(
  sesionesTerminadas([aMedias, hecha, vaciaCerrada]).map((s) => s.id),
  ["ss-hecha"],
);
assert.equal(sesionesPendientes([aMedias, hecha]).map((s) => s.id).join(), "ss-medias");

const ahoraGrupo = "2026-09-20T18:00:00.000Z";
assert.equal(grupoRegistro("2026-09-20T12:00:00.000Z", ahoraGrupo), "Hoy");
assert.equal(grupoRegistro("2026-09-19T18:00:00.000Z", ahoraGrupo), "Ayer");
assert.equal(grupoRegistro("2026-09-01T18:00:00.000Z", ahoraGrupo), "Más antiguos");

const user = { id: "u-iza", nombre: "Iza" };
const borradorLineas = {
  sucursalId: "s1",
  lineas: [
    {
      key: "a",
      productoId: "p1",
      sku: "XC1092",
      nombre: "Camisa",
      color: "Rosa",
      sucursalId: "s1",
      sucursalNombre: "Centro",
      pares: [{ talla: "8", cantidad: 2 }],
    },
  ],
};

function abrirYCerrarPendiente(): SesionCaptura {
  const ahora = "2026-09-21T12:00:00.000Z";
  const sesion: SesionCaptura = {
    id: "ss-btn-pend",
    modulo: "existencias",
    abiertaEn: ahora,
    ultimaActividad: ahora,
    userId: user.id,
    userName: user.nombre,
    conteos: 0,
    entradas: 0,
    pedidos: 0,
    borrador: borradorLineas,
  };
  sesion.cerradaEn = ahora;
  sesion.motivoCierre = "pagina";
  sesion.pendiente = sesionTieneTrabajo(sesion);
  return sesion;
}

function abrirYCerrarTerminada(): SesionCaptura {
  const ahora = "2026-09-21T13:00:00.000Z";
  const sesion: SesionCaptura = {
    id: "ss-btn-term",
    modulo: "existencias",
    abiertaEn: ahora,
    ultimaActividad: ahora,
    userId: user.id,
    userName: user.nombre,
    conteos: 0,
    entradas: 0,
    pedidos: 0,
    borrador: borradorLineas,
  };
  sesion.cerradaEn = ahora;
  sesion.motivoCierre = "terminada";
  sesion.pendiente = false;
  return sesion;
}

const pendienteBtn = abrirYCerrarPendiente();
assert.equal(pendienteBtn.pendiente, true);
assert.equal(pendienteBtn.motivoCierre, "pagina");
assert.equal(sesionesPendientes([pendienteBtn])[0]?.id, "ss-btn-pend");
assert.equal(sesionesTerminadas([pendienteBtn]).length, 0);

const terminadaBtn = abrirYCerrarTerminada();
assert.equal(terminadaBtn.pendiente, false);
assert.equal(terminadaBtn.motivoCierre, "terminada");
assert.equal(esSesionTerminada(terminadaBtn), true);
assert.equal(sesionesPendientes([terminadaBtn]).length, 0);
assert.equal(sesionesTerminadas([terminadaBtn])[0]?.id, "ss-btn-term");

console.log("ok sesion-pendiente");
