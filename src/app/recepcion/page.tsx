"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AsyncGate, EmptyView } from "@/components/status-views";
import { CapturaArticulo } from "@/components/captura-articulo";
import {
  BotonPendiente,
  BotonTerminarSesion,
  EstadoSesion,
  movimientosDeSesionVisible,
  useBorradorSesion,
  useCierrePorInactividad,
  useRegistroCaptura,
} from "@/components/estado-sesion";
import { formatoFecha } from "@/lib/format";
import { useInventory } from "@/lib/inventory-context";
import { descargarPdfBloques, encabezadoInforme } from "@/lib/pdf";
import { puede } from "@/lib/modulos";
import { bloquesDesdeCeldas } from "@/lib/tabla-bloques";
import { sesionAbiertaDe, sesionVisibleHoy } from "@/lib/sesion-captura";

function RecepcionContent() {
  const { productos, movimientos, sesiones, user, catalogos, entrada } =
    useInventory();
  const [guardando, setGuardando] = useState(false);
  const [capturaNonce, setCapturaNonce] = useState(0);
  const guardarBorrador = useBorradorSesion("recepcion");
  const { pendienteGuardar, terminarGuardar } = useRegistroCaptura("recepcion");
  useCierrePorInactividad("recepcion");

  const abierta = sesionAbiertaDe(sesiones, "recepcion");
  const sesion = sesionVisibleHoy(sesiones, "recepcion");
  const deSesion = movimientosDeSesionVisible(
    movimientos,
    sesiones,
    "recepcion",
    "recepcion",
  );

  if (!puede(user, "recepcion")) {
    return (
      <EmptyView
        titulo="Sin acceso a recepción"
        detalle="Pide a Iza que te asigne el módulo de recepción."
      />
    );
  }

  function pdf() {
    const cuando = sesion?.cerradaEn || sesion?.ultimaActividad;
    const filas = deSesion.map((m) => {
      const prod = productos.find((p) => p.id === m.productoId);
      return {
        productoId: m.productoId ?? "",
        sku: prod?.sku ?? "",
        nombre: m.productoNombre ?? prod?.nombre ?? "",
        color: m.color ?? "Único",
        sucursalId: m.sucursalId,
        sucursalNombre: m.sucursalNombre,
        talla: m.talla ?? "",
        cantidad: m.cantidad,
      };
    });
    descargarPdfBloques(
      `entrada-${sesion?.id ?? "sesion"}.pdf`,
      "Entrada de mercancía",
      [],
      bloquesDesdeCeldas(filas, { productos, catalogos }),
      encabezadoInforme(catalogos, {
        tituloDoc: "Entrada de mercancía",
        sucursal: filas.find((f) => f.sucursalNombre)?.sucursalNombre,
        fecha: formatoFecha(cuando ?? new Date().toISOString()),
        quien: user?.nombre,
        claveSolo: false,
      }),
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight text-emerald-800">
          Entrada de mercancía
        </h2>
        <BotonPendiente
          modulo="recepcion"
          onReanudada={() => setCapturaNonce((n) => n + 1)}
        />
        <EstadoSesion modulo="recepcion" />
        <BotonTerminarSesion modulo="recepcion" />
        <p className="mt-1 text-sm text-emerald-800/80">
          Misma captura que existencias, en verde. Marca varias prendas del
          mismo esquema; el PDF junta esta sesión. A los 10 minutos sin
          capturar, la lista se congela. Si quedó a medias, Continuar este
          registro reabre esa misma entrada.
        </p>
      </div>
      <CapturaArticulo
        key={`recepcion-captura-${capturaNonce}`}
        productos={productos}
        modo="entrada"
        acento="verde"
        usuarioNombre={user?.nombre}
        guardando={guardando}
        lineasIniciales={abierta?.borrador?.lineas}
        sucursalInicial={abierta?.borrador?.sucursalId}
        onTablaChange={guardarBorrador}
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
        extraAfter={
          deSesion.length > 0 ? (
            <Button
              type="button"
              variant="outline"
              className="w-full border-emerald-700 text-emerald-800"
              onClick={pdf}
            >
              Descargar PDF de esta sesión
            </Button>
          ) : null
        }
        onCommit={async (p) => {
          setGuardando(true);
          try {
            await entrada(p.producto.id, p.sucursalId, p.celdas);
            toast.success(`Entrada en ${p.sucursalNombre}`);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "No se pudo guardar.");
          } finally {
            setGuardando(false);
          }
        }}
      />
    </div>
  );
}

export default function RecepcionPage() {
  return (
    <AsyncGate>
      <RecepcionContent />
    </AsyncGate>
  );
}
