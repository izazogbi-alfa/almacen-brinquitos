import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { exigirUsuario, jsonUsuario } from "@/server/auth";
import { hidratarCatalogos } from "@/server/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, error } = await exigirUsuario();
  if (!user) {
    return (
      error ??
      NextResponse.json({ error: "Inicia sesión para continuar." }, { status: 401 })
    );
  }
  const jar = await cookies();
  const store = await hidratarCatalogos((name) => jar.get(name)?.value);
  return NextResponse.json({
    user: jsonUsuario(user),
    productos: store.productos,
    pedidos: store.pedidos,
    recepciones: store.recepciones,
    movimientos: store.movimientos.slice(0, 80),
    cierres: store.cierres.slice(0, 40),
    ultimoGuardado: store.ultimoGuardado,
    catalogos: store.catalogos,
    catalogosGuardadosEn: store.catalogosGuardadosEn ?? null,
    asignacionesGuardadosEn: store.asignacionesGuardadosEn ?? null,
  });
}
