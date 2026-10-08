import assert from "node:assert/strict";
import { aplicarFilasCatalogo } from "../src/lib/actualizar-catalogo.ts";
import {
  codigoProveedorAlGuardar,
  ponerCodigoProveedor,
} from "../src/lib/codigo-proveedor.ts";
import type { Producto } from "../src/lib/types.ts";

assert.equal(codigoProveedorAlGuardar("  BR-12  "), "BR-12");
assert.equal(codigoProveedorAlGuardar(""), "");
assert.equal(codigoProveedorAlGuardar("   "), "");
assert.throws(() => codigoProveedorAlGuardar("x".repeat(41)));
assert.throws(() => codigoProveedorAlGuardar(12));

const articulo: Producto = {
  id: "p-1",
  sku: "XC1",
  nombre: "Camisa",
  categoria: "",
  unidad: "pza",
  existencia: 4,
  minimo: 0,
  ubicacion: "",
  esquemaConteo: "esq-iza",
  colores: ["rojo"],
  codigoProveedor: "VIEJO",
};
ponerCodigoProveedor(articulo, "BR-12");
assert.equal(articulo.codigoProveedor, "BR-12");
ponerCodigoProveedor(articulo, "");
assert.equal(articulo.codigoProveedor, undefined);
ponerCodigoProveedor(articulo, "BR-12");

const aplicado = aplicarFilasCatalogo([articulo], [
  { clave: "XC1", nombre: "Otro nombre", foto: "https://cdn.example/nueva.jpg" },
]);
assert.equal(aplicado[0]?.codigoProveedor, "BR-12");
assert.equal(aplicado[0]?.foto, "https://cdn.example/nueva.jpg");
assert.equal(aplicado[0]?.esquemaConteo, "esq-iza");

const sinColumna = aplicarFilasCatalogo([articulo], [
  { clave: "XC1", nombre: "Camisa" },
]);
assert.equal(sinColumna[0]?.codigoProveedor, "BR-12");

const nuevo = aplicarFilasCatalogo([], [
  { clave: "ZZ9", nombre: "Prenda nueva", foto: "/z.jpg" },
]);
assert.equal(nuevo[0]?.codigoProveedor, undefined);

console.log("ok codigo-proveedor");
