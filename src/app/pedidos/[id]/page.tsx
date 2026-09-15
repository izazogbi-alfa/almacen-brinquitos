"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AsyncGate, EmptyView } from "@/components/status-views";
import { etiquetaEstado, formatoFecha, formatoMoneda } from "@/lib/format";
import { cn } from "@/lib/utils";
import { pendienteDeLinea, progresoRecepcion, totalPedido } from "@/lib/mock-data";
import { useInventory } from "@/lib/inventory-context";

function DetallePedidoContent() {
  const params = useParams<{ id: string }>();
  const { pedidos, productos, recepciones } = useInventory();
  const pedido = pedidos.find((p) => p.id === params.id);

  if (!pedido) {
    return (
      <EmptyView
        titulo="Pedido no encontrado"
        detalle="Puede que el folio no exista o se haya recargado el catálogo de ejemplo."
      />
    );
  }

  const prog = progresoRecepcion(pedido);
  const historial = recepciones.filter((r) => r.pedidoId === pedido.id);
  const abierto = pedido.estado === "enviado" || pedido.estado === "parcial";

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
          <p>Importe: {formatoMoneda(totalPedido(pedido))}</p>
          <p>
            Recibido {prog.recibido} de {prog.pedidoTotal} piezas · pendiente{" "}
            {prog.pendiente}
          </p>
          {pedido.notas ? (
            <>
              <Separator />
              <p className="text-muted-foreground">{pedido.notas}</p>
            </>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Líneas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pedido.lineas.map((linea) => {
            const producto = productos.find((p) => p.id === linea.productoId);
            const pend = pendienteDeLinea(linea);
            return (
              <div key={linea.productoId} className="rounded-lg bg-muted/50 p-3">
                <p className="font-medium">
                  {producto?.nombre ?? linea.productoId}
                </p>
                <p className="text-sm text-muted-foreground">
                  Pedido {linea.cantidad} · Recibido {linea.recibido} · Pendiente{" "}
                  {pend}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatoMoneda(linea.costoUnitario)} c/u
                </p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {historial.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Recepciones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {historial.map((r) => (
              <p key={r.id}>
                {formatoFecha(r.fecha)} ·{" "}
                {r.lineas.reduce((a, l) => a + l.cantidad, 0)} pzas
              </p>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {abierto ? (
        <Link
          href={`/recepcion/${pedido.id}`}
          className={cn(buttonVariants(), "h-11 w-full")}
        >
          Recibir mercancía
        </Link>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          Este pedido ya está cerrado.
        </p>
      )}
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
