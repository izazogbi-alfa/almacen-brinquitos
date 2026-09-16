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

**Como Iza:** entra → **Artículos** (busca `ropón`, cambia colores o esquema) → **Usuarios** (quita o da recepción a Ana) → **Pedidos** Nuevo (sucursal → busca artículo → confirma → tabla → Guardar) → **Autorizar** y PDF.

**Como operador:** entra `almacen1` → elige sucursal → **Contar** o **Sacar** (azul) y confirma → **Recepción** entrada verde, misma captura. `almacen2` no ve Recepción ni Pedidos.

## Existencias

1. Elige sucursal (La Gloria / El Modelo / El Ángel).
2. Busca el código (no se lista el catálogo).
3. El formulario usa las propiedades del artículo.
4. Confirma antes de contar o sacar.
5. PDF al cerrar el día o con Descargar PDF.

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
