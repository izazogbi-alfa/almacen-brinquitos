import { jsPDF } from "jspdf";
import { layoutCajasTalla, PDF_JSPDF, PDF_MARGEN_MM } from "../src/lib/pdf-layout.ts";

const doc = new jsPDF(PDF_JSPDF);
const w = doc.internal.pageSize.getWidth();
const h = doc.internal.pageSize.getHeight();
const landscape = w > h;
const letterW = Math.abs(w - 279.4) < 0.2;
const letterH = Math.abs(h - 215.9) < 0.2;
if (!landscape || !letterW || !letterH) {
  console.error("page size", { w, h });
  process.exit(1);
}

const xc = layoutCajasTalla(32, w, PDF_MARGEN_MM);
if (xc.colTalla !== 8) {
  console.error("32 sizes should be 8mm", xc);
  process.exit(1);
}
if (PDF_MARGEN_MM + xc.anchoTabla > w + 1e-6) {
  console.error("overflow", { w, xc });
  process.exit(1);
}

console.log("ok jspdf letter landscape", { w, h, xc });
