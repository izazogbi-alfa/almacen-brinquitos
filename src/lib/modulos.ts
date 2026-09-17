import type {
  ClaveModulo,
  ModulosUsuario,
  RolUsuario,
  UsuarioPublico,
} from "@/lib/types";

export const MODULOS_ADMIN: ModulosUsuario = {
  existencias: true,
  recepcion: true,
  pedidos: true,
  articulos: true,
  configuracion: true,
};

export const MODULOS_SOLO_ALMACEN: ModulosUsuario = {
  existencias: true,
  recepcion: false,
  pedidos: false,
  articulos: false,
  configuracion: false,
};

export const MODULOS_ENTRADA: ModulosUsuario = {
  existencias: true,
  recepcion: true,
  pedidos: false,
  articulos: false,
  configuracion: false,
};

export const MODULOS_ALMACEN_COMPLETO: ModulosUsuario = {
  existencias: true,
  recepcion: true,
  pedidos: true,
  articulos: false,
  configuracion: false,
};

export const PRESETS_USUARIO = [
  { id: "solo-almacen", etiqueta: "Solo almacén", modulos: MODULOS_SOLO_ALMACEN },
  { id: "entrada", etiqueta: "Entrada", modulos: MODULOS_ENTRADA },
  { id: "almacen-completo", etiqueta: "Almacén completo", modulos: MODULOS_ALMACEN_COMPLETO },
] as const;

export const OPCIONES_MODULO: {
  clave: ClaveModulo;
  etiqueta: string;
  detalle: string;
}[] = [
  {
    clave: "existencias",
    etiqueta: "Existencias",
    detalle: "Contar y sacar",
  },
  {
    clave: "recepcion",
    etiqueta: "Recepción",
    detalle: "Entrada de mercancía",
  },
  {
    clave: "pedidos",
    etiqueta: "Pedidos",
    detalle: "Solo captura. Autorizar sigue siendo de administradora.",
  },
  {
    clave: "articulos",
    etiqueta: "Artículos",
    detalle: "Altas y fichas",
  },
  {
    clave: "configuracion",
    etiqueta: "Configuración",
    detalle: "Listas de esquema, color y talla",
  },
];

export function completarModulos(
  user: {
    rol: RolUsuario;
    username?: string;
    modulos?: Partial<ModulosUsuario> | null;
  },
): ModulosUsuario {
  if (user.rol === "admin") return { ...MODULOS_ADMIN };
  if (user.modulos) {
    return {
      existencias: Boolean(user.modulos.existencias),
      recepcion: Boolean(user.modulos.recepcion),
      pedidos: Boolean(user.modulos.pedidos),
      articulos: Boolean(user.modulos.articulos),
      configuracion: Boolean(user.modulos.configuracion),
    };
  }
  if (user.username === "almacen1") return { ...MODULOS_ENTRADA };
  return { ...MODULOS_SOLO_ALMACEN };
}

export function modulosDe(user: {
  rol: RolUsuario;
  username?: string;
  modulos?: Partial<ModulosUsuario> | null;
}): ModulosUsuario {
  return completarModulos(user);
}

export function puede(
  user: UsuarioPublico | null | undefined,
  modulo: ClaveModulo,
) {
  if (!user) return false;
  if (user.rol === "admin") return true;
  return Boolean(user.modulos?.[modulo]);
}

export function puedeAutorizarPedidos(
  user: UsuarioPublico | null | undefined,
) {
  return user?.rol === "admin";
}

export function etiquetaRol(rol: RolUsuario) {
  return rol === "admin" ? "Administrador" : "Usuario";
}
