"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AsyncGate, EmptyView } from "@/components/status-views";
import { PROVEEDORES } from "@/lib/mock-data";
import { useInventory } from "@/lib/inventory-context";

type LineaDraft = {
  key: string;
  productoId: string;
  cantidad: string;
};

function NuevoPedidoContent() {
  const router = useRouter();
  const { productos, crearPedido } = useInventory();
  const [proveedor, setProveedor] = useState<string>(PROVEEDORES[0]);
  const [notas, setNotas] = useState("");
  const [lineas, setLineas] = useState<LineaDraft[]>([
    { key: "l1", productoId: productos[0]?.id ?? "", cantidad: "12" },
  ]);
  const [enviando, setEnviando] = useState(false);

  const usados = useMemo(
    () => new Set(lineas.map((l) => l.productoId)),
    [lineas],
  );

  function agregarLinea() {
    const siguiente = productos.find((p) => !usados.has(p.id));
    if (!siguiente) {
      toast.error("Ya agregaste todos los productos del catálogo.");
      return;
    }
    setLineas((prev) => [
      ...prev,
      { key: `l${Date.now()}`, productoId: siguiente.id, cantidad: "1" },
    ]);
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const parseadas = lineas
      .map((l) => ({
        productoId: l.productoId,
        cantidad: Number(l.cantidad),
        costoUnitario:
          productos.find((p) => p.id === l.productoId)?.existencia != null
            ? 20
            : 20,
      }))
      .filter((l) => l.productoId && l.cantidad > 0);

    if (parseadas.length === 0) {
      toast.error("Agrega al menos una línea con cantidad.");
      return;
    }

    setEnviando(true);
    try {
      const pedido = await crearPedido({
        proveedor,
        notas,
        lineas: parseadas.map((l) => ({
          ...l,
          costoUnitario:
            l.productoId === "p-papel"
              ? 89
              : l.productoId === "p-aceite"
                ? 41
                : 22,
        })),
      });
      toast.success(`${pedido.folio} enviado al proveedor`);
      router.push(`/pedidos/${pedido.id}`);
    } catch {
      toast.error("No se pudo crear el pedido.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Nuevo pedido
        </h2>
        <p className="text-sm text-muted-foreground">
          Orden simple a un proveedor. Se marca como enviado al guardar.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="proveedor">Proveedor</Label>
        <Select value={proveedor} onValueChange={(v) => setProveedor(String(v))}>
          <SelectTrigger id="proveedor" className="h-11 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROVEEDORES.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notas">Notas (opcional)</Label>
        <Input
          id="notas"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Andén, horario o instrucciones"
          className="h-11"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Líneas</Label>
          <Button type="button" variant="outline" size="sm" onClick={agregarLinea}>
            Agregar línea
          </Button>
        </div>

        {lineas.length === 0 ? (
          <EmptyView
            titulo="Sin líneas"
            detalle="Agrega productos para armar el pedido."
          />
        ) : (
          <ul className="space-y-2">
            {lineas.map((linea, idx) => (
              <li key={linea.key}>
                <Card size="sm">
                  <CardContent className="flex items-end gap-2">
                    <div className="min-w-0 flex-1 space-y-1">
                      <Label className="text-xs">Producto</Label>
                      <Select
                        value={linea.productoId}
                        onValueChange={(v) =>
                          setLineas((prev) =>
                            prev.map((l) =>
                              l.key === linea.key
                                ? { ...l, productoId: String(v) }
                                : l,
                            ),
                          )
                        }
                      >
                        <SelectTrigger className="h-11 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {productos.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-20 space-y-1">
                      <Label className="text-xs">Cant.</Label>
                      <Input
                        inputMode="numeric"
                        className="h-11"
                        value={linea.cantidad}
                        onChange={(e) =>
                          setLineas((prev) =>
                            prev.map((l) =>
                              l.key === linea.key
                                ? { ...l, cantidad: e.target.value }
                                : l,
                            ),
                          )
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="mb-0.5 size-11"
                      aria-label={`Quitar línea ${idx + 1}`}
                      onClick={() =>
                        setLineas((prev) => prev.filter((l) => l.key !== linea.key))
                      }
                    >
                      <Trash2 />
                    </Button>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Button type="submit" className="h-11 w-full" disabled={enviando}>
        {enviando ? "Guardando…" : "Crear y enviar pedido"}
      </Button>
    </form>
  );
}

export default function NuevoPedidoPage() {
  return (
    <AsyncGate>
      <NuevoPedidoContent />
    </AsyncGate>
  );
}
