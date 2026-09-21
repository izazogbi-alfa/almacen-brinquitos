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
import {
  BotonTerminarSesion,
  EstadoSesion,
  useBorradorSesion,
  useCierrePorInactividad,
  useRegistroCaptura,
} from "@/components/estado-sesion";
import { sesionAbiertaDe } from "@/lib/sesion-captura";

function NuevoPedidoContent() {
  const router = useRouter();
  const { productos, user, crearPedido, latidoSesion, sesiones } =
    useInventory();
  const abierta = sesionAbiertaDe(sesiones, "pedidos");
  const [proveedor, setProveedor] = useState(
    abierta?.borrador?.proveedor || "Proveedor Brinquitos",
  );
  const [notas, setNotas] = useState(abierta?.borrador?.notasPedido || "");
  const [tabla, setTabla] = useState<LineaTabla[]>(
    abierta?.borrador?.lineas ?? [],
  );
  const [enviando, setEnviando] = useState(false);
  const guardarBorrador = useBorradorSesion(
    "pedidos",
    {
      proveedor,
      notasPedido: notas,
      sucursalId: abierta?.borrador?.sucursalId,
    },
    { crearSiFalta: true },
  );
  useCierrePorInactividad("pedidos");
  const { pendienteGuardar, terminarGuardar } = useRegistroCaptura("pedidos", {
    proveedor,
    notasPedido: notas,
    sucursalId: abierta?.borrador?.sucursalId,
  });

  if (!puede(user, "pedidos")) {
    return (
      <EmptyView
        titulo="Sin acceso a pedidos"
        detalle="Pide a Iza que te asigne el módulo de pedidos (solo captura). Autorizar sigue siendo de administradora."
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
          Marca varias prendas del mismo esquema. Color, luego tallas. Un
          pedido y un PDF con todas. Iza autoriza. Si quedó a medias, retómalo
          en Registros → Pedidos pendientes.
        </p>
        <EstadoSesion modulo="pedidos" />
        <BotonTerminarSesion modulo="pedidos" />
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
        key="pedido-captura"
        productos={productos}
        modo="pedido"
        acento="azul"
        usuarioNombre={user?.nombre}
        lineasIniciales={abierta?.borrador?.lineas}
        sucursalInicial={abierta?.borrador?.sucursalId}
        onTablaChange={(next) => {
          setTabla(next);
          guardarBorrador(next);
        }}
        onPendienteRegistro={async (lineas) => {
          setTabla(lineas);
          try {
            await pendienteGuardar(lineas);
          } catch (err) {
            toast.error(
              err instanceof Error ? err.message : "No se pudo dejar pendiente.",
            );
          }
        }}
        onTerminarRegistro={async (lineas) => {
          setTabla(lineas);
          try {
            await terminarGuardar(lineas);
          } catch (err) {
            toast.error(
              err instanceof Error ? err.message : "No se pudo terminar.",
            );
          }
        }}
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
        onCommit={async () => {
          await latidoSesion("pedidos", {
            proveedor,
            notasPedido: notas,
            lineas: tabla,
          });
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
