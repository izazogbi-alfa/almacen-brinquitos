# Almacén — existencias, pedidos y recepción

App web **móvil primero** para bodega. Hay que entrar con usuario y contraseña; la sesión se ve en el encabezado.

## Cuentas de prueba

| Rol | Usuario | Contraseña | Nombre |
| --- | --- | --- | --- |
| Administradora | `iza` | `iza` | Iza Zogbi |
| Operador | `almacen1` | `almacen1` | Ana López |
| Operador | `almacen2` | `almacen2` | Carlos Méndez |

Usuarios y sesiones se guardan en `data/store.json` en el servidor.

## Día de existencias

1. Entra como operador.
2. En **Existencias**, escribe código (ej. `ALI-1001`) o nombre (ej. `harina`) y toca **Buscar**. No se lista el catálogo entero.
3. Si hay una coincidencia, ves foto y puedes **Sacar**. Si hay varias, elige de la lista.
4. Al terminar, toca **Cerrar el día**.

Hay fotos de ejemplo en harina, aceite, arroz, leche y café. El resto muestra **Sin foto**.

## Cómo correrlo

```bash
npm install
npm run dev
```

Abre [http://localhost:4317](http://localhost:4317).
