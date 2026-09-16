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
2. En **Existencias**, busca por código o nombre (ej. `playera` o `ROP-5001`).
3. Si el producto tiene **talla** y **color**, elige ambos y luego la cantidad. El stock es por variante. Si no aplica, verás “Talla y color: no aplica”.
4. Al terminar, toca **Cerrar el día**.

Ropa de prueba: playera (S/M/L · Negro/Blanco) y pantalón (28/30/32 · Azul/Negro).

## Cómo correrlo

```bash
npm install
npm run dev
```

Abre [http://localhost:4317](http://localhost:4317).
