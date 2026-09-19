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
  Catalogos,
  CierreDia,
  Movimiento,
  Pedido,
  Producto,
  Recepcion,
  UsuarioPublico,
  AppStatus,
} from "@/lib/types";
import { catalogosVacios } from "@/lib/catalogos";
import { puede } from "@/lib/modulos";
import type { AsignacionesPersistidas } from "@/lib/asignaciones-articulos";

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
  catalogos: Catalogos;
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
    id?: string;
    nombre: string;
    sku: string;
    esquemaConteo?: string;
    colores?: string[];
    tallas?: string[];
    especificaciones?: string[];
    soloIdentidad?: boolean;
    password: string;
  }) => Promise<Producto>;
  clonarAsignacion: (input: {
    ids: string[];
    esquemaConteo?: string;
    colores?: string[];
    tallas?: string[];
    especificaciones?: string[];
    password: string;
  }) => Promise<void>;
  guardarCatalogos: (catalogos: Partial<Catalogos>) => Promise<void>;
};

const LS_CATALOGOS = "brq_catalogos";
const LS_ASIGNACIONES = "brq_asignaciones";

function leerCatalogosLocal(): {
  savedAt: string;
  catalogos: Catalogos;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LS_CATALOGOS);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      savedAt?: string;
      catalogos?: Catalogos;
    };
    if (!parsed?.catalogos || !parsed.savedAt) return null;
    return { savedAt: parsed.savedAt, catalogos: parsed.catalogos };
  } catch {
    return null;
  }
}

function escribirCatalogosLocal(savedAt: string, catalogos: Catalogos) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      LS_CATALOGOS,
      JSON.stringify({ savedAt, catalogos }),
    );
  } catch {
    /* quota */
  }
}

function leerAsignacionesLocal(): AsignacionesPersistidas | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LS_ASIGNACIONES);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AsignacionesPersistidas;
    if (!parsed?.asignaciones || !parsed.savedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

function escribirAsignacionesLocal(data: AsignacionesPersistidas) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_ASIGNACIONES, JSON.stringify(data));
  } catch {
    /* quota */
  }
}

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
  const [catalogos, setCatalogos] = useState<Catalogos>(catalogosVacios);
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
    setCatalogos(data.catalogos ?? catalogosVacios());
    setPedidos(data.pedidos);
    setRecepciones(data.recepciones);
    setMovimientos(data.movimientos ?? []);
    setCierres(data.cierres ?? []);
    const serverAt =
      typeof data.catalogosGuardadosEn === "string"
        ? data.catalogosGuardadosEn
        : "";
    const local = leerCatalogosLocal();
    if (
      local &&
      puede(data.user, "configuracion") &&
      (!serverAt || Date.parse(local.savedAt) > Date.parse(serverAt))
    ) {
      const push = await fetch("/api/admin/catalogos", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(local.catalogos),
      });
      if (push.ok) {
        const saved = (await push.json()) as {
          catalogos?: Catalogos;
          catalogosGuardadosEn?: string;
        };
        if (saved.catalogos) {
          setCatalogos(saved.catalogos);
          if (saved.catalogosGuardadosEn) {
            escribirCatalogosLocal(saved.catalogosGuardadosEn, saved.catalogos);
          }
        }
      }
    } else if (
      data.catalogos &&
      serverAt &&
      Date.parse(serverAt) > 0
    ) {
      escribirCatalogosLocal(serverAt, data.catalogos);
    }

    const serverAsigAt =
      typeof data.asignacionesGuardadosEn === "string"
        ? data.asignacionesGuardadosEn
        : "";
    const localAsig = leerAsignacionesLocal();
    if (
      localAsig &&
      puede(data.user, "articulos") &&
      (!serverAsigAt || Date.parse(localAsig.savedAt) > Date.parse(serverAsigAt))
    ) {
      const push = await fetch("/api/admin/articulos/asignaciones", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(localAsig),
      });
      if (push.ok) {
        const saved = (await push.json()) as {
          asignaciones?: AsignacionesPersistidas["asignaciones"];
          asignacionesGuardadosEn?: string;
        };
        if (saved.asignacionesGuardadosEn && saved.asignaciones) {
          escribirAsignacionesLocal({
            savedAt: saved.asignacionesGuardadosEn,
            asignaciones: saved.asignaciones,
          });
        }
        const otra = await fetch("/api/state", { credentials: "include" });
        if (otra.ok) {
          const hidratado = await otra.json();
          setProductos(hidratado.productos);
          setCatalogos(hidratado.catalogos ?? catalogosVacios());
        }
      }
    } else if (
      Array.isArray(data.productos) &&
      serverAsigAt &&
      Date.parse(serverAsigAt) > 0
    ) {
      const asignaciones: AsignacionesPersistidas["asignaciones"] = {};
      for (const p of data.productos as Producto[]) {
        const esq = p.esquemaConteo?.trim();
        if (!esq || !p.sku) continue;
        asignaciones[p.sku.trim().toUpperCase()] = {
          esquemaConteo: esq,
          colores: [...(p.colores ?? [])],
          tallas: [...(p.tallas ?? [])],
          especificaciones: [...(p.especificaciones ?? [])],
        };
      }
      escribirAsignacionesLocal({
        savedAt: serverAsigAt,
        asignaciones,
      });
    }
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
    router.refresh();
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
      id?: string;
      nombre: string;
      sku: string;
      esquemaConteo?: string;
      colores?: string[];
      tallas?: string[];
      especificaciones?: string[];
      soloIdentidad?: boolean;
      password: string;
    }) => {
      const res = await fetch("/api/admin/articulos", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(await parseError(res));
      const data = (await res.json()) as {
        producto: Producto;
        asignaciones?: AsignacionesPersistidas["asignaciones"];
        asignacionesGuardadosEn?: string;
      };
      if (data.asignaciones && data.asignacionesGuardadosEn) {
        escribirAsignacionesLocal({
          savedAt: data.asignacionesGuardadosEn,
          asignaciones: data.asignaciones,
        });
      }
      await recargar();
      return data.producto;
    },
    [recargar],
  );

  const clonarAsignacion = useCallback(
    async (input: {
      ids: string[];
      esquemaConteo?: string;
      colores?: string[];
      tallas?: string[];
      especificaciones?: string[];
      password: string;
    }) => {
      const res = await fetch("/api/admin/articulos/clonar", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(await parseError(res));
      const data = (await res.json()) as {
        asignaciones?: AsignacionesPersistidas["asignaciones"];
        asignacionesGuardadosEn?: string;
      };
      if (data.asignaciones && data.asignacionesGuardadosEn) {
        escribirAsignacionesLocal({
          savedAt: data.asignacionesGuardadosEn,
          asignaciones: data.asignaciones,
        });
      }
      await recargar();
    },
    [recargar],
  );

  const guardarCatalogos = useCallback(
    async (siguiente: Partial<Catalogos>) => {
      const res = await fetch("/api/admin/catalogos", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(siguiente),
      });
      if (!res.ok) throw new Error(await parseError(res));
      const saved = (await res.json()) as {
        catalogos?: Catalogos;
        catalogosGuardadosEn?: string;
      };
      if (saved.catalogos) {
        setCatalogos(saved.catalogos);
        if (saved.catalogosGuardadosEn) {
          escribirCatalogosLocal(saved.catalogosGuardadosEn, saved.catalogos);
        }
      }
      await recargar();
    },
    [recargar],
  );

  const value = useMemo(
    () => ({
      status,
      user,
      productos,
      catalogos,
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
      clonarAsignacion,
      guardarCatalogos,
    }),
    [
      status,
      user,
      productos,
      catalogos,
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
      clonarAsignacion,
      guardarCatalogos,
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
