"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CabeceraUsuarios } from "@/components/cabecera-usuarios";
import { DialogQuitarConClave } from "@/components/dialog-quitar-con-clave";
import { AsyncGate, EmptyView } from "@/components/status-views";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useInventory } from "@/lib/inventory-context";
import {
  etiquetaRol,
  MODULOS_SOLO_ALMACEN,
  OPCIONES_MODULO,
  PRESETS_USUARIO,
} from "@/lib/modulos";
import type { ModulosUsuario, RolUsuario, UsuarioPublico } from "@/lib/types";
import { cn } from "@/lib/utils";

function modsVacios(): ModulosUsuario {
  return { ...MODULOS_SOLO_ALMACEN };
}

function CheckModulos({
  valor,
  onChange,
  deshabilitado,
}: {
  valor: ModulosUsuario;
  onChange: (siguiente: ModulosUsuario) => void;
  deshabilitado?: boolean;
}) {
  return (
    <div className="space-y-2">
      {OPCIONES_MODULO.map((op) => (
        <label
          key={op.clave}
          className={cn(
            "flex items-start gap-3 rounded-xl border p-3",
            deshabilitado && "opacity-70",
          )}
        >
          <input
            type="checkbox"
            className="mt-1 size-5 shrink-0"
            checked={valor[op.clave]}
            disabled={deshabilitado}
            onChange={(e) =>
              onChange({ ...valor, [op.clave]: e.target.checked })
            }
          />
          <span>
            <span className="block text-sm font-medium">{op.etiqueta}</span>
            <span className="block text-xs text-muted-foreground">
              {op.detalle}
            </span>
          </span>
        </label>
      ))}
    </div>
  );
}

function Presets({
  onElegir,
  deshabilitado,
}: {
  onElegir: (modulos: ModulosUsuario) => void;
  deshabilitado?: boolean;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Atajos</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {PRESETS_USUARIO.map((p) => (
          <Button
            key={p.id}
            type="button"
            variant="outline"
            className="h-11 w-full"
            disabled={deshabilitado}
            onClick={() => onElegir({ ...p.modulos })}
          >
            {p.etiqueta}
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Luego puedes marcar o quitar casillas.
      </p>
    </div>
  );
}

function RolBotones({
  valor,
  onChange,
  deshabilitado,
}: {
  valor: RolUsuario;
  onChange: (rol: RolUsuario) => void;
  deshabilitado?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Button
        type="button"
        variant={valor === "admin" ? "default" : "outline"}
        className="h-11"
        disabled={deshabilitado}
        onClick={() => onChange("admin")}
      >
        Administrador
      </Button>
      <Button
        type="button"
        variant={valor === "operador" ? "default" : "outline"}
        className="h-11"
        disabled={deshabilitado}
        onClick={() => onChange("operador")}
      >
        Usuario
      </Button>
    </div>
  );
}

function PersonasAdmin() {
  const { user, logout } = useInventory();
  const [usuarios, setUsuarios] = useState<UsuarioPublico[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [nuevoUsuario, setNuevoUsuario] = useState("");
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevaClave, setNuevaClave] = useState("");
  const [nuevoRol, setNuevoRol] = useState<RolUsuario>("operador");
  const [nuevosModulos, setNuevosModulos] = useState<ModulosUsuario>(modsVacios);
  const [creando, setCreando] = useState(false);
  const [quitar, setQuitar] = useState<UsuarioPublico | null>(null);

  const admins = useMemo(
    () => usuarios.filter((u) => u.rol === "admin").length,
    [usuarios],
  );

  async function cargar() {
    const res = await fetch("/api/admin/usuarios", { credentials: "include" });
    if (!res.ok) {
      setError("No se pudieron cargar los usuarios.");
      setCargando(false);
      return;
    }
    const data = await res.json();
    setUsuarios(data.usuarios);
    setError(null);
    setCargando(false);
  }

  useEffect(() => {
    if (user?.rol !== "admin") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga de usuarios admin
    void cargar();
  }, [user?.rol]);

  if (user?.rol !== "admin") {
    return (
      <EmptyView
        titulo="Solo quien administra"
        detalle="Aquí Iza crea personas, les da rol y elige qué módulos ven."
      />
    );
  }

  async function post(body: Record<string, unknown>) {
    const res = await fetch("/api/admin/usuarios", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      usuarios?: UsuarioPublico[];
    };
    if (!res.ok) {
      throw new Error(data.error ?? "No se pudo guardar.");
    }
    if (data.usuarios) setUsuarios(data.usuarios);
    return data;
  }

  async function guardar(u: UsuarioPublico, parche: Partial<UsuarioPublico>) {
    try {
      await post({
        accion: "actualizar",
        userId: u.id,
        rol: parche.rol ?? u.rol,
        modulos: parche.modulos ?? u.modulos,
      });
      toast.success(`Listo: ${u.nombre}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar.");
    }
  }

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setCreando(true);
    try {
      await post({
        accion: "crear",
        username: nuevoUsuario,
        password: nuevaClave,
        nombre: nuevoNombre,
        rol: nuevoRol,
        modulos: nuevosModulos,
      });
      toast.success(`Creado: ${nuevoUsuario.trim().toLowerCase()}`);
      setNuevoUsuario("");
      setNuevoNombre("");
      setNuevaClave("");
      setNuevoRol("operador");
      setNuevosModulos(modsVacios());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo crear.");
    } finally {
      setCreando(false);
    }
  }

  function puedeQuitar(u: UsuarioPublico) {
    if (u.rol === "admin" && admins <= 1) return false;
    return true;
  }

  return (
    <div className="space-y-6">
      <CabeceraUsuarios
        titulo="Personas"
        descripcion="Crea personas. Elige Administrador (todo, incluso Usuarios) o Usuario (solo los módulos marcados). Autorizar pedidos sigue siendo de administradora."
      />

      <form
        onSubmit={(e) => void crear(e)}
        className="space-y-4 rounded-xl border p-4"
      >
        <p className="font-medium">Persona nueva</p>
        <div className="space-y-2">
          <Label htmlFor="nuevo-usuario">Usuario</Label>
          <Input
            id="nuevo-usuario"
            className="h-11"
            autoComplete="off"
            value={nuevoUsuario}
            onChange={(e) => setNuevoUsuario(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nuevo-nombre">Nombre</Label>
          <Input
            id="nuevo-nombre"
            className="h-11"
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nueva-clave">Contraseña</Label>
          <Input
            id="nueva-clave"
            type="password"
            className="h-11"
            autoComplete="new-password"
            value={nuevaClave}
            onChange={(e) => setNuevaClave(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Rol</p>
          <RolBotones
            valor={nuevoRol}
            onChange={(rol) => {
              setNuevoRol(rol);
              if (rol === "operador" && nuevoRol === "admin") {
                setNuevosModulos(modsVacios());
              }
            }}
          />
        </div>
        {nuevoRol === "operador" ? (
          <>
            <Presets onElegir={setNuevosModulos} />
            <CheckModulos valor={nuevosModulos} onChange={setNuevosModulos} />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Administrador ve todos los módulos, incluido Usuarios.
          </p>
        )}
        <Button type="submit" className="h-11 w-full" disabled={creando}>
          {creando ? "Creando…" : "Crear usuario"}
        </Button>
      </form>

      {error ? <EmptyView titulo={error} detalle="Reintenta más tarde." /> : null}
      {cargando ? (
        <p className="text-sm text-muted-foreground">Cargando personas…</p>
      ) : usuarios.length === 0 ? (
        <EmptyView
          titulo="Aún no hay usuarios"
          detalle="Crea el primero con el formulario de arriba."
        />
      ) : (
        <ul className="space-y-3">
          {usuarios.map((u) => {
            const ultimoAdmin = u.rol === "admin" && admins <= 1;
            return (
              <li key={u.id} className="space-y-3 rounded-xl border p-3">
                <div>
                  <p className="font-medium">{u.nombre}</p>
                  <p className="text-xs text-muted-foreground">
                    @{u.username} · {etiquetaRol(u.rol)}
                    {u.id === user.id ? " · tú" : ""}
                  </p>
                </div>
                <RolBotones
                  valor={u.rol}
                  deshabilitado={ultimoAdmin && u.rol === "admin"}
                  onChange={(rol) => {
                    if (rol === u.rol) return;
                    void guardar(u, {
                      rol,
                      modulos:
                        rol === "operador" ? modsVacios() : u.modulos,
                    });
                  }}
                />
                {ultimoAdmin ? (
                  <p className="text-xs text-muted-foreground">
                    Eres la última administradora: no se puede bajar el rol ni
                    quitar esta cuenta.
                  </p>
                ) : null}
                {u.rol === "admin" ? (
                  <p className="text-sm text-muted-foreground">
                    Ve todo, incluido Usuarios. Autoriza pedidos.
                  </p>
                ) : (
                  <>
                    <Presets
                      onElegir={(modulos) => void guardar(u, { modulos })}
                    />
                    <CheckModulos
                      valor={u.modulos}
                      onChange={(modulos) => void guardar(u, { modulos })}
                    />
                  </>
                )}
                <Button
                  type="button"
                  variant="destructive"
                  className="h-11 w-full"
                  disabled={!puedeQuitar(u)}
                  onClick={() => setQuitar(u)}
                >
                  Quitar
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <DialogQuitarConClave
        abierto={Boolean(quitar)}
        titulo="Quitar usuario"
        descripcion={
          quitar
            ? `Para quitar a «${quitar.nombre}» (@${quitar.username}) escribe tu contraseña y pulsa Sí. Si pulsas No o la contraseña no es, se queda.`
            : ""
        }
        idCampo="clave-quitar-usuario"
        onNo={() => setQuitar(null)}
        onSi={async () => {
          if (!quitar) return;
          const id = quitar.id;
          const soyYo = id === user.id;
          try {
            await post({ accion: "quitar", userId: id });
            toast.success("Usuario quitado");
            setQuitar(null);
            if (soyYo) await logout();
          } catch (err) {
            toast.error(
              err instanceof Error ? err.message : "No se pudo quitar.",
            );
            throw err;
          }
        }}
      />
    </div>
  );
}

export default function PaginaPersonas() {
  return (
    <AsyncGate>
      <PersonasAdmin />
    </AsyncGate>
  );
}
