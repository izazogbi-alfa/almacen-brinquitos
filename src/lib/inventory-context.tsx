"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  pedidosIniciales,
  pendienteDeLinea,
  productosIniciales,
  recepcionesIniciales,
} from "@/lib/mock-data";
import type {
  AppStatus,
  LineaPedido,
  Pedido,
  Producto,
  Recepcion,
} from "@/lib/types";

const LATENCIA_MS = 700;

type NuevaLinea = {
  productoId: string;
  cantidad: number;
  costoUnitario: number;
};

type InventoryValue = {
  status: AppStatus;
  productos: Producto[];
  pedidos: Pedido[];
  recepciones: Recepcion[];
  retry: () => void;
  simularFallo: () => void;
  crearPedido: (input: {
    proveedor: string;
    notas: string;
    lineas: NuevaLinea[];
  }) => Promise<Pedido>;
  registrarRecepcion: (
    pedidoId: string,
    lineas: { productoId: string; cantidad: number }[],
  ) => Promise<Recepcion>;
};

const InventoryContext = createContext<InventoryValue | null>(null);

function siguienteFolio(pedidos: Pedido[]) {
  const nums = pedidos.map((p) => Number(p.folio.replace("PO-", "")) || 0);
  const max = nums.length ? Math.max(...nums) : 1040;
  return `PO-${max + 1}`;
}

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AppStatus>("loading");
  const [productos, setProductos] = useState<Producto[]>(productosIniciales);
  const [pedidos, setPedidos] = useState<Pedido[]>(pedidosIniciales);
  const [recepciones, setRecepciones] = useState<Recepcion[]>(
    recepcionesIniciales,
  );

  const boot = useCallback((fallar: boolean) => {
    setStatus("loading");
    window.setTimeout(() => {
      setStatus(fallar ? "error" : "ready");
    }, LATENCIA_MS);
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => setStatus("ready"), LATENCIA_MS);
    return () => window.clearTimeout(id);
  }, []);

  const retry = useCallback(() => boot(false), [boot]);
  const simularFallo = useCallback(() => boot(true), [boot]);

  const crearPedido = useCallback(
    async (input: {
      proveedor: string;
      notas: string;
      lineas: NuevaLinea[];
    }) => {
      await new Promise((r) => setTimeout(r, 450));
      const pedido: Pedido = {
        id: `po-${Date.now()}`,
        folio: siguienteFolio(pedidos),
        proveedor: input.proveedor,
        fecha: new Date().toISOString(),
        estado: "enviado",
        notas: input.notas,
        lineas: input.lineas.map(
          (linea): LineaPedido => ({
            ...linea,
            recibido: 0,
          }),
        ),
      };
      setPedidos((prev) => [pedido, ...prev]);
      return pedido;
    },
    [pedidos],
  );

  const registrarRecepcion = useCallback(
    async (
      pedidoId: string,
      lineas: { productoId: string; cantidad: number }[],
    ) => {
      await new Promise((r) => setTimeout(r, 500));
      const aplicadas = lineas.filter((l) => l.cantidad > 0);
      if (aplicadas.length === 0) {
        throw new Error("Indica al menos una cantidad a recibir.");
      }

      const pedido = pedidos.find((p) => p.id === pedidoId);
      if (!pedido) throw new Error("No encontramos ese pedido.");

      for (const linea of aplicadas) {
        const original = pedido.lineas.find(
          (l) => l.productoId === linea.productoId,
        );
        if (!original) {
          throw new Error("Hay un producto que no pertenece al pedido.");
        }
        if (linea.cantidad > pendienteDeLinea(original)) {
          throw new Error("No puedes recibir más de lo pendiente.");
        }
      }

      setProductos((prev) =>
        prev.map((producto) => {
          const extra =
            aplicadas.find((l) => l.productoId === producto.id)?.cantidad ?? 0;
          return extra
            ? { ...producto, existencia: producto.existencia + extra }
            : producto;
        }),
      );

      let estadoFinal: Pedido["estado"] = "parcial";
      setPedidos((prev) =>
        prev.map((p) => {
          if (p.id !== pedidoId) return p;
          const lineasAct = p.lineas.map((linea) => {
            const extra =
              aplicadas.find((l) => l.productoId === linea.productoId)
                ?.cantidad ?? 0;
            return { ...linea, recibido: linea.recibido + extra };
          });
          const completo = lineasAct.every((l) => l.recibido >= l.cantidad);
          estadoFinal = completo ? "recibido" : "parcial";
          return { ...p, lineas: lineasAct, estado: estadoFinal };
        }),
      );

      const registro: Recepcion = {
        id: `rc-${Date.now()}`,
        pedidoId,
        fecha: new Date().toISOString(),
        lineas: aplicadas,
      };
      setRecepciones((prev) => [registro, ...prev]);
      return registro;
    },
    [pedidos],
  );

  const value = useMemo(
    () => ({
      status,
      productos,
      pedidos,
      recepciones,
      retry,
      simularFallo,
      crearPedido,
      registrarRecepcion,
    }),
    [
      status,
      productos,
      pedidos,
      recepciones,
      retry,
      simularFallo,
      crearPedido,
      registrarRecepcion,
    ],
  );

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) {
    throw new Error("useInventory debe usarse dentro de InventoryProvider");
  }
  return ctx;
}
