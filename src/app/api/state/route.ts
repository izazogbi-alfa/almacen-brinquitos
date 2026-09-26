import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { extraerAsignaciones } from "@/lib/asignaciones-articulos";
import { exigirUsuario, jsonUsuario } from "@/server/auth";
import { cookiesAsignaciones } from "@/server/asignaciones-persist";
import { cookiesCatalogos } from "@/server/catalogos-persist";
import { hidratarCatalogos, withStore } from "@/server/store";
import { aplicarCierresPorInactividad } from "@/lib/sesion-store";
import { sesionesParaCliente } from "@/lib/sesion-captura";
import { filtrarSesionesVisibles } from "@/server/registro-access";

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
  const cerradas = aplicarCierresPorInactividad(store);
  if (cerradas.length > 0) {
    await withStore(() => undefined);
  }
  if (store.catalogosGuardadosEn && store.catalogos.esquemas.length > 0) {
    try {
      for (const c of cookiesCatalogos({
        savedAt: store.catalogosGuardadosEn,
        catalogos: store.catalogos,
      })) {
        jar.set(c);
      }
    } catch (cookieError) {
      console.error("catalogos cookie sync failed", cookieError);
    }
  }
  const asignaciones = extraerAsignaciones(store.productos);
  if (store.asignacionesGuardadosEn && Object.keys(asignaciones).length > 0) {
    try {
      for (const c of cookiesAsignaciones({
        savedAt: store.asignacionesGuardadosEn,
        asignaciones,
      })) {
        jar.set(c);
      }
    } catch (cookieError) {
      console.error("asignaciones cookie sync failed", cookieError);
    }
  }
  return NextResponse.json({
    user: jsonUsuario(user),
    productos: store.productos,
    pedidos: store.pedidos,
    recepciones: store.recepciones,
    movimientos: store.movimientos.slice(0, 80),
    sesiones: sesionesParaCliente(
      filtrarSesionesVisibles(user, store.sesiones),
    ),
    ultimoGuardado: store.ultimoGuardado,
    catalogos: store.catalogos,
    catalogosGuardadosEn: store.catalogosGuardadosEn ?? null,
    asignacionesGuardadosEn: store.asignacionesGuardadosEn ?? null,
    usuariosGuardadosEn: store.usuariosGuardadosEn ?? null,
  });
}
