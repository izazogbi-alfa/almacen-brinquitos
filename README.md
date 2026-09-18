# Almacén — existencias, pedidos y recepción

App **móvil primero** para Brinquitos. Español. Cada visita pide **Usuario** y **Contraseña**. La sesión dura mientras el navegador esté abierto; al cerrarlo hay que entrar de nuevo. **Cerrar sesión** también pide login.

## Cuentas

| Rol | Usuario | Acceso de fábrica |
| --- | --- | --- |
| Administrador | `iza` | Todo, incluido **Usuarios**. Autoriza pedidos. |
| Usuario | `almacen1` | Existencias + recepción (atajo Entrada) |
| Usuario | `almacen2` | Solo existencias (atajo Solo almacén) |

Las cuentas de demostración siguen igual (`iza` / `iza` hasta que Iza la cambie). Iza puede crear más gente, cambiar contraseñas, quitarlas o cambiar módulos.

## Usuarios (solo administradora)

La barra sigue diciendo **Usuarios**. Esa pantalla es un hub con botones grandes (igual que Configuración). Hoy hay uno: **Personas**. Más funciones se suman después en `src/lib/secciones-usuarios.ts` más su página.

1. Abre **Usuarios** en la barra.
2. Pulsa **Personas**. **Volver** regresa al hub.
3. **Persona nueva:** usuario, contraseña, nombre, rol Administrador o Usuario.
4. Si es Usuario: atajos **Solo almacén** / **Entrada** / **Almacén completo**, luego casillas (Existencias, Recepción, Pedidos captura, Artículos, Configuración).
5. **Cambiar contraseña** (en cada persona, incluida la administradora): clave nueva dos veces + **tu** contraseña de ahora. Clave mala: no cambia.
6. **Quitar:** contraseña de quien está dentro + **Sí / No**. No se puede quitar a la última administradora (ni bajarse el rol si es la última).
7. Lo no marcado no sale en el menú y la ruta lo bloquea. Autorizar pedidos no se cede.

Iza arma las listas en **Configuración**: un hub con botones grandes. Hoy hay uno: **Listas de captura**. Ahí están **Esquemas de conteo**, **Colores**, **Tallas** y **Especificaciones**. **Volver** en un editor regresa a Listas de captura; **Volver** ahí regresa a Configuración. Más módulos (sucursales, PDF) se suman después como botones hermanos en Configuración, no mezclados con esas cuatro listas (`src/lib/secciones-configuracion.ts`). Cada esquema, y las secciones de colores, tallas y especificaciones, tiene su propio **Guardar**. El orden se cambia arrastrando fichas (con el nombre) dentro de un recuadro. Quitar un esquema, un color, una talla o una especificación pide la contraseña de la sesión y un **Sí / No**. En **Artículos**, la ficha tiene **Agregar esquemas**: ahí se elige el esquema de Configuración (el mismo para existencias, pedidos y recepción). **Clonar a otros artículos** copia esa asignación (no Clave ni nombre).

## Cómo probar

**Como Iza:** entra → **Usuarios** → **Personas** → crea, cambia contraseña o quita gente → **Volver**. **Configuración** → **Listas de captura** → pulsa un botón (esquemas, colores, tallas o especificaciones) → arma esa lista → **Volver** (a Listas de captura) → **Volver** (a Configuración). Luego **Artículos** → abre una ficha → **Agregar esquemas** → elige el que mejor le queda → contraseña. Opcional: **Clonar a otros artículos**. **Guardar ficha** solo guarda Clave y nombre. Luego captura: sucursal → busca → color y talla de ese esquema.

**Como usuario de almacén:** `almacen1` → sucursal → busca. Recepción verde usa el mismo formato. Sin módulos de Configuración, Artículos ni Usuarios.

## Existencias

1. Elige sucursal.
2. Busca Clave o nombre (ej. `XC1092`, `camisa`).
3. El esquema ya viene de la ficha. Elige color, talla y cantidad de esas listas.
4. Confirma el color. Abajo crece un **bloque** (no una matriz vacía): **Clave y nombre arriba**, **colores en filas** (de arriba hacia abajo), **tallas en columnas** en el **mismo orden del esquema** (Configuración → Listas de captura). La misma prenda con otro color se suma al mismo bloque.
5. **Descargar PDF de esta tabla** (mismo formato). En **Hoy**, **Descargar PDF del día**.

## Recepción

Misma captura y misma tabla, título **Entrada de mercancía**, color verde. El PDF de entradas usa el mismo bloque.

## Pedidos

Misma captura y misma tabla si el módulo está marcado. Al guardar, el detalle y el PDF del folio también agrupan por prenda (colores en filas, tallas en columnas). Estado *Por autorizar* hasta que una administradora autoriza.

## Cómo correrlo

```bash
npm install
npm run dev
```

Abre [http://localhost:4317](http://localhost:4317).
