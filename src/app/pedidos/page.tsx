"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AsyncGate, EmptyView } from "@/components/status-views";
import { etiquetaEstado, formatoFecha, formatoMoneda } from "@/lib/format";
import { progresoRecepcion, totalPedido } from "@/lib/mock-data";
import { useInventory } from "@/lib/inventory-context";
import { cn } from "@/lib/utils";

const FILTROS = [
  { value: "todos", label: "Todos" },
  { value: "abiertos", label: "Abiertos" },
  { value: "recibido", label: "Recibidos" },
] as const;

function PedidosContent() {
  const { pedidos } = useInventory();
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]["value"]>(
    "todos",
  );

  const lista = useMemo(() => {
    return pedidos.filter((p) => {
      if (filtro === "abiertos") {
        return p.estado === "enviado" || p.estado === "parcial";
      }
      if (filtro === "recibido") return p.estado === "recibido";
      return true;
    });
  }, [pedidos, filtro]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl font-semibold tracking-tight">
            Pedidos
          </h2>
          <p className="text-sm text-muted-foreground">
            Órdenes de compra a proveedores
          </p>
        </div>
        <Link
          href="/pedidos/nuevo"
          className={cn(buttonVariants(), "h-10 gap-1.5 px-3")}
        >
          <Plus className="size-4" />
          Nuevo
        </Link>
      </div>

      <Tabs value={filtro} onValueChange={(v) => setFiltro(v as typeof filtro)}>
        <TabsList className="w-full">
          {FILTROS.map((f) => (
            <TabsTrigger key={f.value} value={f.value}>
              {f.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {lista.length === 0 ? (
        <EmptyView
          titulo="No hay pedidos en este filtro"
          detalle="Cambia de pestaña o crea un pedido nuevo para reponer el piso."
        />
      ) : (
        <ul className="space-y-3">
          {lista.map((pedido) => {
            const prog = progresoRecepcion(pedido);
            return (
              <li key={pedido.id}>
                <Link href={`/pedidos/${pedido.id}`}>
                  <Card className="transition-colors hover:bg-muted/40">
                    <CardContent className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{pedido.folio}</p>
                          <p className="text-sm text-muted-foreground">
                            {pedido.proveedor}
                          </p>
                        </div>
                        <Badge
                          variant={
                            pedido.estado === "recibido"
                              ? "secondary"
                              : pedido.estado === "parcial"
                                ? "destructive"
                                : "outline"
                          }
                        >
                          {etiquetaEstado(pedido.estado)}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>{formatoFecha(pedido.fecha)}</span>
                        <span>{formatoMoneda(totalPedido(pedido))}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Recibido {prog.recibido} de {prog.pedidoTotal} pzas
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function PedidosPage() {
  return (
    <AsyncGate>
      <PedidosContent />
    </AsyncGate>
  );
}
