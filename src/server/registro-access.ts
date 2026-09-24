import type { SesionCaptura } from "@/lib/sesion-captura";
import type { UsuarioInterno } from "@/server/store";

export function esAdministrador(user: UsuarioInterno) {
  return user.rol === "admin";
}

export function puedeAccederRegistro(
  user: UsuarioInterno,
  sesion: SesionCaptura,
) {
  return esAdministrador(user) || sesion.userId === user.id;
}

export function filtrarSesionesVisibles(
  user: UsuarioInterno,
  sesiones: SesionCaptura[],
) {
  if (esAdministrador(user)) return sesiones;
  return sesiones.filter((s) => s.userId === user.id);
}
