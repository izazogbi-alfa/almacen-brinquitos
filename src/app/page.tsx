"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AsyncGate, EmptyView } from "@/components/status-views";
import { CapturaArticulo } from "@/components/captura-articulo";
import {
  BotonTerminarSesion,
  EstadoSesion,
  movimientosDeSesionVisible,
  useBorradorSesion,
  useCierrePorInactividad,
  useRegistroCaptura,
} from "@/components/estado-sesion";
import { formatoFecha, formatoFechaHora } from "@/lib/format";
import { useInventory } from "@/lib/inventory-context";
import { descargarPdfBloques, encabezadoInforme } from "@/lib/pdf";
import { puede } from "@/lib/modulos";
import {
  bloquesDesdeCeldas,
  type CeldaPlana,
} from "@/lib/tabla-bloques";
import { sesionAbiertaDe, sesionVisibleHoy } from "@/lib/sesion-captura";

function ExistenciasContent() {
  const { productos, movimientos, sesiones, user, catalogos, contar, latidoSesion } =
    useInventory();
  const [vista, setVista] = useState<"contar" | "hoy">("contar");
  const [guardando, setGuardando] = useState(false);
  const guardarBorrador = useBorradorSesion("existencias");
  const { pendienteGuardar, terminarGuardar } =
    useRegistroCaptura("existencias");

  useCierrePorInactividad("existencias", () => setVista("hoy"));

  const abierta = sesionAbiertaDe(sesiones, "existencias");
  const sesion = sesionVisibleHoy(sesiones, "existencias");
  const deSesion = movimientosDeSesionVisible(
    movimientos,
    sesiones,
    "existencias",
    "conteo",
  );

  if (!puede(user, "existencias")) {
    return (
      <EmptyView
        titulo="Sin acceso a existencias"
        detalle="Pide a Iza que te asigne el módulo de existencias."
      />
    );
  }

  function celdasDeSesion(): CeldaPlana[] {
    return deSesion.map((m) => {
      const prod = productos.find((p) => p.id === m.productoId);
      return {
        productoId: m.productoId ?? "",
        sku: prod?.sku ?? "",
        nombre: m.productoNombre ?? prod?.nombre ?? "",
        color: m.color ?? "Único",
        sucursalId: m.sucursalId,
        sucursalNombre: m.sucursalNombre,
        talla: m.talla ?? "",
        cantidad: m.existenciaDespues ?? m.cantidad,
      };
    });
  }

  function pdfDeSesion() {
    const cuando = sesion?.cerradaEn || sesion?.ultimaActividad;
    const sucursal = celdasDeSesion().find((c) => c.sucursalNombre)?.sucursalNombre;
    descargarPdfBloques(
      `existencias-${sesion?.id ?? "sesion"}.pdf`,
      "Existencias",
      [],
      bloquesDesdeCeldas(celdasDeSesion(), { productos, catalogos }),
      encabezadoInforme(catalogos, {
        tituloDoc: "Existencias",
        sucursal,
        fecha: formatoFecha(cuando ?? new Date().toISOString()),
        quien: user?.nombre,
        claveSolo: true,
      }),
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight text-teal-900">
          Existencias
        </h2>
        <EstadoSesion modulo="existencias" />
        <BotonTerminarSesion modulo="existencias" />
        <p className="mt-1 text-sm text-muted-foreground">
          Sucursal, busca, marca varias prendas del mismo esquema (un PDF).
          Elige Por talla (viene primero) o Por color. Teclado y Enter.
          Contar deja la cantidad en piso. Si quedó a medias, retómalo en
          Registros → Existencias pendientes.
        </p>
      </div>

      <Tabs value={vista} onValueChange={(v) => setVista(v as typeof vista)}>
        <TabsList className="w-full">
          <TabsTrigger value="contar">Contar</TabsTrigger>
          <TabsTrigger value="hoy">Hoy</TabsTrigger>
        </TabsList>
      </Tabs>

      {vista === "hoy" ? (
        <div className="space-y-4">
          <Button type="button" variant="outline" className="w-full" onClick={pdfDeSesion}>
            Descargar PDF de esta sesión
          </Button>
          {deSesion.length === 0 ? (
            <EmptyView
              titulo="Sin conteos en esta sesión"
              detalle="Los conteos quedan a tu nombre con sucursal y hora. Sacar ya no existe: solo se actualiza al contar."
            />
          ) : (
            <ul className="space-y-2">
              {deSesion.map((m) => (
                <li key={m.id} className="rounded-xl border p-3 text-sm">
                  <p className="font-medium">Conteo · {m.productoNombre}</p>
                  <p className="text-muted-foreground">
                    {m.sucursalNombre} · {m.userName} ·{" "}
                    {formatoFechaHora(m.timestamp)}
                    {m.talla || m.color
                      ? ` · ${m.talla ? `${m.talla} / ` : ""}${m.color ?? ""}`
                      : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <CapturaArticulo
          key="existencias-captura"
          productos={productos}
          modo="contar"
          acento="azul"
          usuarioNombre={user?.nombre}
          guardando={guardando}
          lineasIniciales={abierta?.borrador?.lineas}
          sucursalInicial={abierta?.borrador?.sucursalId}
          onTablaChange={guardarBorrador}
          onInicioRegistro={() => {
            void latidoSesion("existencias");
          }}
          onPendienteRegistro={async (lineas) => {
            setGuardando(true);
            try {
              await pendienteGuardar(lineas);
            } catch (err) {
              toast.error(
                err instanceof Error ? err.message : "No se pudo dejar pendiente.",
              );
            } finally {
              setGuardando(false);
            }
          }}
          onTerminarRegistro={async (lineas) => {
            setGuardando(true);
            try {
              await terminarGuardar(lineas);
            } catch (err) {
              toast.error(
                err instanceof Error ? err.message : "No se pudo terminar.",
              );
            } finally {
              setGuardando(false);
            }
          }}
          onCommit={async (p) => {
            setGuardando(true);
            try {
              await contar(p.producto.id, p.sucursalId, p.celdas);
              toast.success(`Conteo en ${p.sucursalNombre}`);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "No se pudo guardar.");
            } finally {
              setGuardando(false);
            }
          }}
        />
      )}
    </div>
  );
}

export default function ExistenciasPage() {
  return (
    <AsyncGate>
      <ExistenciasContent />
    </AsyncGate>
  );
}
