import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { completarModulos } from "@/lib/modulos";
import {
  parseUsuariosPersistidos,
  type UsuariosPersistidos,
} from "@/lib/usuarios-persist";
import type { ModulosUsuario, RolUsuario } from "@/lib/types";
import { exigirAdmin } from "@/server/auth";
import { hashPassword } from "@/server/passwords";
import { cookiesUsuarios } from "@/server/usuarios-persist";
import {
  cambiarContrasenaUsuario,
  contrasenaCoincide,
  guardarUsuariosEnStore,
  hidratarUsuarios,
  publicoDe,
  readStore,
  withStore,
} from "@/server/store";

function rolDe(valor: unknown): RolUsuario | null {
  if (valor === "admin" || valor === "operador") return valor;
  return null;
}

function modsDe(
  rol: RolUsuario,
  incoming: Partial<ModulosUsuario> | undefined,
  username?: string,
): ModulosUsuario {
  return completarModulos({
    rol,
    username,
    modulos: rol === "admin" ? undefined : incoming,
  });
}

function ultimoAdmin(store: { users: { id: string; rol: RolUsuario }[] }, userId: string) {
  const dest = store.users.find((u) => u.id === userId);
  if (!dest || dest.rol !== "admin") return false;
  return store.users.filter((u) => u.rol === "admin").length <= 1;
}

function usuarioPublicoRespuesta() {
  const store = readStore();
  return store.users.map((u) => publicoDe(u));
}

async function persistirPersonas(
  jar: Awaited<ReturnType<typeof cookies>>,
) {
  const { data, remoto } = await guardarUsuariosEnStore();
  let cookieOk = false;
  try {
    for (const c of cookiesUsuarios(data)) {
      jar.set(c);
    }
    cookieOk = true;
  } catch (cookieError) {
    console.error("usuarios cookie failed", cookieError);
    if (!remoto.persistio) {
      const msg =
        cookieError instanceof Error
          ? cookieError.message
          : "No se pudieron guardar las personas.";
      return { error: msg, data: null as UsuariosPersistidos | null };
    }
  }
  if (!remoto.persistio && !cookieOk) {
    return {
      error:
        "No se pudieron guardar las personas. El servidor no pudo persistir los cambios.",
      data: null as UsuariosPersistidos | null,
    };
  }
  return { error: null as string | null, data };
}

function jsonPersonas(data: UsuariosPersistidos | null, extra?: object) {
  return NextResponse.json({
    usuarios: usuarioPublicoRespuesta(),
    usuariosGuardadosEn: data?.savedAt ?? readStore().usuariosGuardadosEn ?? null,
    respaldoUsuarios: data,
    ...extra,
  });
}

export async function GET() {
  const { user, error } = await exigirAdmin();
  if (!user) {
    return (
      error ??
      NextResponse.json({ error: "Solo quien administra." }, { status: 403 })
    );
  }
  const jar = await cookies();
  await hidratarUsuarios((name) => jar.get(name)?.value);
  const store = readStore();
  const data = store.usuariosGuardadosEn
    ? {
        savedAt: store.usuariosGuardadosEn,
        users: store.users,
      }
    : null;
  if (data) {
    try {
      for (const c of cookiesUsuarios(data)) jar.set(c);
    } catch (cookieError) {
      console.error("usuarios cookie sync failed", cookieError);
    }
  }
  return jsonPersonas(data);
}

export async function POST(request: Request) {
  const { user, error } = await exigirAdmin();
  if (!user) {
    return (
      error ??
      NextResponse.json({ error: "Solo quien administra." }, { status: 403 })
    );
  }

  const jar = await cookies();
  await hidratarUsuarios((name) => jar.get(name)?.value);

  const body = (await request.json().catch(() => null)) as {
    accion?: string;
    userId?: string;
    username?: string;
    password?: string;
    passwordNueva?: string;
    nombre?: string;
    rol?: unknown;
    modulos?: Partial<ModulosUsuario>;
    respaldoUsuarios?: unknown;
  } | null;

  const accion = body?.accion ?? (body?.userId ? "actualizar" : "crear");

  try {
    if (accion === "restaurar") {
      const parsed = parseUsuariosPersistidos(body?.respaldoUsuarios);
      if (!parsed) {
        return NextResponse.json(
          { error: "No hay personas para restaurar." },
          { status: 400 },
        );
      }
      withStore((store) => {
        store.users = parsed.users;
        store.usuariosGuardadosEn = parsed.savedAt;
      });
      const persistido = await persistirPersonas(jar);
      if (persistido.error) {
        return NextResponse.json({ error: persistido.error }, { status: 500 });
      }
      return jsonPersonas(persistido.data, { ok: true });
    }

    if (accion === "crear") {
      const username = (body?.username ?? "").trim().toLowerCase();
      const nombre = (body?.nombre ?? "").trim();
      const password = typeof body?.password === "string" ? body.password : "";
      const rol = rolDe(body?.rol) ?? "operador";
      if (!username) {
        return NextResponse.json({ error: "Escribe un usuario." }, { status: 400 });
      }
      if (!nombre) {
        return NextResponse.json({ error: "Escribe el nombre." }, { status: 400 });
      }
      if (!password) {
        return NextResponse.json(
          { error: "Escribe una contraseña." },
          { status: 400 },
        );
      }
      const creado = withStore((store) => {
        if (store.users.some((u) => u.username.toLowerCase() === username)) {
          throw new Error("Ese usuario ya existe.");
        }
        const nuevo = {
          id: `u-${Date.now().toString(36)}`,
          username,
          nombre,
          rol,
          passwordHash: hashPassword(password),
          modulos: modsDe(rol, body?.modulos, username),
        };
        store.users.push(nuevo);
        return publicoDe(nuevo);
      });
      const persistido = await persistirPersonas(jar);
      if (persistido.error) {
        return NextResponse.json({ error: persistido.error }, { status: 500 });
      }
      return jsonPersonas(persistido.data, { usuario: creado });
    }

    if (accion === "actualizar") {
      if (!body?.userId) {
        return NextResponse.json({ error: "Falta el usuario." }, { status: 400 });
      }
      const actualizado = withStore((store) => {
        const dest = store.users.find((u) => u.id === body.userId);
        if (!dest) throw new Error("Usuario no encontrado.");
        const rol = rolDe(body.rol) ?? dest.rol;
        if (dest.rol === "admin" && rol !== "admin" && ultimoAdmin(store, dest.id)) {
          throw new Error(
            "Debe quedar al menos una persona administradora.",
          );
        }
        dest.rol = rol;
        dest.modulos = modsDe(rol, body.modulos, dest.username);
        return publicoDe(dest);
      });
      const persistido = await persistirPersonas(jar);
      if (persistido.error) {
        return NextResponse.json({ error: persistido.error }, { status: 500 });
      }
      return jsonPersonas(persistido.data, { usuario: actualizado });
    }

    if (accion === "cambiar-contrasena") {
      if (!body?.userId) {
        return NextResponse.json({ error: "Falta el usuario." }, { status: 400 });
      }
      const nueva =
        typeof body?.passwordNueva === "string" ? body.passwordNueva : "";
      const claveAdmin =
        typeof body?.password === "string" ? body.password : "";
      if (!nueva) {
        return NextResponse.json(
          { error: "Escribe la contraseña nueva." },
          { status: 400 },
        );
      }
      if (!claveAdmin) {
        return NextResponse.json(
          { error: "Escribe tu contraseña (la de ahora)." },
          { status: 400 },
        );
      }
      try {
        if (!contrasenaCoincide(user.id, claveAdmin)) {
          return NextResponse.json(
            { error: "Contraseña incorrecta. No se cambió." },
            { status: 401 },
          );
        }
      } catch {
        console.error("password verify failed");
        return NextResponse.json(
          { error: "No se pudo comprobar la contraseña. No se cambió." },
          { status: 500 },
        );
      }
      cambiarContrasenaUsuario(body.userId, nueva);
      const persistido = await persistirPersonas(jar);
      if (persistido.error) {
        return NextResponse.json({ error: persistido.error }, { status: 500 });
      }
      return jsonPersonas(persistido.data, { ok: true });
    }

    if (accion === "quitar") {
      if (!body?.userId) {
        return NextResponse.json({ error: "Falta el usuario." }, { status: 400 });
      }
      withStore((store) => {
        const dest = store.users.find((u) => u.id === body.userId);
        if (!dest) throw new Error("Usuario no encontrado.");
        if (ultimoAdmin(store, dest.id)) {
          throw new Error(
            "No se puede quitar a la última persona administradora. Quedarían sin quien entre a Usuarios.",
          );
        }
        store.users = store.users.filter((u) => u.id !== dest.id);
        store.sessions = store.sessions.filter((s) => s.userId !== dest.id);
      });
      const persistido = await persistirPersonas(jar);
      if (persistido.error) {
        return NextResponse.json({ error: persistido.error }, { status: 500 });
      }
      return jsonPersonas(persistido.data, { ok: true });
    }

    return NextResponse.json({ error: "Acción no válida." }, { status: 400 });
  } catch (err) {
    const mensaje =
      err instanceof Error ? err.message : "No se pudo guardar el usuario.";
    const codigo = mensaje.includes("ya existe") ? 409 : 400;
    return NextResponse.json({ error: mensaje }, { status: codigo });
  }
}
