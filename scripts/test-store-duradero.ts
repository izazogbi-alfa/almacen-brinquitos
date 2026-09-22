import assert from "node:assert/strict";
import {
  memoriaPostgres,
  setPostgresTestBackend,
  escribirDoc,
  leerDoc,
  hayPostgres,
} from "../src/server/postgres.ts";
import {
  persistirStoreEnPostgres,
  leerDocsPostgres,
  postgresTieneDatos,
  aplicarStockAlStore,
  aplicarRegistrosAlStore,
  type StoreDuradero,
} from "../src/server/store-duradero.ts";
import { postgresDisponible, esViaDuradera } from "../src/server/env-remoto.ts";
import { blobDisponible } from "../src/server/env-remoto.ts";

assert.equal(postgresDisponible(), false, "sin env no hay postgres");
assert.equal(blobDisponible(), false, "sin env no hay blob");
assert.equal(esViaDuradera("archivo"), true, "archivo local es duradero");
assert.equal(hayPostgres(), false);

const mem = memoriaPostgres();
setPostgresTestBackend(mem);
assert.equal(hayPostgres(), true);

async function main() {
  const store: StoreDuradero = {
  users: [
    {
      id: "u-iza",
      username: "iza",
      nombre: "Iza",
      rol: "admin",
      passwordHash: "aa".repeat(16) + ":" + "bb".repeat(32),
      modulos: {
        existencias: true,
        recepcion: true,
        pedidos: true,
        articulos: true,
        configuracion: true,
      },
    },
  ],
  sessions: [],
  productos: [
    {
      id: "p-1",
      sku: "XC1",
      nombre: "Prueba",
      categoria: "",
      unidad: "pza",
      existencia: 3,
      minimo: 0,
      ubicacion: "",
      existenciasSucursal: [
        { sucursalId: "s1", talla: "4", color: "rosa", cantidad: 3 },
      ],
    },
  ],
  pedidos: [],
  recepciones: [],
  movimientos: [],
  sesiones: [
    {
      id: "ses-1",
      modulo: "existencias",
      abiertaEn: "2026-09-21T10:00:00.000Z",
      ultimaActividad: "2026-09-21T10:05:00.000Z",
      userId: "u-iza",
      userName: "Iza",
      conteos: 1,
      entradas: 0,
      pedidos: 0,
      pendiente: true,
    },
  ],
  ultimoGuardado: null,
  catalogos: {
    esquemas: [],
    colores: ["rosa"],
    tallas: ["4"],
    especificaciones: [],
  },
  catalogosGuardadosEn: "2026-09-21T10:00:00.000Z",
  asignacionesGuardadosEn: null,
  usuariosGuardadosEn: "2026-09-21T10:00:00.000Z",
};

const saved = await persistirStoreEnPostgres(store);
assert.equal(saved.persistio, true);
assert.ok(saved.vias.includes("postgres"));

const docs = await leerDocsPostgres();
assert.equal(postgresTieneDatos(docs), true);
assert.equal(docs.stock?.productos[0]?.existencia, 3);
assert.equal(docs.registros?.sesiones[0]?.pendiente, true);
assert.equal(docs.usuarios?.users[0]?.username, "iza");

const destino: StoreDuradero = {
  ...store,
  productos: [
    {
      ...store.productos[0],
      existencia: 0,
      existenciasSucursal: [],
    },
  ],
  sesiones: [],
};
aplicarStockAlStore(destino, docs.stock!);
aplicarRegistrosAlStore(destino, docs.registros!);
assert.equal(destino.productos[0].existencia, 3);
assert.equal(destino.sesiones[0].id, "ses-1");

await escribirDoc("usuarios", {
  savedAt: "2026-09-22T00:00:00.000Z",
  users: docs.usuarios?.users,
});
const otra = await leerDoc("usuarios");
assert.ok(otra);

  setPostgresTestBackend(null);
  assert.equal(hayPostgres(), false);

  console.log("ok postgres memoria y migracion de stock/sesiones");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
