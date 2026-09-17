# Almacén — existencias, pedidos y recepción

App **móvil primero** para Brinquitos. Español. Cada visita pide **Usuario** y **Contraseña**. La sesión dura mientras el navegador esté abierto; al cerrarlo hay que entrar de nuevo. **Cerrar sesión** también pide login.

## Cuentas

| Rol | Usuario | Acceso de fábrica |
| --- | --- | --- |
| Administrador | `iza` | Todo, incluido **Usuarios**. Autoriza pedidos. |
| Usuario | `almacen1` | Existencias + recepción (atajo Entrada) |
| Usuario | `almacen2` | Solo existencias (atajo Solo almacén) |

Las cuentas de demostración siguen igual. Iza puede crear más gente, quitarlas o cambiar módulos.

## Usuarios (solo administradora)

1. Abre **Usuarios** en la barra.
2. **Persona nueva:** usuario, contraseña, nombre, rol Administrador o Usuario.
3. Si es Usuario: atajos **Solo almacén** / **Entrada** / **Almacén completo**, luego casillas (Existencias, Recepción, Pedidos captura, Artículos, Configuración).
4. **Quitar:** contraseña de quien está dentro + **Sí / No**. No se puede quitar a la última administradora (ni bajarse el rol si es la última).
5. Lo no marcado no sale en el menú y la ruta lo bloquea. Autorizar pedidos no se cede.

Iza arma las listas en **Configuración**: un hub con botones grandes (**Esquemas de conteo**, **Colores**, **Tallas**, **Especificaciones**). Cada botón abre esa lista. **Volver** regresa al hub. Más botones (sucursales, PDF) se pueden sumar después. Cada esquema, y las secciones de colores, tallas y especificaciones, tiene su propio **Guardar**. El orden se cambia arrastrando fichas (con el nombre) dentro de un recuadro. Quitar un esquema, un color, una talla o una especificación pide la contraseña de la sesión y un **Sí / No**. En **Artículos**, la ficha tiene **Agregar esquemas**: ahí se elige el esquema de Configuración (el mismo para existencias, pedidos y recepción). **Clonar a otros artículos** copia esa asignación (no Clave ni nombre).

## Cómo probar

**Como Iza:** entra → **Configuración** → pulsa un botón (esquemas, colores, tallas o especificaciones) → arma esa lista → **Volver**. Luego **Artículos** → abre una ficha → **Agregar esquemas** → elige el que mejor le queda → contraseña. Opcional: **Clonar a otros artículos**. **Guardar ficha** solo guarda Clave y nombre. Luego captura: sucursal → busca → color y talla de ese esquema.

**Como usuario de almacén:** `almacen1` → sucursal → busca. Recepción verde usa el mismo formato. Sin módulos de Configuración, Artículos ni Usuarios.

## Existencias

1. Elige sucursal.
2. Busca Clave o nombre (ej. `XC1092`, `camisa`).
3. El esquema ya viene de la ficha. Elige color, talla y cantidad de esas listas.
4. Confirma el color. Abajo crece una tabla (no una matriz vacía).
5. PDF del día.

## Recepción

Misma captura, título **Entrada de mercancía**, color verde.

## Pedidos

Misma captura y misma tabla si el módulo está marcado. Estado *Por autorizar* hasta que una administradora autoriza.

## Cómo correrlo

```bash
npm install
npm run dev
```

Abre [http://localhost:4317](http://localhost:4317).
