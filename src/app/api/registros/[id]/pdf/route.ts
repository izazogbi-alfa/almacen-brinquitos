import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { exigirUsuario } from "@/server/auth";
import { puedeAccederRegistro } from "@/server/registro-access";
import { hidratarCatalogos } from "@/server/store";
import { urlPdfRegistro } from "@/server/blob-media";
import { logoParaPdf } from "@/server/blob-media";
import { construirPdfDeRegistro } from "@/lib/pdf-registro";
import { registroTieneLineas, mensajeRegistroSinLineas } from "@/lib/pdf-registro";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { user, error } = await exigirUsuario();
  if (!user) {
    return (
      error ??
      NextResponse.json({ error: "Inicia sesión para continuar." }, { status: 401 })
    );
  }
  const { id } = await context.params;
  const jar = await cookies();
  const store = await hidratarCatalogos((name) => jar.get(name)?.value);
  const sesion = store.sesiones.find((s) => s.id === id);
  if (!sesion) {
    return NextResponse.json({ error: "Ese registro ya no está." }, { status: 404 });
  }
  if (!puedeAccederRegistro(user, sesion)) {
    return NextResponse.json({ error: "No tienes acceso a ese registro." }, { status: 403 });
  }
  const remoto = await urlPdfRegistro(id);
  if (remoto) {
    try {
      const res = await fetch(remoto, { cache: "no-store" });
      if (res.ok) {
        return new NextResponse(await res.arrayBuffer(), {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="${id}.pdf"`,
          },
        });
      }
    } catch (err) {
      console.error("pdf blob fetch failed", err);
    }
  }
  if (!registroTieneLineas(sesion)) {
    return NextResponse.json({ error: mensajeRegistroSinLineas() }, { status: 400 });
  }
  const logoDataUrl = await logoParaPdf(store.catalogos.logoDataUrl);
  const doc = construirPdfDeRegistro(sesion, {
    catalogos: { ...store.catalogos, logoDataUrl },
    productos: store.productos,
  });
  return new NextResponse(doc.output("arraybuffer"), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${id}.pdf"`,
    },
  });
}
