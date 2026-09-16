"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AsyncGate, EmptyView } from "@/components/status-views";
import { useInventory } from "@/lib/inventory-context";
import type { ModulosUsuario, UsuarioPublico } from "@/lib/types";

function UsuariosAdmin() {
  const { user } = useInventory();
  const [usuarios, setUsuarios] = useState<UsuarioPublico[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function cargar() {
    const res = await fetch("/api/admin/usuarios", { credentials: "include" });
    if (!res.ok) {
      setError("No se pudieron cargar los usuarios.");
      return;
    }
    const data = await res.json();
    setUsuarios(data.usuarios);
  }

  useEffect(() => {
    if (user?.rol !== "admin") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga de usuarios admin
    void cargar();
  }, [user?.rol]);

  if (user?.rol !== "admin") {
    return (
      <EmptyView
        titulo="Solo administradora"
        detalle="Iza asigna existencias y/o recepción a cada operador."
      />
    );
  }

  async function guardar(u: UsuarioPublico, modulos: ModulosUsuario) {
    const res = await fetch("/api/admin/usuarios", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: u.id, modulos }),
    });
    if (!res.ok) {
      toast.error("No se pudo guardar.");
      return;
    }
    toast.success(`Módulos de ${u.nombre} guardados`);
    await cargar();
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Usuarios y roles
        </h2>
        <p className="text-sm text-muted-foreground">
          Operadores: existencias y/o recepción. Pedidos solo Iza.
        </p>
      </div>
      {error ? <EmptyView titulo={error} detalle="Reintenta más tarde." /> : null}
      <ul className="space-y-3">
        {usuarios.map((u) => (
          <li key={u.id} className="rounded-xl border p-3 space-y-2">
            <p className="font-medium">
              {u.nombre}{" "}
              <span className="text-xs text-muted-foreground">
                @{u.username} · {u.rol}
              </span>
            </p>
            {u.rol === "admin" ? (
              <p className="text-sm text-muted-foreground">
                Acceso completo: artículos, pedidos (autoriza), existencias y recepción.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={u.modulos.existencias}
                    onChange={(e) =>
                      void guardar(u, { ...u.modulos, existencias: e.target.checked, pedidos: false })
                    }
                  />
                  Existencias (contar / sacar)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={u.modulos.recepcion}
                    onChange={(e) =>
                      void guardar(u, { ...u.modulos, recepcion: e.target.checked, pedidos: false })
                    }
                  />
                  Recepción (entrada verde)
                </label>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function PaginaUsuarios() {
  return (
    <AsyncGate>
      <UsuariosAdmin />
    </AsyncGate>
  );
}
