"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AsyncGate, EmptyView } from "@/components/status-views";
import { CapturaArticulo } from "@/components/captura-articulo";
import { fechaClave, formatoFechaHora } from "@/lib/format";
import { useInventory } from "@/lib/inventory-context";
import { descargarPdfBloques } from "@/lib/pdf";
import { puede } from "@/lib/modulos";
import {
  bloquesDesdeCeldas,
  type CeldaPlana,
} from "@/lib/tabla-bloques";

function ExistenciasContent() {
  const {
    productos,
    movimientos,
    cierres,
    user,
    catalogos,
    contar,
    retirar,
    cerrarDia,
  } = useInventory();
  const [vista, setVista] = useState<"contar" | "sacar" | "hoy">("contar");
  const [guardando, setGuardando] = useState(false);
  const [cerrando, setCerrando] = useState(false);

  const hoy = fechaClave();
  const delDia = movimientos.filter(
    (m) =>
      fechaClave(new Date(m.timestamp)) === hoy &&
      (m.tipo === "conteo" || m.tipo === "retiro"),
  );
  const cierresHoy = cierres.filter((c) => c.fecha === hoy);
  const ultimoCierreHoy = cierresHoy[0];

  if (!puede(user, "existencias")) {
    return (
      <EmptyView
        titulo="Sin acceso a existencias"
        detalle="Pide a Iza que te asigne el módulo de existencias."
      />
    );
  }

  function celdasDelDia(): CeldaPlana[] {
    return delDia.map((m) => {
      const prod = productos.find((p) => p.id === m.productoId);
      return {
        productoId: m.productoId,
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

  function pdfDelDia() {
    descargarPdfBloques(
      `existencias-${hoy}.pdf`,
      `Brinquitos · Existencias ${hoy}`,
      [`Quien cierra: ${user?.nombre ?? "—"}`],
      bloquesDesdeCeldas(celdasDelDia(), { productos, catalogos }),
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight text-teal-900">
          Existencias
        </h2>
        {ultimoCierreHoy ? (
          <p className="text-sm text-teal-800">
            Hoy cerrado por {ultimoCierreHoy.userName} ·{" "}
            {formatoFechaHora(ultimoCierreHoy.timestamp)}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Color, talla y cantidad del esquema de la ficha. La tabla agrupa
            la misma prenda: clave arriba, colores en filas, tallas en
            columnas.
          </p>
        )}
      </div>

      <Button
        type="button"
        variant="outline"
        className="h-11 w-full"
        disabled={cerrando}
        onClick={async () => {
          setCerrando(true);
          try {
            await cerrarDia();
            toast.success("Día cerrado");
            setVista("hoy");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "No se pudo cerrar.");
          } finally {
            setCerrando(false);
          }
        }}
      >
        {cerrando ? "Guardando…" : "Cerrar el día"}
      </Button>

      <Tabs value={vista} onValueChange={(v) => setVista(v as typeof vista)}>
        <TabsList className="w-full">
          <TabsTrigger value="contar">Contar</TabsTrigger>
          <TabsTrigger value="sacar">Sacar</TabsTrigger>
          <TabsTrigger value="hoy">Hoy</TabsTrigger>
        </TabsList>
      </Tabs>

      {vista === "hoy" ? (
        <div className="space-y-4">
          <Button type="button" variant="outline" className="w-full" onClick={pdfDelDia}>
            Descargar PDF del día
          </Button>
          {cierresHoy.length === 0 && delDia.length === 0 ? (
            <EmptyView
              titulo="Sin movimientos hoy"
              detalle="Los conteos y salidas quedan a tu nombre con sucursal y hora."
            />
          ) : (
            <ul className="space-y-2">
              {delDia.map((m) => (
                <li key={m.id} className="rounded-xl border p-3 text-sm">
                  <p className="font-medium">
                    {m.tipo === "conteo" ? "Conteo" : "Salida"} ·{" "}
                    {m.productoNombre}
                  </p>
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
          productos={productos}
          modo={vista}
          acento="azul"
          usuarioNombre={user?.nombre}
          guardando={guardando}
          onCommit={async (p) => {
            setGuardando(true);
            try {
              if (vista === "contar") {
                await contar(p.producto.id, p.sucursalId, p.celdas);
                toast.success(`Conteo en ${p.sucursalNombre}`);
              } else {
                await retirar(p.producto.id, p.sucursalId, p.celdas);
                toast.success(`Salida en ${p.sucursalNombre}`);
              }
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
