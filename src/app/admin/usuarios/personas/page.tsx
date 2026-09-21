"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CabeceraUsuarios } from "@/components/cabecera-usuarios";
import { DialogCambiarContrasena } from "@/components/dialog-cambiar-contrasena";
import { DialogQuitarConClave } from "@/components/dialog-quitar-con-clave";
import { AsyncGate, EmptyView } from "@/components/status-views";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { esIza, parseUsuariosPersistidos } from "@/lib/usuarios-persist";

const LS_USUARIOS = "brq_usuarios";

function guardarRespaldoLocal(raw: unknown) {
  const parsed = parseUsuariosPersistidos(raw);
  if (!parsed || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_USUARIOS, JSON.stringify(parsed));
  } catch {
    /* quota */
  }
}

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
      <p className="text-sm font-medium">Permisos por usuario</p>
      <p className="text-xs text-muted-foreground">
        Marca lo que puede usar. En Existencias, Recepción y Pedidos pulsa
        Permitir o No permitir. Si no permites, no sale en el menú, no entra a
        capturar y no ve esos botones en Registros.
      </p>
      {OPCIONES_MODULO.map((op) => (
        <div key={op.clave} className="space-y-2 rounded-xl border p-3">
          <span>
            <span className="block text-sm font-medium">{op.etiqueta}</span>
            <span className="block text-xs text-muted-foreground">
              {op.detalle}
            </span>
          </span>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={valor[op.clave] ? "default" : "outline"}
              className="h-11"
              disabled={deshabilitado}
              onClick={() => onChange({ ...valor, [op.clave]: true })}
            >
              Permitir
            </Button>
            <Button
              type="button"
              variant={!valor[op.clave] ? "default" : "outline"}
              className="h-11"
              disabled={deshabilitado}
              onClick={() => onChange({ ...valor, [op.clave]: false })}
            >
              No permitir
            </Button>
          </div>
        </div>
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
        Luego puedes pulsar Permitir o No permitir.
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

type PendienteClave = "crear" | "guardar" | "quitar" | null;

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
  const [editar, setEditar] = useState<UsuarioPublico | null>(null);
  const [editRol, setEditRol] = useState<RolUsuario>("operador");
  const [editModulos, setEditModulos] = useState<ModulosUsuario>(modsVacios);
  const [cambiarClave, setCambiarClave] = useState<UsuarioPublico | null>(null);
  const [pendiente, setPendiente] = useState<PendienteClave>(null);
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
    guardarRespaldoLocal(data.respaldoUsuarios);
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
      respaldoUsuarios?: unknown;
    };
    if (!res.ok) {
      throw new Error(data.error ?? "No se pudo guardar.");
    }
    guardarRespaldoLocal(data.respaldoUsuarios);
    if (data.usuarios) setUsuarios(data.usuarios);
    return data;
  }

  function abrirEditar(u: UsuarioPublico) {
    setEditar(u);
    setEditRol(u.rol);
    setEditModulos({ ...u.modulos });
  }

  function puedeQuitar(u: UsuarioPublico) {
    if (esIza(u.username)) return false;
    if (u.rol === "admin" && admins <= 1) return false;
    return true;
  }

  function pedirCrear(e: React.FormEvent) {
    e.preventDefault();
    setPendiente("crear");
  }

  const dialogoClaveAbierto = pendiente !== null;

  return (
    <div className="space-y-6">
      <CabeceraUsuarios
        titulo="Personas"
        descripcion="Lista compacta: nombre, Editar y Eliminar. Crear o cambiar pide tu contraseña. No se puede quitar a Iza ni a la última administradora. Los cambios se quedan (archivo, cookies y respaldo en el teléfono)."
      />

      <form
        onSubmit={pedirCrear}
        className="space-y-3 rounded-xl border p-4"
      >
        <p className="font-medium">Persona nueva</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
        </div>
        <div className="space-y-2">
          <Label htmlFor="nueva-clave">Contraseña de esa persona</Label>
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
        <Button type="submit" className="h-11 w-full">
          Crear usuario
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
        <div className="overflow-hidden rounded-xl border">
          <ul>
            {usuarios.map((u) => {
              const bloqueado = !puedeQuitar(u);
              return (
                <li
                  key={u.id}
                  className="flex items-center gap-2 border-b px-3 py-2 last:border-b-0"
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 rounded-lg py-1 text-left hover:bg-muted/60"
                    onClick={() => abrirEditar(u)}
                  >
                    <p className="truncate font-medium">{u.nombre}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      @{u.username} · {etiquetaRol(u.rol)}
                      {u.id === user.id ? " · tú" : ""}
                      {esIza(u.username) ? " · no se elimina" : ""}
                    </p>
                  </button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 shrink-0 px-3"
                    onClick={() => abrirEditar(u)}
                  >
                    Editar
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    className="h-10 shrink-0 px-3"
                    disabled={bloqueado}
                    onClick={() => {
                      setQuitar(u);
                      setPendiente("quitar");
                    }}
                  >
                    Eliminar
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <Dialog
        open={Boolean(editar) && pendiente !== "guardar"}
        onOpenChange={(abierto) => {
          if (!abierto) setEditar(null);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editar?.nombre ?? "Editar"}</DialogTitle>
            <DialogDescription>
              {editar
                ? `@${editar.username}. Cambia rol o permisos y pulsa Guardar: pide tu contraseña.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {editar ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Rol</p>
                <RolBotones
                  valor={editRol}
                  deshabilitado={
                    editar.rol === "admin" && admins <= 1 && editRol === "admin"
                  }
                  onChange={(rol) => {
                    setEditRol(rol);
                    if (rol === "operador") setEditModulos(modsVacios());
                  }}
                />
              </div>
              {editRol === "admin" ? (
                <p className="text-sm text-muted-foreground">
                  Ve todo, incluido Usuarios. Autoriza pedidos.
                </p>
              ) : (
                <>
                  <Presets onElegir={setEditModulos} />
                  <CheckModulos valor={editModulos} onChange={setEditModulos} />
                </>
              )}
            </div>
          ) : null}
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              type="button"
              className="h-11 w-full"
              onClick={() => setPendiente("guardar")}
            >
              Guardar
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full"
              onClick={() => editar && setCambiarClave(editar)}
            >
              Cambiar contraseña
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-11 w-full"
              onClick={() => setEditar(null)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DialogCambiarContrasena
        abierto={Boolean(cambiarClave)}
        persona={cambiarClave}
        onCerrar={() => setCambiarClave(null)}
        onGuardar={async (nueva, claveAdmin) => {
          if (!cambiarClave) return;
          try {
            await post({
              accion: "cambiar-contrasena",
              userId: cambiarClave.id,
              password: claveAdmin,
              passwordNueva: nueva,
            });
            toast.success(`Contraseña nueva para ${cambiarClave.nombre}`);
            setCambiarClave(null);
          } catch (err) {
            toast.error(
              err instanceof Error ? err.message : "No se cambió la contraseña.",
            );
            throw err;
          }
        }}
      />

      <DialogQuitarConClave
        abierto={dialogoClaveAbierto}
        titulo={
          pendiente === "crear"
            ? "Crear persona"
            : pendiente === "guardar"
              ? "Guardar cambios"
              : "Eliminar persona"
        }
        descripcion={
          pendiente === "crear"
            ? `Para crear a «${nuevoNombre || nuevoUsuario}» escribe tu contraseña y pulsa Sí. Si pulsas No, no se crea.`
            : pendiente === "guardar" && editar
              ? `Para guardar a «${editar.nombre}» escribe tu contraseña y pulsa Sí. Si pulsas No, no se guarda.`
              : quitar
                ? `Para eliminar a «${quitar.nombre}» (@${quitar.username}) escribe tu contraseña y pulsa Sí. Si pulsas No o la contraseña no es, se queda.`
                : ""
        }
        idCampo="clave-persona-admin"
        etiquetaSi={
          pendiente === "quitar" ? "Sí" : pendiente === "crear" ? "Sí, crear" : "Sí, guardar"
        }
        onNo={() => {
          setPendiente(null);
          if (pendiente === "quitar") setQuitar(null);
        }}
        onConfirmarConClave={async (claveAdmin) => {
          if (pendiente === "crear") {
            await post({
              accion: "crear",
              username: nuevoUsuario,
              password: nuevaClave,
              claveAdmin,
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
            setPendiente(null);
            return;
          }
          if (pendiente === "guardar") {
            if (!editar) return;
            await post({
              accion: "actualizar",
              userId: editar.id,
              rol: editRol,
              modulos: editModulos,
              claveAdmin,
            });
            toast.success(`Listo: ${editar.nombre}`);
            setPendiente(null);
            setEditar(null);
            return;
          }
          if (pendiente === "quitar") {
            if (!quitar) return;
            const id = quitar.id;
            const soyYo = id === user.id;
            await post({
              accion: "quitar",
              userId: id,
              claveAdmin,
            });
            toast.success("Persona eliminada");
            setPendiente(null);
            setQuitar(null);
            setEditar((actual) => (actual?.id === id ? null : actual));
            if (soyYo) await logout();
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
