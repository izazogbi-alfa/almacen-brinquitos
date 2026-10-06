import assert from "node:assert/strict";
import { imagenesDeFicha, sanitizarFotosArticulo } from "../src/lib/fotos-articulo.ts";

const chica = "data:image/jpeg;base64," + "a".repeat(40);
const pesada = "data:image/jpeg;base64," + "b".repeat(130_000);

assert.deepEqual(
  sanitizarFotosArticulo(["/productos/catalogo/XC1092.jpg", "https://ejemplo.test/a.jpg", chica, chica]),
  ["/productos/catalogo/XC1092.jpg", "https://ejemplo.test/a.jpg", chica],
);
assert.equal(sanitizarFotosArticulo([chica], chica).length, 0);
assert.equal(sanitizarFotosArticulo(Array.from({ length: 10 }, (_, i) => `/f${i}.jpg`)).length, 6);
assert.equal(sanitizarFotosArticulo([pesada, "no-es-imagen"]).length, 0);

const ficha = imagenesDeFicha({
  foto: "/productos/catalogo/XC1092.jpg",
  fotos: [chica, "/productos/catalogo/XC1092.jpg", "/otra.jpg"],
});
assert.equal(ficha.foto, "/productos/catalogo/XC1092.jpg");
assert.deepEqual(ficha.fotos, [chica, "/otra.jpg"]);

assert.equal(imagenesDeFicha({ foto: "", fotos: [] }).foto, undefined);
assert.throws(() => imagenesDeFicha({ foto: pesada, fotos: [] }), /más chica/);

console.log("ok fotos-articulo");
