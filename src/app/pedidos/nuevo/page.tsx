"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AsyncGate, EmptyView } from "@/components/status-views";
import { CapturaArticulo } from "@/components/captura-articulo";
import { useInventory } from "@/lib/inventory-context";
import { puede } from "@/lib/modulos";

type Linea = {
  key: string;
  productoId: string;
  nombre: string;
  cantidad: number;
  talla?: string;
  color?: string;
  sucursalId?: string;
  sucursalNombre?: string;
};

function NuevoPedidoContent() {
  const router = useRouter();
  const { productos, user, crearPedido } = useInventory();
  const [proveedor, setProveedor] = useState("Proveedor Brinquitos");
  const [notas, setNotas] = useState("");
  const [lineas, setLineas] = useState<Linea[]>([]);
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
    if (lineas.length === 0) {
      toast.error("Agrega al menos un artículo.");
      return;
    }
    setEnviando(true);
    try {
      const pedido = await crearPedido({
        proveedor,
        notas,
        lineas: lineas.map((l) => ({
          productoId: l.productoId,
          cantidad: l.cantidad,
          costoUnitario: 22,
          talla: l.talla,
          color: l.color,
          sucursalId: l.sucursalId,
          sucursalNombre: l.sucursalNombre,
        })),
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
          Captura en cuadrícula como existencias (color × talla). Queda tabla; Iza autoriza.
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
        onCommit={(p) => {
          setLineas((prev) => [
            ...prev,
            ...p.celdas.map((c, i) => ({
              key: `l${Date.now()}-${i}`,
              productoId: p.producto.id,
              nombre: p.producto.nombre,
              cantidad: c.cantidad,
              talla: c.talla || undefined,
              color: c.color,
              sucursalId: p.sucursalId,
              sucursalNombre: p.sucursalNombre,
            })),
          ]);
          toast.success("Cuadrícula agregada a la tabla");
        }}
      />
      <div>
        <h3 className="mb-2 text-sm font-medium">Tabla del pedido</h3>
        {lineas.length === 0 ? (
          <EmptyView
            titulo="Todavía no hay líneas"
            detalle="Busca un artículo, confirma y se agrega aquí."
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead className="bg-muted/60">
                <tr>
                  <th className="p-2">Artículo</th>
                  <th className="p-2">Sucursal</th>
                  <th className="p-2">Talla</th>
                  <th className="p-2">Color</th>
                  <th className="p-2">Cant.</th>
                  <th className="p-2" />
                </tr>
              </thead>
              <tbody>
                {lineas.map((l) => (
                  <tr key={l.key} className="border-t">
                    <td className="p-2">{l.nombre}</td>
                    <td className="p-2">{l.sucursalNombre}</td>
                    <td className="p-2">{l.talla || "—"}</td>
                    <td className="p-2">{l.color}</td>
                    <td className="p-2">{l.cantidad}</td>
                    <td className="p-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setLineas((prev) => prev.filter((x) => x.key !== l.key))
                        }
                      >
                        <Trash2 />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Button
        type="button"
        className="h-11 w-full"
        disabled={enviando}
        onClick={() => void guardar()}
      >
        {enviando ? "Guardando…" : "Guardar para autorizar"}
      </Button>
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
