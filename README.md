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
4. Si es Usuario: atajos **Solo almacén** / **Entrada** / **Almacén completo**, luego **Permisos por usuario** (**Permitir / No permitir** en Existencias, Recepción, Pedidos, Artículos, Configuración). No permitir: no sale en el menú, no entra a capturar y no ve esos botones en **Registros**. Administradora ve todo.
5. **Cambiar contraseña** (en cada persona, incluida la administradora): clave nueva dos veces + **tu** contraseña de ahora. Clave mala: no cambia.
6. **Quitar:** contraseña de quien está dentro + **Sí / No**. No se puede quitar a la última administradora (ni bajarse el rol si es la última).
7. Lo no marcado no sale en el menú y la ruta lo bloquea. Autorizar pedidos no se cede.

Iza arma las listas en **Configuración**: un hub con botones grandes. Hoy hay cuatro: **Listas de captura**, **Respaldos**, **Informe PDF** y **Actualizar catálogo**. En Informe PDF se **sube el logo** y se **cambia el nombre** (si no, Brinquitos) del encabezado del PDF. **Actualizar catálogo** (solo administradora): sube **.xlsx o .csv** con **Clave** y **Nombre**. Empareja por Clave: actualiza el nombre y la **foto** si cambió (columna Foto / Fotos / URL, o imagen embebida sobre la fila). Celda vacía o sin esa columna: **no quita** la foto. Claves nuevas se agregan; las que no vienen en el archivo se quedan. **Nunca borra** artículos, existencias, esquemas ni registros. Antes de aplicar muestra cuántos a actualizar, nuevos, sin cambio y **fotos a cambiar**; pide contraseña y **Sí / No**. En Listas de captura están **Esquemas de conteo**, **Colores**, **Tallas** y **Especificaciones**. Los **esquemas empiezan vacíos**: no hay “Ropa de niño 0–60”, talla de letra ni accesorio de fábrica. Ella los crea. Colores y tallas de paleta sí pueden venir con una lista de apoyo; no se restauran esquemas de fábrica si ella los dejó vacíos o guardó los suyos. **Volver** en un editor regresa a Listas de captura; **Volver** ahí regresa a Configuración. Cada esquema, y las secciones de colores, tallas y especificaciones, tiene su propio **Guardar**. En **Artículos**, el catálogo **no trae esquema**. La ficha tiene **Agregar esquemas**: ahí se elige el que ella armó (el mismo para existencias, pedidos y recepción). Esa asignación (esquema, colores, tallas, especificaciones) **se queda en el artículo**: recargar, cerrar sesión o volver al día siguiente no la borra. **Clonar a otros artículos** copia esa asignación (no Clave ni nombre) y también queda persistida. Si el servidor no pudo guardar, sale un error en español; no se finge el éxito.

## Respaldos (solo administradora)

1. **Configuración** → **Respaldos** (no está dentro de Listas de captura).
2. **Guardar ahora:** el navegador pide **dónde guardar el archivo en tu PC**. También se queda una copia en la app. No se pide Drive ni Dropbox.
3. **Automático:** una copia por día (México). Vercel Cron a `/api/cron/respaldo-diario` y, si hace falta, al abrir la app como administradora.
4. En la app hay **hasta 10** copias de **Guardar ahora** y **hasta 10** del día. La más vieja de cada lista se borra sola.
5. **Restaurar respaldo:** en la misma pantalla, bloque **Restaurar respaldo**. Elige una copia de la lista (o un archivo JSON) → **Restaurar** → contraseña → **Sí, restaurar**. Vuelve lo que esa copia trae (listas, esquemas por artículo y, si vienen, existencias y sesiones). No inventa datos. Lista vacía: **No hay respaldos**.

## Cómo probar

**Como Iza:** entra → **Usuarios** → **Personas** → crea, cambia contraseña o quita gente → **Volver**. **Configuración** → **Listas de captura** → pulsa un botón (esquemas, colores, tallas o especificaciones) → arma esa lista → **Volver** (a Listas de captura) → **Volver** (a Configuración). **Configuración** → **Respaldos** → **Guardar ahora**. Luego **Artículos** → abre una ficha → **Agregar esquemas** → elige el que mejor le queda → contraseña. Opcional: **Clonar a otros artículos**. **Guardar ficha** solo guarda Clave y nombre. Luego captura: sucursal → busca → marca varias del mismo esquema → color → cantidad → Enter.

**Como usuario de almacén:** `almacen1` → sucursal → busca. Recepción verde usa el mismo formato. Sin módulos de Configuración, Artículos ni Usuarios.

## Registros

En el menú de abajo, **Registros** está siempre (aunque no haya capturas). Es un hub con botones grandes, igual que Configuración y Usuarios: primero **Existencias pendientes**, **Recepción pendientes**, **Pedidos pendientes**; debajo **Existencias ya terminadas**, **Recepción ya terminada**, **Pedidos ya terminados**. Las listas muestran **En curso** / **Terminado**, fecha y sucursal, agrupadas **Hoy / Ayer / Más antiguos**. Toca la fila en curso para **Continuar este registro**. **Borrar** pide tu contraseña. Vacío: **No hay en curso** o **No hay terminados**. **Cerrar registro** mueve existencias o recepción al archivo. Un pedido guardado queda en **Pedidos ya terminados**.

## Existencias

1. Elige sucursal.
2. Busca Clave o nombre (ej. `Baccus`, `XC1092`).
3. **Marca varias** que usen el **mismo esquema** (mismas tallas, ej. 1, 1X, 2–18, 34–42, 44–50). Si una se cuenta distinto, sale un aviso y no se suma. Las que no tienen esquema quedan apagadas: hay que asignarlo en Artículos (no se usa fábrica).
4. **Capturar las elegidas**: toca un **color** (botón grande) → se abre el **teclado numérico** → escribe la cantidad (ej. 12) → **Enter** confirma ese color (igual que **Confirmar este color**). Luego toca el siguiente color. Si el esquema tiene tallas (orden del esquema), Enter confirma la cantidad de la **talla activa**; puedes cambiar talla o seguir color → cantidad → Enter. Sin talla: color + cantidad + Enter. Cambia de prenda con las fichas de arriba. Abajo crece un **bloque por prenda** (no una matriz vacía): **Clave y nombre arriba**, **colores en filas**, **tallas en columnas** en el **mismo orden del esquema**.
5. **Contar** deja la cantidad en piso. Ya no hay **Sacar**: el stock no baja por una salida aparte. Tras cada cantidad + **Enter**, la captura **pasa sola a la siguiente talla** del mismo color; en la última talla Enter confirma el color. Luego tocas el siguiente color.
6. Mientras capturas, sale **Sesión abierta**. Si **cierras la pestaña o el navegador**, la captura **no se pierde**: queda **en curso** en el momento. Al volver, **Continuar este registro** está bajo el título. A los **10 minutos sin capturar** con la pantalla abierta se cierra igual. **Cerrar registro** la mueve a **Existencias ya terminadas**.
7. **Descargar PDF de esta tabla** junta las marcadas que ya confirmaste. En **Hoy**, **Descargar PDF de esta sesión**. El PDF es **carta US horizontal**. Encabezado de informe: logo + nombre (**Configuración → Informe PDF**), sucursal y fecha. Las cajas de talla van en **una sola fila**. Franja de Clave, cajas de talla y fila de **totales**.

## Recepción

Misma captura y misma tabla (varias prendas del mismo esquema, un PDF), título **Entrada de mercancía**, color verde. El PDF es de **esta sesión**. Si cierras la pestaña, **Continuar este registro** queda bajo el título. A los 10 minutos sin capturar también se congela. Carta horizontal, tallas en una fila, encabezado de informe.

## Pedidos

Misma captura y misma tabla si el módulo está marcado: varias prendas del mismo esquema en **un** pedido y **un** PDF. Al guardar, el detalle y el PDF del folio agrupan por prenda (colores en filas, tallas en una fila, carta horizontal). El PDF muestra **Hecho por** (quién lo hace: el nombre de quien capturó, `userName` del pedido). Estado *Por autorizar* hasta que una administradora autoriza. La captura de pedido también usa sesión de 10 minutos; si cierras el navegador, **Continuar este registro** sale bajo el título en la lista de Pedidos (y en Nuevo pedido).

## Cómo correrlo

```bash
npm install
npm run dev
```

Abre [http://localhost:4317](http://localhost:4317).
