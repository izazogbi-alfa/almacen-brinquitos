"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AsyncGate, EmptyView } from "@/components/status-views";
import {
  CapturaArticulo,
  type LineaTabla,
} from "@/components/captura-articulo";
import { useInventory } from "@/lib/inventory-context";
import { puede } from "@/lib/modulos";

function NuevoPedidoContent() {
  const router = useRouter();
  const { productos, user, crearPedido } = useInventory();
  const [proveedor, setProveedor] = useState("Proveedor Brinquitos");
  const [notas, setNotas] = useState("");
  const [tabla, setTabla] = useState<LineaTabla[]>([]);
  const [enviando, setEnviando] = useState(false);

  if (!puede(user, "pedidos")) {
    return (
      <EmptyView
        titulo="Solo Iza autoriza pedidos"
        detalle="Los operadores no arman órdenes de compra."
      />
    );
  }

  async function guardar() {
    const lineas = tabla.flatMap((ln) =>
      ln.pares.map((p) => ({
        productoId: ln.productoId,
        cantidad: p.cantidad,
        costoUnitario: 22,
        talla: p.talla || undefined,
        color: ln.color,
        sucursalId: ln.sucursalId,
        sucursalNombre: ln.sucursalNombre,
      })),
    );
    if (lineas.length === 0) {
      toast.error("Agrega al menos un artículo.");
      return;
    }
    setEnviando(true);
    try {
      const pedido = await crearPedido({
        proveedor,
        notas,
        lineas,
      });
      toast.success(`${pedido.folio} listo para autorizar`);
      router.push(`/pedidos/${pedido.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Nuevo pedido
        </h2>
        <p className="text-sm text-muted-foreground">
          Color, talla y cantidad. Cada color (o línea) confirmado baja a la
          tabla. Iza autoriza.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="proveedor">Proveedor</Label>
        <Input
          id="proveedor"
          className="h-11"
          value={proveedor}
          onChange={(e) => setProveedor(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notas">Notas</Label>
        <Input
          id="notas"
          className="h-11"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
        />
      </div>
      <CapturaArticulo
        productos={productos}
        modo="pedido"
        acento="azul"
        usuarioNombre={user?.nombre}
        onTablaChange={setTabla}
        extraAfter={
          <Button
            type="button"
            className="h-11 w-full"
            disabled={enviando}
            onClick={() => void guardar()}
          >
            {enviando ? "Guardando…" : "Guardar para autorizar"}
          </Button>
        }
        onCommit={() => {
          toast.success("Color agregado al pedido");
        }}
      />
    </div>
  );
}

export default function NuevoPedidoPage() {
  return (
    <AsyncGate>
      <NuevoPedidoContent />
    </AsyncGate>
  );
}
