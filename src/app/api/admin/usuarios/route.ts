import { NextResponse } from "next/server";
import { modulosDe } from "@/lib/modulos";
import type { ModulosUsuario } from "@/lib/types";
import { exigirAdmin } from "@/server/auth";
import { publicoDe, readStore, withStore } from "@/server/store";

export async function GET() {
  const { user, error } = await exigirAdmin();
  if (!user) {
    return (
      error ??
      NextResponse.json({ error: "Solo la administradora." }, { status: 403 })
    );
  }
  const store = readStore();
  return NextResponse.json({
    usuarios: store.users.map((u) => ({
      ...publicoDe(u),
      modulos: modulosDe(u),
    })),
  });
}

export async function POST(request: Request) {
  const { user, error } = await exigirAdmin();
  if (!user) {
    return (
      error ??
      NextResponse.json({ error: "Solo la administradora." }, { status: 403 })
    );
  }
  const body = (await request.json().catch(() => null)) as {
    userId?: string;
    modulos?: ModulosUsuario;
  } | null;
  if (!body?.userId || !body.modulos) {
    return NextResponse.json({ error: "Faltan datos." }, { status: 400 });
  }
  const actualizado = withStore((store) => {
    const dest = store.users.find((u) => u.id === body.userId);
    if (!dest) throw new Error("Usuario no encontrado.");
    dest.modulos = {
      existencias: Boolean(body.modulos?.existencias),
      recepcion: Boolean(body.modulos?.recepcion),
      pedidos: dest.rol === "admin",
    };
    return publicoDe(dest);
  });
  return NextResponse.json({ usuario: actualizado });
}
