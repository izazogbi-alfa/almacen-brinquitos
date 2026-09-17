import { NextResponse } from "next/server";
import { exigirUsuario, jsonUsuario } from "@/server/auth";
import { readStore } from "@/server/store";

export async function GET() {
  const { user, error } = await exigirUsuario();
  if (!user) {
    return (
      error ??
      NextResponse.json({ error: "Inicia sesión para continuar." }, { status: 401 })
    );
  }
  const store = readStore();
  return NextResponse.json({
    user: jsonUsuario(user),
    productos: store.productos,
    pedidos: store.pedidos,
    recepciones: store.recepciones,
    movimientos: store.movimientos.slice(0, 80),
    cierres: store.cierres.slice(0, 40),
    ultimoGuardado: store.ultimoGuardado,
    catalogos: store.catalogos,
  });
}
