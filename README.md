# Almacén — existencias, pedidos y recepción

App **móvil primero** para Brinquitos. Español. Sesión con usuario y contraseña.

## Cuentas

| Rol | Usuario | Contraseña | Acceso |
| --- | --- | --- | --- |
| Administradora | `iza` | `iza` | Artículos, usuarios, pedidos (autoriza), existencias, recepción |
| Operador | `almacen1` | `almacen1` | Existencias + recepción |
| Operador | `almacen2` | `almacen2` | Solo existencias |

Iza puede cambiar existencias/recepción de cada operador en **Usuarios**.

## Cómo probar

**Como Iza:** entra → **Pedidos** Nuevo → sucursal → busca `XC1092` → color, tallas y cantidades → confirma el color → la tabla crece abajo. Autorizar + PDF. **Artículos** define colores y encabezados (CHICO/MEDIANO… o 1, 1X, 2…).

**Como operador:** `almacen1` → sucursal → busca `XC1092` o `camisa` → misma captura (no una matriz vacía). Recepción verde usa el mismo formato.

## Existencias

1. Elige sucursal.
2. Busca código o nombre (ej. `XC1092`, `camisa`).
3. Elige color, talla y cantidad. Agrega tallas de ese color.
4. Confirma el color (o la línea). Abajo crece una tabla: código arriba / nombre abajo, luego color, luego talla y cantidad (solo las que capturaste).
5. PDF del día.

## Recepción

Misma captura, título **Entrada de mercancía**, color verde.

## Pedidos

Solo admin. Misma captura y misma tabla que existencias. Estado *Por autorizar* hasta que Iza autoriza. PDF del folio.

## Cómo correrlo

```bash
npm install
npm run dev
```

Abre [http://localhost:4317](http://localhost:4317).
