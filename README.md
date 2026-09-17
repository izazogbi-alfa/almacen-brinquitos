# Almacén — existencias, pedidos y recepción

App **móvil primero** para Brinquitos. Español. Sesión con usuario y contraseña.

## Cuentas

| Rol | Usuario | Contraseña | Acceso |
| --- | --- | --- | --- |
| Administradora | `iza` | `iza` | Artículos, Configuración, usuarios, pedidos (autoriza), existencias, recepción |
| Operador | `almacen1` | `almacen1` | Existencias + recepción |
| Operador | `almacen2` | `almacen2` | Solo existencias |

Iza arma las listas en **Configuración**. Cada esquema, y las secciones de colores, tallas y especificaciones, tiene su propio **Guardar**. Para ordenar: mango a la izquierda (sostén, arrastra, suelta; el 1 queda primero). Quitar un esquema, un color, una talla o una especificación pide la contraseña de la sesión y un **Sí / No**. Quien solo cuenta o recibe **elige** de esas listas; no las define.

## Cómo probar

**Como Iza:** entra → **Configuración** → arma o reordena y pulsa **Guardar** en cada bloque → **Artículos** (10 por página, Clave y nombre, sin engranes) → abre una ficha → elige cómo se cuenta ese artículo → **Guardar ficha**. Luego **Pedidos** Nuevo → sucursal → busca → elige color, tallas y cantidades.

**Como operador:** `almacen1` → sucursal → busca. Recepción verde usa el mismo formato. No aparece Configuración ni Artículos.

## Existencias

1. Elige sucursal.
2. Busca Clave o nombre (ej. `XC1092`, `camisa`).
3. Elige esquema, color, talla y cantidad de las listas ya armadas.
4. Confirma el color. Abajo crece una tabla (no una matriz vacía).
5. PDF del día.

## Recepción

Misma captura, título **Entrada de mercancía**, color verde.

## Pedidos

Solo admin. Misma captura y misma tabla. Estado *Por autorizar* hasta que Iza autoriza.

## Cómo correrlo

```bash
npm install
npm run dev
```

Abre [http://localhost:4317](http://localhost:4317).
