import { jsPDF } from "jspdf";

function plano(texto: string) {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

export function descargarPdf(
  archivo: string,
  titulo: string,
  lineas: string[],
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(plano(titulo), 14, 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  let y = 28;
  for (const linea of lineas) {
    const wrapped = doc.splitTextToSize(plano(linea), 182);
    for (const row of wrapped) {
      if (y > 280) {
        doc.addPage();
        y = 18;
      }
      doc.text(row, 14, y);
      y += 6;
    }
  }
  doc.save(archivo);
}
