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

Iza arma las listas en **Configuración**: un hub con botones grandes. Hoy hay uno: **Listas de captura**. Ahí están **Esquemas de conteo**, **Colores**, **Tallas** y **Especificaciones**. Los **esquemas empiezan vacíos**: no hay “Ropa de niño 0–60”, talla de letra ni accesorio de fábrica. Ella los crea. Colores y tallas de paleta sí pueden venir con una lista de apoyo; no se restauran esquemas de fábrica si ella los dejó vacíos o guardó los suyos. **Volver** en un editor regresa a Listas de captura; **Volver** ahí regresa a Configuración. Cada esquema, y las secciones de colores, tallas y especificaciones, tiene su propio **Guardar**. En **Artículos**, el catálogo **no trae esquema**. La ficha tiene **Agregar esquemas**: ahí se elige el que ella armó (el mismo para existencias, pedidos y recepción). **Clonar a otros artículos** copia esa asignación (no Clave ni nombre).

## Cómo probar

**Como Iza:** entra → **Usuarios** → **Personas** → crea, cambia contraseña o quita gente → **Volver**. **Configuración** → **Listas de captura** → pulsa un botón (esquemas, colores, tallas o especificaciones) → arma esa lista → **Volver** (a Listas de captura) → **Volver** (a Configuración). Luego **Artículos** → abre una ficha → **Agregar esquemas** → elige el que mejor le queda → contraseña. Opcional: **Clonar a otros artículos**. **Guardar ficha** solo guarda Clave y nombre. Luego captura: sucursal → busca → marca varias del mismo esquema → color y talla.

**Como usuario de almacén:** `almacen1` → sucursal → busca. Recepción verde usa el mismo formato. Sin módulos de Configuración, Artículos ni Usuarios.

## Existencias

1. Elige sucursal.
2. Busca Clave o nombre (ej. `Baccus`, `XC1092`).
3. **Marca varias** que usen el **mismo esquema** (mismas tallas, ej. 1, 1X, 2–18, 34–42, 44–50). Si una se cuenta distinto, sale un aviso y no se suma. Las que no tienen esquema quedan apagadas: hay que asignarlo en Artículos (no se usa fábrica).
4. **Capturar las elegidas**: color, luego tallas y cantidades. Cambia de prenda con las fichas de arriba. Confirma el color. Abajo crece un **bloque por prenda** (no una matriz vacía): **Clave y nombre arriba**, **colores en filas**, **tallas en columnas** en el **mismo orden del esquema**.
5. **Descargar PDF de esta tabla** junta todas las marcadas que ya confirmaste. En **Hoy**, **Descargar PDF del día** (todos los movimientos del día, mismo formato).

## Recepción

Misma captura y misma tabla (varias prendas del mismo esquema, un PDF), título **Entrada de mercancía**, color verde. El PDF de entradas del día usa el mismo bloque.

## Pedidos

Misma captura y misma tabla si el módulo está marcado: varias prendas del mismo esquema en **un** pedido y **un** PDF. Al guardar, el detalle y el PDF del folio agrupan por prenda (colores en filas, tallas en columnas). Estado *Por autorizar* hasta que una administradora autoriza.

## Cómo correrlo

```bash
npm install
npm run dev
```

Abre [http://localhost:4317](http://localhost:4317).
