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
  talla?: string;
  color?: string;
  sucursalId?: string;
  sucursalNombre?: string;
};

type CeldaAccion = { talla?: string; color?: string; cantidad: number };

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
  retirar: (
    productoId: string,
    sucursalId: string,
    celdas: CeldaAccion[],
  ) => Promise<void>;
  contar: (
    productoId: string,
    sucursalId: string,
    celdas: CeldaAccion[],
  ) => Promise<void>;
  entrada: (
    productoId: string,
    sucursalId: string,
    celdas: CeldaAccion[],
  ) => Promise<void>;
  cerrarDia: () => Promise<void>;
  crearPedido: (input: {
    proveedor: string;
    notas: string;
    lineas: NuevaLinea[];
  }) => Promise<Pedido>;
  autorizarPedido: (pedidoId: string) => Promise<Pedido>;
  guardarArticulo: (input: {
    id: string;
    nombre: string;
    sku: string;
    categoria: string;
    esquemaConteo: Producto["esquemaConteo"];
    colores: string;
    tallas: string;
  }) => Promise<void>;
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
    async (productoId: string, sucursalId: string, celdas: CeldaAccion[]) => {
      await postAccion({ accion: "retirar", productoId, sucursalId, celdas });
    },
    [postAccion],
  );

  const contar = useCallback(
    async (productoId: string, sucursalId: string, celdas: CeldaAccion[]) => {
      await postAccion({ accion: "contar", productoId, sucursalId, celdas });
    },
    [postAccion],
  );

  const entrada = useCallback(
    async (productoId: string, sucursalId: string, celdas: CeldaAccion[]) => {
      await postAccion({ accion: "entrada", productoId, sucursalId, celdas });
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

  const autorizarPedido = useCallback(
    async (pedidoId: string) => {
      const data = await postAccion({ accion: "autorizar-pedido", pedidoId });
      return data.pedido as Pedido;
    },
    [postAccion],
  );

  const guardarArticulo = useCallback(
    async (input: {
      id: string;
      nombre: string;
      sku: string;
      categoria: string;
      esquemaConteo: Producto["esquemaConteo"];
      colores: string;
      tallas: string;
    }) => {
      const res = await fetch("/api/admin/articulos", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(await parseError(res));
      await recargar();
    },
    [recargar],
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
      entrada,
      cerrarDia,
      crearPedido,
      autorizarPedido,
      guardarArticulo,
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
      entrada,
      cerrarDia,
      crearPedido,
      autorizarPedido,
      guardarArticulo,
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
