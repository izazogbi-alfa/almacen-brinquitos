import assert from "node:assert/strict";
import { siguienteTallaEnEsquema } from "../src/lib/captura-tallas.ts";

assert.equal(siguienteTallaEnEsquema(["8", "10", "12"], "8"), "10");
assert.equal(siguienteTallaEnEsquema(["8", "10", "12"], "10"), "12");
assert.equal(siguienteTallaEnEsquema(["8", "10", "12"], "12"), null);
assert.equal(siguienteTallaEnEsquema([], "8"), null);
assert.equal(siguienteTallaEnEsquema([""], ""), null);
assert.equal(siguienteTallaEnEsquema(["2", "4", "6"], "4"), "6");

console.log("ok captura-tallas");
