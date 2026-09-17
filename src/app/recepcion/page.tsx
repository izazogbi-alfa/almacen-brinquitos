"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AsyncGate, EmptyView } from "@/components/status-views";
import { CapturaArticulo } from "@/components/captura-articulo";
import { fechaClave, formatoFechaHora } from "@/lib/format";
import { useInventory } from "@/lib/inventory-context";
import { descargarPdf } from "@/lib/pdf";
import { puede } from "@/lib/modulos";

function RecepcionContent() {
  const { productos, movimientos, user, entrada } = useInventory();
  const [guardando, setGuardando] = useState(false);
  const hoy = fechaClave();
  const delDia = movimientos.filter(
    (m) =>
      fechaClave(new Date(m.timestamp)) === hoy && m.tipo === "recepcion",
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
    descargarPdf(`entrada-${hoy}.pdf`, `Brinquitos · Entrada ${hoy}`, [
      `Quien recibe: ${user?.nombre ?? "—"}`,
      ...delDia.map(
        (m) =>
          `${formatoFechaHora(m.timestamp)} · ${m.productoNombre ?? ""} · ${m.sucursalNombre ?? ""} · ${m.talla ?? "—"} ${m.color ?? ""} · +${m.cantidad} · ${m.userName}`,
      ),
    ]);
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight text-emerald-800">
          Entrada de mercancía
        </h2>
        <p className="text-sm text-emerald-800/80">
          Misma captura que existencias, en verde. El esquema es el de la ficha.
          Elige sucursal y confirma.
        </p>
      </div>
      <CapturaArticulo
        productos={productos}
        modo="entrada"
        acento="verde"
        usuarioNombre={user?.nombre}
        guardando={guardando}
        extraAfter={
          delDia.length > 0 ? (
            <Button
              type="button"
              variant="outline"
              className="w-full border-emerald-700 text-emerald-800"
              onClick={pdf}
            >
              Descargar PDF de entradas
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
