import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { EsquemaConteo, Producto } from "@/lib/types";

const META =
  /^(clave|existencia|departamento|precio|categor[íi]a|cat[áa]logo)\b/i;

export function esquemaPorNombre(nombre: string): EsquemaConteo {
  const u = nombre.toUpperCase();
  if (
    /EXCHICO|CHICO|MEDIANO|GRANDE|EXGRANDE|\bADULTO\b|CH-MED|MED-GDE|CH\/M\/G|\bCH\b.+\bGDE\b/.test(
      u,
    )
  ) {
    return "letra";
  }
  if (/\d+\s*AL\s*\d+|1-2-3/.test(u)) return "nino";
  if (
    /CAMISA|PANTAL|FALDA|VESTIDO|BLUSA|CHALECO|ROP[OÓ]N|TRAJE|SHORT|SUDADERA|PLAYER|POLO|SU[EÉ]TER|ABRIGO|CHAMARRA|MAMEL|BODY|CONJUNTO|OVEROL|SACO|FILIPINA|ENTERIZO|BATA|LEOTARDO|CALCET|CALZA|ZAPAT|FAJA|PETO|MALLA/.test(
      u,
    )
  ) {
    return "nino";
  }
  return "accesorio";
}

function celdasUtiles(line: string): string[] {
  return line
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
}

export function parseCatalogoCsv(text: string): Producto[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const seen = new Set<string>();
  const productos: Producto[] = [];

  for (let i = 0; i < lines.length; i++) {
    const cells = celdasUtiles(lines[i]);
    const claveIdx = cells.findIndex((c) => /^clave:$/i.test(c));
    if (claveIdx < 0) continue;
    const clave = (cells[claveIdx + 1] ?? "").trim();
    if (!clave || seen.has(clave.toUpperCase())) continue;
    seen.add(clave.toUpperCase());

    let nombre = "";
    for (let j = i - 1; j >= 0; j--) {
      const prev = celdasUtiles(lines[j]);
      if (prev.length === 0) continue;
      if (prev.some((c) => META.test(c))) continue;
      if (/zogbi/i.test(prev.join(" "))) continue;
      nombre = prev[0];
      break;
    }
    if (!nombre) continue;

    const esquema = esquemaPorNombre(nombre);
    productos.push({
      id: `p-${clave.replace(/[^a-zA-Z0-9_-]/g, "_")}`,
      sku: clave,
      nombre,
      categoria: "",
      unidad: "pza",
      existencia: 0,
      minimo: 0,
      ubicacion: "",
      esquemaConteo: esquema,
      colores: ["Único"],
      existenciasSucursal: [],
    });
  }
  return productos;
}

export function leerFotosCatalogo(): Record<string, string> {
  const path = join(process.cwd(), "data", "catalogo-fotos.json");
  if (!existsSync(path)) return {};
  const raw = JSON.parse(readFileSync(path, "utf8")) as Record<string, string>;
  const out: Record<string, string> = {};
  for (const [sku, foto] of Object.entries(raw)) {
    out[sku] = foto;
    out[sku.toUpperCase()] = foto;
  }
  return out;
}

export function leerCatalogoIza(): Producto[] {
  const path = join(process.cwd(), "data", "catalogo.csv");
  const fotos = leerFotosCatalogo();
  return parseCatalogoCsv(readFileSync(path, "utf8")).map((p) => {
    const foto = p.foto || fotos[p.sku] || fotos[p.sku.toUpperCase()];
    return foto ? { ...p, foto } : p;
  });
}
