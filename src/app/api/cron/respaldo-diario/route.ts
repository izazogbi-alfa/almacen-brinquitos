import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { agregarRespaldo } from "@/server/respaldos";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function autorizado(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization") ?? "";
  if (secret) {
    const expected = `Bearer ${secret}`;
    try {
      const a = Buffer.from(auth);
      const b = Buffer.from(expected);
      if (a.length !== b.length) return false;
      return timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }
  return request.headers.get("x-vercel-cron") === "1";
}

async function correr(request: Request) {
  if (!autorizado(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    const resultado = await agregarRespaldo({
      origen: "automatico",
      leerCookie: () => undefined,
    });
    return NextResponse.json({
      ok: true,
      creado: resultado.creado,
      yaHabia: resultado.yaHabia,
      id: resultado.meta.id,
      dia: resultado.meta.dia,
    });
  } catch (err) {
    console.error("cron respaldo diario failed");
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "No se pudo hacer el respaldo del día.",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return correr(request);
}

export async function POST(request: Request) {
  return correr(request);
}
