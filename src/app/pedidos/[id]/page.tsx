"use client";

import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AsyncGate, EmptyView } from "@/components/status-views";
import { etiquetaEstado, formatoFecha, formatoFechaHora } from "@/lib/format";
import { useInventory } from "@/lib/inventory-context";
import { descargarPdf } from "@/lib/pdf";
import { puede } from "@/lib/modulos";

function DetallePedidoContent() {
  const params = useParams<{ id: string }>();
  const { pedidos, productos, user, autorizarPedido } = useInventory();
  const pedido = pedidos.find((p) => p.id === params.id);

  if (!pedido) {
    return (
      <EmptyView
        titulo="Pedido no encontrado"
        detalle="Puede que el folio no exista."
      />
    );
  }

  const actual = pedido;

  function pdf() {
    descargarPdf(`${actual.folio}.pdf`, `Brinquitos · ${actual.folio}`, [
      `Proveedor: ${actual.proveedor}`,
      `Estado: ${etiquetaEstado(actual.estado)}`,
      `Armó: ${actual.userName} · ${formatoFecha(actual.fecha)}`,
      actual.autorizadoPorNombre
        ? `Autorizó: ${actual.autorizadoPorNombre} · ${formatoFechaHora(actual.autorizadoEn ?? actual.fecha)}`
        : "Aún sin autorizar",
      ...actual.lineas.map((l) => {
        const prod = productos.find((x) => x.id === l.productoId);
        return `${prod?.nombre ?? l.productoId} · ${l.sucursalNombre ?? "—"} · ${l.talla ?? "—"} ${l.color ?? ""} · ${l.cantidad} pza`;
      }),
    ]);
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

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[28rem] text-left text-sm">
          <thead className="bg-muted/60">
            <tr>
              <th className="p-2">Artículo</th>
              <th className="p-2">Sucursal</th>
              <th className="p-2">Talla</th>
              <th className="p-2">Color</th>
              <th className="p-2">Cant.</th>
            </tr>
          </thead>
          <tbody>
            {pedido.lineas.map((linea, idx) => {
              const producto = productos.find((p) => p.id === linea.productoId);
              return (
                <tr key={`${linea.productoId}-${idx}`} className="border-t">
                  <td className="p-2">{producto?.nombre ?? linea.productoId}</td>
                  <td className="p-2">{linea.sucursalNombre ?? "—"}</td>
                  <td className="p-2">{linea.talla || "—"}</td>
                  <td className="p-2">{linea.color || "—"}</td>
                  <td className="p-2">{linea.cantidad}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Button type="button" variant="outline" className="h-11 w-full" onClick={pdf}>
        Descargar PDF
      </Button>
      {pedido.estado === "borrador" && puede(user, "pedidos") ? (
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
