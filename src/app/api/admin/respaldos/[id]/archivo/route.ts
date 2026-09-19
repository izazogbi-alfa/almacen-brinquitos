import { NextResponse } from "next/server";
import {
  aArchivo,
  nombreArchivoRespaldo,
} from "@/lib/respaldos";
import { exigirAdmin } from "@/server/auth";
import { obtenerRespaldo } from "@/server/respaldos";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { user, error } = await exigirAdmin();
  if (!user) {
    return (
      error ??
      NextResponse.json(
        { error: "Solo quien administra puede bajar un respaldo." },
        { status: 403 },
      )
    );
  }
  const { id } = await context.params;
  const respaldo = await obtenerRespaldo(id);
  if (!respaldo) {
    return NextResponse.json(
      { error: "No está esa copia." },
      { status: 404 },
    );
  }
  const archivo = aArchivo(respaldo);
  const nombre = nombreArchivoRespaldo(respaldo);
  return new NextResponse(JSON.stringify(archivo, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nombre}"`,
    },
  });
}
