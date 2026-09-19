import assert from "node:assert/strict";
import {
  SESION_INACTIVIDAD_MS,
  msHastaCierre,
  sesionVencidaPorInactividad,
  type SesionCaptura,
} from "../src/lib/sesion-captura.ts";

assert.equal(SESION_INACTIVIDAD_MS, 10 * 60 * 1000);
assert.equal(
  sesionVencidaPorInactividad(
    "2026-09-19T12:00:00.000Z",
    Date.parse("2026-09-19T12:09:59.000Z"),
  ),
  false,
);
assert.equal(
  sesionVencidaPorInactividad(
    "2026-09-19T12:00:00.000Z",
    Date.parse("2026-09-19T12:10:00.000Z"),
  ),
  true,
);
assert.equal(
  msHastaCierre(
    "2026-09-19T12:00:00.000Z",
    Date.parse("2026-09-19T12:04:00.000Z"),
  ),
  6 * 60 * 1000,
);

function cerrarSiVencio(sesion: SesionCaptura, ahoraMs: number): boolean {
  if (sesion.cerradaEn) return false;
  if (!sesionVencidaPorInactividad(sesion.ultimaActividad, ahoraMs)) return false;
  sesion.cerradaEn = new Date(ahoraMs).toISOString();
  sesion.motivoCierre = "inactividad";
  return true;
}

const sesion: SesionCaptura = {
  id: "ss-1",
  modulo: "existencias",
  abiertaEn: "2026-09-19T12:00:00.000Z",
  ultimaActividad: "2026-09-19T12:00:00.000Z",
  userId: "u-iza",
  userName: "Iza Zogbi",
  conteos: 2,
  entradas: 0,
  pedidos: 0,
};

assert.equal(cerrarSiVencio(sesion, Date.parse("2026-09-19T12:09:00.000Z")), false);
assert.equal(sesion.cerradaEn, undefined);
assert.equal(cerrarSiVencio(sesion, Date.parse("2026-09-19T12:10:00.000Z")), true);
assert.equal(sesion.motivoCierre, "inactividad");
assert.ok(sesion.cerradaEn);

console.log("ok sesion-inactividad", { idleMs: SESION_INACTIVIDAD_MS });
