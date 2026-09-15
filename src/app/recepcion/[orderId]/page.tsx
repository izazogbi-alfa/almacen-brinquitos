"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AsyncGate, EmptyView } from "@/components/status-views";
import { pendienteDeLinea } from "@/lib/mock-data";
import { useInventory } from "@/lib/inventory-context";

function RecepcionFormContent() {
  const params = useParams<{ orderId: string }>();
  const router = useRouter();
  const { pedidos, productos, registrarRecepcion } = useInventory();
  const pedido = pedidos.find((p) => p.id === params.orderId);

  const iniciales = useMemo(() => {
    const map: Record<string, number> = {};
    pedido?.lineas.forEach((l) => {
      map[l.productoId] = pendienteDeLinea(l);
    });
    return map;
  }, [pedido]);

  const [cantidades, setCantidades] = useState<Record<string, number>>(iniciales);
  const [enviando, setEnviando] = useState(false);

  if (!pedido) {
    return (
      <EmptyView
        titulo="Pedido no encontrado"
        detalle="Elige un pedido desde Recepción."
      />
    );
  }

  const cerrado = pedido.estado === "recibido" || pedido.estado === "cancelado";

  function setQty(productoId: string, valor: number, max: number) {
    const limpio = Number.isFinite(valor) ? Math.max(0, Math.min(max, valor)) : 0;
    setCantidades((prev) => ({ ...prev, [productoId]: limpio }));
  }

  async function confirmar() {
    setEnviando(true);
    try {
      const lineas = Object.entries(cantidades).map(([productoId, cantidad]) => ({
        productoId,
        cantidad,
      }));
      await registrarRecepcion(pedido!.id, lineas);
      toast.success("Recepción registrada. Existencias actualizadas.");
      router.push(`/pedidos/${pedido!.id}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "No se pudo registrar la recepción.",
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-muted-foreground">Recibir contra</p>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          {pedido.folio}
        </h2>
        <p className="text-sm text-muted-foreground">{pedido.proveedor}</p>
      </div>

      {cerrado ? (
        <EmptyView
          titulo="Pedido cerrado"
          detalle="Ya no hay pendiente por recibir en esta orden."
        />
      ) : (
        <>
          <ul className="space-y-3">
            {pedido.lineas.map((linea) => {
              const producto = productos.find((p) => p.id === linea.productoId);
              const pend = pendienteDeLinea(linea);
              const valor = cantidades[linea.productoId] ?? 0;
              return (
                <li key={linea.productoId}>
                  <Card>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="font-medium">
                          {producto?.nombre ?? linea.productoId}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Pedido {linea.cantidad} · Ya recibido {linea.recibido} ·
                          Pendiente {pend}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="size-11"
                          disabled={valor <= 0}
                          onClick={() =>
                            setQty(linea.productoId, valor - 1, pend)
                          }
                        >
                          <Minus />
                        </Button>
                        <Input
                          inputMode="numeric"
                          className="h-11 text-center text-lg"
                          value={String(valor)}
                          onChange={(e) =>
                            setQty(
                              linea.productoId,
                              Number(e.target.value),
                              pend,
                            )
                          }
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="size-11"
                          disabled={valor >= pend}
                          onClick={() =>
                            setQty(linea.productoId, valor + 1, pend)
                          }
                        >
                          <Plus />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
          <Button
            type="button"
            className="h-11 w-full"
            disabled={enviando}
            onClick={confirmar}
          >
            {enviando ? "Registrando…" : "Confirmar recepción"}
          </Button>
        </>
      )}
    </div>
  );
}

export default function RecepcionPedidoPage() {
  const params = useParams<{ orderId: string }>();
  return (
    <AsyncGate>
      <RecepcionFormContent key={params.orderId} />
    </AsyncGate>
  );
}
