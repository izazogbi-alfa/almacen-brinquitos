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

**Como Iza:** entra → **Pedidos** Nuevo → sucursal → busca `XC1092` → llena la cuadrícula color × talla → confirma → Autorizar + PDF. **Artículos** sigue definiendo colores y encabezados.

**Como operador:** `almacen1` → sucursal → busca `XC1092` o `camisa` → misma cuadrícula para contar/sacar. Recepción verde usa el mismo formato.

## Existencias

1. Elige sucursal.
2. Busca código o nombre (ej. `XC1092`, `camisa`). Primera celda = artículo.
3. Filas = colores del admin. Columnas = tallas de ese artículo (1, 1X, 2, 4…60, o CHICO/MEDIANO…, o solo cantidad).
4. Llena la fila de un color y baja a la siguiente. Confirma al terminar.
5. PDF del día.

## Recepción

Misma captura, título **Entrada de mercancía**, color verde.

## Pedidos

Solo admin. Captura como existencias, tabla ordenada, estado *Por autorizar* hasta que Iza autoriza. PDF del folio.

## Cómo correrlo

```bash
npm install
npm run dev
```

Abre [http://localhost:4317](http://localhost:4317).
