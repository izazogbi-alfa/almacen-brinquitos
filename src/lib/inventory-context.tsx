"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  CierreDia,
  Movimiento,
  Pedido,
  Producto,
  Recepcion,
  UsuarioPublico,
  AppStatus,
} from "@/lib/types";

type NuevaLinea = {
  productoId: string;
  cantidad: number;
  costoUnitario: number;
};

type InventoryValue = {
  status: AppStatus;
  user: UsuarioPublico | null;
  productos: Producto[];
  pedidos: Pedido[];
  recepciones: Recepcion[];
  movimientos: Movimiento[];
  cierres: CierreDia[];
  retry: () => void;
  logout: () => Promise<void>;
  retirar: (productoId: string, cantidad: number) => Promise<void>;
  contar: (productoId: string, existencia: number) => Promise<void>;
  cerrarDia: () => Promise<void>;
  crearPedido: (input: {
    proveedor: string;
    notas: string;
    lineas: NuevaLinea[];
  }) => Promise<Pedido>;
  registrarRecepcion: (
    pedidoId: string,
    lineas: { productoId: string; cantidad: number }[],
  ) => Promise<void>;
};

const InventoryContext = createContext<InventoryValue | null>(null);

async function parseError(res: Response) {
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  return data?.error ?? "No se pudo completar la acción.";
}

export function InventoryProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [status, setStatus] = useState<AppStatus>(
    pathname === "/login" ? "ready" : "loading",
  );
  const [user, setUser] = useState<UsuarioPublico | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [recepciones, setRecepciones] = useState<Recepcion[]>([]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [cierres, setCierres] = useState<CierreDia[]>([]);

  const recargar = useCallback(async () => {
    const res = await fetch("/api/state", { credentials: "include" });
    if (res.status === 401) {
      setUser(null);
      if (pathname !== "/login") router.replace("/login");
      throw new Error("Sesión expirada");
    }
    if (!res.ok) throw new Error(await parseError(res));
    const data = await res.json();
    setUser(data.user);
    setProductos(data.productos);
    setPedidos(data.pedidos);
    setRecepciones(data.recepciones);
    setMovimientos(data.movimientos ?? []);
    setCierres(data.cierres ?? []);
  }, [pathname, router]);

  useEffect(() => {
    if (pathname === "/login") return;
    let cancelado = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga de sesión desde el API
    void recargar()
      .then(() => {
        if (!cancelado) setStatus("ready");
      })
      .catch(() => {
        if (!cancelado) setStatus("error");
      });
    return () => {
      cancelado = true;
    };
  }, [pathname, recargar]);

  const retry = useCallback(() => {
    setStatus("loading");
    recargar()
      .then(() => setStatus("ready"))
      .catch(() => setStatus("error"));
  }, [recargar]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
    router.replace("/login");
  }, [router]);

  const postAccion = useCallback(
    async (body: Record<string, unknown>) => {
      const res = await fetch("/api/acciones", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await parseError(res));
      const data = await res.json();
      await recargar();
      return data;
    },
    [recargar],
  );

  const retirar = useCallback(
    async (productoId: string, cantidad: number) => {
      await postAccion({ accion: "retirar", productoId, cantidad });
    },
    [postAccion],
  );

  const contar = useCallback(
    async (productoId: string, existencia: number) => {
      await postAccion({ accion: "contar", productoId, existencia });
    },
    [postAccion],
  );

  const cerrarDia = useCallback(async () => {
    await postAccion({ accion: "cerrar-dia" });
  }, [postAccion]);

  const crearPedido = useCallback(
    async (input: {
      proveedor: string;
      notas: string;
      lineas: NuevaLinea[];
    }) => {
      const data = await postAccion({ accion: "pedido", ...input });
      return data.pedido as Pedido;
    },
    [postAccion],
  );

  const registrarRecepcion = useCallback(
    async (
      pedidoId: string,
      lineas: { productoId: string; cantidad: number }[],
    ) => {
      await postAccion({ accion: "recepcion", pedidoId, lineas });
    },
    [postAccion],
  );

  const value = useMemo(
    () => ({
      status,
      user,
      productos,
      pedidos,
      recepciones,
      movimientos,
      cierres,
      retry,
      logout,
      retirar,
      contar,
      cerrarDia,
      crearPedido,
      registrarRecepcion,
    }),
    [
      status,
      user,
      productos,
      pedidos,
      recepciones,
      movimientos,
      cierres,
      retry,
      logout,
      retirar,
      contar,
      cerrarDia,
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
