import assert from "node:assert/strict";
import {
  LIMITE_RESPALDOS,
  recortarColeccion,
  yaHayAutomaticoDelDia,
} from "../src/lib/respaldos-tope.ts";

function fake(origen: "manual" | "automatico", n: number) {
  const createdAt = new Date(Date.UTC(2026, 0, n, 12)).toISOString();
  return {
    id: `${origen}-${n}`,
    createdAt,
    origen,
    dia: `2026-01-${String(n).padStart(2, "0")}`,
  };
}

const recortadosM = recortarColeccion(
  Array.from({ length: 12 }, (_, i) => fake("manual", i + 1)),
);
assert.equal(recortadosM.length, LIMITE_RESPALDOS);
assert.ok(recortadosM.some((x) => x.id === "manual-12"));
assert.ok(!recortadosM.some((x) => x.id === "manual-1"));
assert.ok(!recortadosM.some((x) => x.id === "manual-2"));

const recortadosA = recortarColeccion(
  Array.from({ length: 12 }, (_, i) => fake("automatico", i + 1)),
);
assert.equal(recortadosA.length, LIMITE_RESPALDOS);
assert.ok(recortadosA.some((x) => x.id === "automatico-12"));
assert.ok(!recortadosA.some((x) => x.id === "automatico-1"));

const mixto = recortarColeccion([
  ...Array.from({ length: 12 }, (_, i) => fake("manual", i + 1)),
  ...Array.from({ length: 12 }, (_, i) => fake("automatico", i + 1)),
]);
assert.equal(mixto.filter((x) => x.origen === "manual").length, 10);
assert.equal(mixto.filter((x) => x.origen === "automatico").length, 10);
assert.equal(mixto.length, 20);

assert.equal(yaHayAutomaticoDelDia(mixto, "2026-01-12"), true);
assert.equal(yaHayAutomaticoDelDia(mixto, "2026-09-19"), false);

console.log("ok respaldos cap 10");
