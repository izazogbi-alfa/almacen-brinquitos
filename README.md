# Almacén — existencias, pedidos y recepción

App web **móvil primero** para una bodega: ver existencias en piso, armar pedidos a proveedor y recibir mercancía contra la orden. Está pensada para abrirse en el navegador del teléfono (y se puede agregar a la pantalla de inicio). En escritorio también funciona.

No hay base de datos ni inicio de sesión: usa un catálogo de ejemplo en memoria. Los pedidos y recepciones que captures viven en esa sesión.

## Qué incluye

- **Existencias:** búsqueda, filtro de bajo mínimo y ficha del SKU.
- **Pedidos:** listado con filtros, detalle y alta simple.
- **Recepción de mercancía:** cantidades recibidas vs pedidas; al confirmar, sube la existencia.
- Estados de **carga**, **error** (botón “Simular error” + Reintentar) y **vacío**.

## Cómo correrlo en local

Requisitos: Node.js 20+.

```bash
npm install
npm run dev
```

Abre [http://localhost:4317](http://localhost:4317). El servidor escucha en `0.0.0.0:4317`.

Producción local:

```bash
npm run build
npm start
```

## Stack

Next.js (App Router), TypeScript, Tailwind CSS y shadcn/ui.
