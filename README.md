# Almacén — existencias, pedidos y recepción

App web **móvil primero** para Brinquitos. Hay que entrar con usuario y contraseña; la sesión se ve en el encabezado.

## Cuentas de prueba

| Rol | Usuario | Contraseña | Nombre |
| --- | --- | --- | --- |
| Administradora | `iza` | `iza` | Iza Zogbi |
| Operador | `almacen1` | `almacen1` | Ana López |
| Operador | `almacen2` | `almacen2` | Carlos Méndez |

Usuarios, conteos y existencias se guardan en `data/store.json` en el servidor.

## Cómo contar

1. Entra como operador (ej. `almacen1` / `almacen1`).
2. Elige **sucursal**: La Gloria, El Modelo o El Ángel.
3. En **Existencias**, busca por código o nombre (no se lista el catálogo completo). Ejemplos: `ropón`, `trajecito`, `chaleco`, `vela`, `BRI-1001`.
4. El formulario sale **según el producto**:
   - Ropón y trajecito: tallas pares 0–60 y color.
   - Chaleco adulto: EXCHICO, CHICO, MEDIANO, GRANDE, EXGRANDE, ADULTO y color.
   - Kit vela: cantidad y color (o Único), sin talla.
5. Ajusta las piezas en anaquel y toca **Guardar conteo**. Queda tu nombre, la sucursal y la hora.
6. Verás el total de esa sucursal y el **total de las tres sucursales**.
7. Al terminar, toca **Cerrar el día**.

## Cómo correrlo

```bash
npm install
npm run dev
```

Abre [http://localhost:4317](http://localhost:4317).
