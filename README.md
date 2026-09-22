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
3. **Persona nueva:** usuario, contraseña, nombre, rol Administrador o Usuario. Al crear pide **tu** contraseña y Sí/No.
4. Si es Usuario: atajos **Solo almacén** / **Entrada** / **Almacén completo**, luego **Permisos por usuario** (**Permitir / No permitir** en Existencias, Recepción, Pedidos, Artículos, Configuración). No permitir: no sale en el menú, no entra a capturar y no ve esos botones en **Registros**. Administradora ve todo.
5. Lista: cada fila es el **nombre**, con **Editar** y **Eliminar** al lado (en el teléfono también puedes tocar el nombre). **Editar** abre la ficha: **nombre de usuario** (el de entrar), rol, permisos y cambiar contraseña. Guardar pide tu contraseña y **Sí / No**. Vacío o un usuario que ya existe: no se guarda. Tras cambiar el usuario, se entra con el nuevo; el anterior ya no sirve. Iza también puede cambiar el suyo.
6. **Eliminar:** fila compacta (nombre · Editar · Eliminar). Pide tu contraseña y **Sí / No**. **No se puede quitar a `iza`** ni a la última administradora. El borrado se escribe en el servidor (y un respaldo del navegador): esa persona **no vuelve** y **no puede entrar**.
7. Lo no marcado no sale en el menú y la ruta lo bloquea. Autorizar pedidos no se cede.
8. **Las personas se quedan:** al crear, editar o eliminar, se guarda en el servidor. El navegador guarda un respaldo y, si el servidor se reinició, Iza lo reenvía al entrar. Cerrar el navegador, otra pestaña o recargar **no borra** a la gente nueva **ni revive** a quien eliminaste. `iza` no se quita. El login usa el usuario y la contraseña que acabas de crear. **Editar** (o toca el nombre) abre la ficha; Guardar también pide tu contraseña.

Iza arma las listas en **Configuración**: un hub con botones grandes. El **primer** botón (solo administradora) es **Actualizar catálogo**. Luego **Listas de captura**, **Respaldos** e **Informe PDF**. En Informe PDF se **sube el logo** y se **cambia el nombre** (si no, Brinquitos) del encabezado del PDF. **Actualizar catálogo**: sube **.xlsx o .csv** con **Clave** y **Nombre**. Empareja por Clave: actualiza el nombre y la **foto** si cambió (columna Foto / Fotos / URL, o imagen embebida sobre la fila). Celda vacía o sin esa columna: **no quita** la foto. Claves nuevas se agregan; las que no vienen en el archivo se quedan. **Nunca borra** artículos, existencias, esquemas ni registros. Antes de aplicar muestra cuántos a actualizar, nuevos, sin cambio y **fotos a cambiar**; pide contraseña y **Sí / No**. En Listas de captura están **Esquemas de conteo**, **Colores**, **Tallas** y **Especificaciones**. Los **esquemas empiezan vacíos**: no hay “Ropa de niño 0–60”, talla de letra ni accesorio de fábrica. Ella los crea. Colores y tallas de paleta sí pueden venir con una lista de apoyo; no se restauran esquemas de fábrica si ella los dejó vacíos o guardó los suyos. **Volver** en un editor regresa a Listas de captura; **Volver** ahí regresa a Configuración. Cada esquema, y las secciones de colores, tallas y especificaciones, tiene su propio **Guardar**. En **Artículos**, el catálogo **no trae esquema**. La ficha tiene **Agregar esquemas**: ahí se elige el que ella armó (el mismo para existencias, pedidos y recepción). Esa asignación (esquema, colores, tallas, especificaciones) **se queda en el artículo**: recargar, cerrar sesión o volver al día siguiente no la borra. **Clonar a otros artículos** copia esa asignación (no Clave ni nombre) y también queda persistida. Si el servidor no pudo guardar, sale un error en español; no se finge el éxito.

## Respaldos (solo administradora)

1. **Configuración** → **Respaldos** (no está dentro de Listas de captura).
2. **Guardar ahora:** el navegador pide **dónde guardar el archivo en tu PC**. También se queda una copia en la app. No se pide Drive ni Dropbox.
3. **Automático:** **un archivo por día** (México), no se pisa el de ayer. Vercel Cron a `/api/cron/respaldo-diario` y, si hace falta, al abrir la app como administradora. Se guarda en el almacén de archivos (un archivo por día, máximo 10). `/tmp` solo es cache. **Bajar a mi PC** sigue siendo una copia extra.
4. En la app hay **hasta 10** copias de **Guardar ahora** y **hasta 10 días** automáticos. La más vieja de cada lista se borra sola. Configuración → Respaldos muestra **varios días**, no solo hoy.
5. **Restaurar respaldo:** en la misma pantalla, bloque **Restaurar respaldo**. Elige una copia de la lista (o un archivo JSON) → **Restaurar** → contraseña → **Sí, restaurar**. Vuelve lo que esa copia trae (listas, esquemas por artículo y, si vienen, existencias y sesiones). No inventa datos. Lista vacía: **No hay respaldos**.

## Cómo probar

**Como Iza:** entra → **Usuarios** → **Personas** → crea, cambia nombre de usuario, cambia contraseña o quita gente → **Volver**. **Configuración** → **Listas de captura** → pulsa un botón (esquemas, colores, tallas o especificaciones) → arma esa lista → **Volver** (a Listas de captura) → **Volver** (a Configuración). **Configuración** → **Respaldos** → **Guardar ahora**. Luego **Artículos** → abre una ficha → **Agregar esquemas** → elige el que mejor le queda → contraseña. Opcional: **Clonar a otros artículos**. **Guardar ficha** solo guarda Clave y nombre. Luego captura: sucursal → busca → marca varias del mismo esquema → **Por talla** o **Por color** → cantidad → Enter.

**Como usuario de almacén:** `almacen1` → sucursal → busca. Recepción verde usa el mismo formato. Sin módulos de Configuración, Artículos ni Usuarios.

## Registros

En el menú de abajo, **Registros** está siempre (aunque no haya capturas). Es un hub con botones grandes, igual que Configuración y Usuarios: primero **Existencias pendientes**, **Recepción pendientes**, **Pedidos pendientes**; debajo **Existencias ya terminadas**, **Recepción ya terminada**, **Pedidos ya terminados**. Las listas muestran **En curso** / **Terminado**, fecha y sucursal, agrupadas **Hoy / Ayer / Más antiguos**. Toca la fila en curso para **Continuar este registro**. En **ya terminadas**, cada fila tiene **Ver PDF** (abre el informe en la app) y **Descargar PDF** debajo de la fecha y la persona; carta horizontal (en existencias la franja verde solo lleva la Clave). Sin líneas: aviso, no se inventa PDF. **Borrar** pide tu contraseña. Quien **administra** ve **Pasar a pendientes**: pide su contraseña y **Sí / No**; el registro vuelve a **En curso** (mismo id) para continuar. Quien no administra no ve ese botón. Vacío: **No hay en curso** o **No hay terminados**. **Cerrar registro** mueve existencias o recepción al archivo. Un pedido guardado queda en **Pedidos ya terminados**.

## Existencias

1. Elige sucursal.
2. Busca Clave o nombre (ej. `Baccus`, `XC1092`).
3. **Marca varias** que usen el **mismo esquema** (mismas tallas, ej. 1, 1X, 2–18, 34–42, 44–50). Si una se cuenta distinto, sale un aviso y no se suma. Las que no tienen esquema quedan apagadas: hay que asignarlo en Artículos (no se usa fábrica).
4. Toca **Por talla** (viene primero) o **Por color**. **Por talla:** toca una talla; la hoja pide cantidad de **cada color** y Enter pasa al siguiente color; al terminar esa talla pasa sola a la siguiente. **Por color:** toca un color y Enter recorre las **tallas** (como antes). La hoja inferior tiene **Regresar talla / Saltar talla** o **Regresar color / Saltar color**, más **Pendiente guardar** y **Terminar guardar**. Eso **abre el registro**. **Pendiente guardar** deja **EN CURSO** en **Registros → Existencias pendientes**. **Terminar guardar** archiva en ya terminadas. Ya no hay **Sacar**.
5. **Contar** deja la cantidad en piso. Tras cada cantidad + **Enter**, avanza en el eje elegido (colores si es Por talla; tallas si es Por color).
6. Si **cierras la pestaña**, la captura queda **en curso**. **No hay** botón naranja Continuar en Existencias: retómalo en **Registros**. A los **10 minutos sin capturar** se cierra igual. **Cerrar registro** (si hay sesión abierta) también archiva.
7. **Descargar PDF de esta tabla** junta las marcadas que ya confirmaste. En **Hoy**, **Descargar PDF de esta sesión**. El PDF es **carta US horizontal**. Encabezado de informe: logo + nombre (**Configuración → Informe PDF**), sucursal y fecha. Las cajas de talla van en **una sola fila**. Franja verde de **Clave** (solo el código, para saber de qué existencia es; **no** se imprime el nombre del esquema ni el tipo). Pedidos y Recepción sí pueden mostrar esquema en su PDF.

## Recepción

Misma hoja de captura (Por talla o Por color, teclado y Enter), título **Entrada de mercancía**, color verde. **Pendiente guardar** y **Terminar guardar** salen en **Registros**. Carta horizontal, tallas en una fila, encabezado de informe.

## Pedidos

Misma captura y misma tabla si el módulo está marcado. Al guardar, el detalle y el PDF del folio agrupan por prenda. El PDF muestra **Hecho por**. Estado *Por autorizar* hasta que una administradora autoriza. Si quedó a medias, retómalo en **Registros → Pedidos pendientes**.

## Cómo correrlo

```bash
npm install
npm run dev
```

Abre [http://localhost:4317](http://localhost:4317).

En producción (Vercel) las personas, existencias, registros y listas viven en la base; los respaldos del día, el logo y los PDF se guardan en archivos. Sin esas conexiones en local, la app sigue con archivos en `data/` (no se pierden al recargar el navegador). No pegues claves ni cadenas de conexión en el chat ni en este README: solo en el panel del proyecto, si el almacenamiento no las pone solo.
