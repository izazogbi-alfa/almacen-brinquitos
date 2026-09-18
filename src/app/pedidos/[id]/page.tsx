"use client";

import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AsyncGate, EmptyView } from "@/components/status-views";
import { TablaPrendas } from "@/components/tabla-prendas";
import { etiquetaEstado, formatoFecha, formatoFechaHora } from "@/lib/format";
import { useInventory } from "@/lib/inventory-context";
import { descargarPdfBloques } from "@/lib/pdf";
import { puede, puedeAutorizarPedidos } from "@/lib/modulos";
import {
  bloquesDesdeCeldas,
  lineasDesdeCeldasPlanas,
} from "@/lib/tabla-bloques";

function DetallePedidoContent() {
  const params = useParams<{ id: string }>();
  const { pedidos, productos, user, autorizarPedido } = useInventory();
  const pedido = pedidos.find((p) => p.id === params.id);

  if (!puede(user, "pedidos")) {
    return (
      <EmptyView
        titulo="Sin acceso a pedidos"
        detalle="Pide a Iza que te asigne el módulo de pedidos."
      />
    );
  }

  if (!pedido) {
    return (
      <EmptyView
        titulo="Pedido no encontrado"
        detalle="Puede que el folio no exista."
      />
    );
  }

  const actual = pedido;
  const celdas = actual.lineas.map((l, idx) => {
    const prod = productos.find((x) => x.id === l.productoId);
    return {
      key: `${l.productoId}-${idx}`,
      productoId: l.productoId,
      sku: prod?.sku ?? l.productoId,
      nombre: prod?.nombre ?? l.productoId,
      color: l.color ?? "Único",
      sucursalId: l.sucursalId,
      sucursalNombre: l.sucursalNombre,
      talla: l.talla ?? "",
      cantidad: l.cantidad,
    };
  });
  const lineasTabla = lineasDesdeCeldasPlanas(celdas);
  const notasPdf = [
    `Proveedor: ${actual.proveedor}`,
    `Estado: ${etiquetaEstado(actual.estado)}`,
    `Armó: ${actual.userName} · ${formatoFecha(actual.fecha)}`,
    actual.autorizadoPorNombre
      ? `Autorizó: ${actual.autorizadoPorNombre} · ${formatoFechaHora(actual.autorizadoEn ?? actual.fecha)}`
      : "Aún sin autorizar",
  ];

  function pdf() {
    descargarPdfBloques(
      `${actual.folio}.pdf`,
      `Brinquitos · ${actual.folio}`,
      notasPdf,
      bloquesDesdeCeldas(celdas),
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Pedido</p>
          <h2 className="font-heading text-2xl font-semibold tracking-tight">
            {pedido.folio}
          </h2>
          <p className="text-sm text-muted-foreground">{pedido.proveedor}</p>
        </div>
        <Badge>{etiquetaEstado(pedido.estado)}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Fecha: {formatoFecha(pedido.fecha)}</p>
          {pedido.autorizadoPorNombre ? (
            <p>
              Autorizó {pedido.autorizadoPorNombre} ·{" "}
              {formatoFechaHora(pedido.autorizadoEn ?? pedido.fecha)}
            </p>
          ) : (
            <p>Pendiente de autorización de Iza</p>
          )}
          {pedido.notas ? (
            <>
              <Separator />
              <p className="text-muted-foreground">{pedido.notas}</p>
            </>
          ) : null}
        </CardContent>
      </Card>

      <TablaPrendas
        lineas={lineasTabla}
        vacioDetalle="Este pedido no tiene artículos."
        pdfArchivo={`${actual.folio}.pdf`}
        pdfTitulo={`Brinquitos · ${actual.folio}`}
        pdfNotas={notasPdf}
        mostrarPdf={false}
      />

      <Button type="button" variant="outline" className="h-11 w-full" onClick={pdf}>
        Descargar PDF
      </Button>
      {pedido.estado === "borrador" && puedeAutorizarPedidos(user) ? (
        <Button
          type="button"
          className="h-11 w-full"
          onClick={async () => {
            try {
              await autorizarPedido(pedido.id);
              toast.success("Pedido autorizado");
              pdf();
            } catch (err) {
              toast.error(
                err instanceof Error ? err.message : "No se pudo autorizar.",
              );
            }
          }}
        >
          Autorizar pedido
        </Button>
      ) : null}
    </div>
  );
}

export default function PedidoDetallePage() {
  return (
    <AsyncGate>
      <DetallePedidoContent />
    </AsyncGate>
  );
}
