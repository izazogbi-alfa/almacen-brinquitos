"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AsyncGate, EmptyView } from "@/components/status-views";
import { CapturaArticulo } from "@/components/captura-articulo";
import { fechaClave } from "@/lib/format";
import { useInventory } from "@/lib/inventory-context";
import { descargarPdfBloques } from "@/lib/pdf";
import { puede } from "@/lib/modulos";
import { bloquesDesdeCeldas } from "@/lib/tabla-bloques";

function RecepcionContent() {
  const { productos, movimientos, user, catalogos, entrada } = useInventory();
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
    descargarPdfBloques(
      `entrada-${hoy}.pdf`,
      `Brinquitos · Entrada ${hoy}`,
      [`Quien recibe: ${user?.nombre ?? "—"}`],
      bloquesDesdeCeldas(
        delDia.map((m) => {
          const prod = productos.find((p) => p.id === m.productoId);
          return {
            productoId: m.productoId,
            sku: prod?.sku ?? "",
            nombre: m.productoNombre ?? prod?.nombre ?? "",
            color: m.color ?? "Único",
            sucursalId: m.sucursalId,
            sucursalNombre: m.sucursalNombre,
            talla: m.talla ?? "",
            cantidad: m.cantidad,
          };
        }),
        { productos, catalogos },
      ),
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight text-emerald-800">
          Entrada de mercancía
        </h2>
        <p className="text-sm text-emerald-800/80">
          Misma captura que existencias, en verde. Marca varias prendas del
          mismo esquema; el PDF de la tabla y el de entradas las junta.
          Tabla: clave arriba, colores en filas, tallas en columnas.
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
