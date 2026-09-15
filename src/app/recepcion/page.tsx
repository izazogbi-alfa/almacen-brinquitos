"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AsyncGate, EmptyView } from "@/components/status-views";
import { formatoFecha } from "@/lib/format";
import { pendienteDeLinea, progresoRecepcion } from "@/lib/mock-data";
import { useInventory } from "@/lib/inventory-context";

function RecepcionListaContent() {
  const { pedidos } = useInventory();
  const pendientes = pedidos.filter(
    (p) => p.estado === "enviado" || p.estado === "parcial",
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Recepción de mercancía
        </h2>
        <p className="text-sm text-muted-foreground">
          Captura lo que llegó contra el pedido original
        </p>
      </div>

      {pendientes.length === 0 ? (
        <EmptyView
          titulo="Nada por recibir"
          detalle="No hay pedidos abiertos. Cuando envíes una orden, aparecerá aquí para andén."
        />
      ) : (
        <ul className="space-y-3">
          {pendientes.map((pedido) => {
            const prog = progresoRecepcion(pedido);
            const lineasPend = pedido.lineas.filter((l) => pendienteDeLinea(l) > 0)
              .length;
            return (
              <li key={pedido.id}>
                <Link href={`/recepcion/${pedido.id}`}>
                  <Card className="transition-colors hover:bg-muted/40">
                    <CardContent className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{pedido.folio}</p>
                          <p className="text-sm text-muted-foreground">
                            {pedido.proveedor}
                          </p>
                        </div>
                        <Badge variant={pedido.estado === "parcial" ? "destructive" : "outline"}>
                          {pedido.estado === "parcial" ? "Parcial" : "Por recibir"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatoFecha(pedido.fecha)} · {lineasPend} líneas con
                        pendiente · {prog.pendiente} pzas
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

export default function RecepcionPage() {
  return (
    <AsyncGate>
      <RecepcionListaContent />
    </AsyncGate>
  );
}
