import type { ModulosUsuario, RolUsuario, UsuarioPublico } from "@/lib/types";

export const MODULOS_ADMIN: ModulosUsuario = {
  existencias: true,
  recepcion: true,
  pedidos: true,
};

export function modulosDe(user: {
  rol: RolUsuario;
  username?: string;
  modulos?: ModulosUsuario;
}): ModulosUsuario {
  if (user.rol === "admin") return { ...MODULOS_ADMIN };
  if (user.modulos) return { ...user.modulos, pedidos: false };
  if (user.username === "almacen1") {
    return { existencias: true, recepcion: true, pedidos: false };
  }
  return { existencias: true, recepcion: false, pedidos: false };
}

export function puede(
  user: UsuarioPublico | null | undefined,
  modulo: keyof ModulosUsuario,
) {
  if (!user) return false;
  if (user.rol === "admin") return true;
  if (modulo === "pedidos") return false;
  return Boolean(user.modulos?.[modulo]);
}
