"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AsyncGate, EmptyView } from "@/components/status-views";
import { etiquetaUnidad } from "@/lib/format";
import { useInventory } from "@/lib/inventory-context";
import type { Producto } from "@/lib/types";

function estaBajoMinimo(producto: Producto) {
  return producto.existencia <= producto.minimo;
}

function ExistenciasContent() {
  const { productos } = useInventory();
  const [q, setQ] = useState("");
  const [soloBajos, setSoloBajos] = useState(false);
  const [activo, setActivo] = useState<Producto | null>(null);

  const filtrados = useMemo(() => {
    const texto = q.trim().toLowerCase();
    return productos
      .filter((p) => {
        if (soloBajos && !estaBajoMinimo(p)) return false;
        if (!texto) return true;
        return (
          p.nombre.toLowerCase().includes(texto) ||
          p.sku.toLowerCase().includes(texto) ||
          p.categoria.toLowerCase().includes(texto)
        );
      })
      .sort((a, b) => Number(estaBajoMinimo(b)) - Number(estaBajoMinimo(a)));
  }, [productos, q, soloBajos]);

  const bajos = productos.filter(estaBajoMinimo).length;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Existencias
        </h2>
        <p className="text-sm text-muted-foreground">
          {productos.length} SKU en piso · {bajos} bajo mínimo
        </p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre, SKU o categoría"
          className="h-11 pl-9 text-base"
          aria-label="Buscar existencias"
        />
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant={soloBajos ? "outline" : "default"}
          className="h-10"
          onClick={() => setSoloBajos(false)}
        >
          Todos
        </Button>
        <Button
          type="button"
          variant={soloBajos ? "default" : "outline"}
          className="h-10"
          onClick={() => setSoloBajos(true)}
        >
          Bajo mínimo
        </Button>
      </div>

      {filtrados.length === 0 ? (
        <EmptyView
          titulo={soloBajos ? "Nada bajo mínimo" : "Sin coincidencias"}
          detalle={
            q
              ? `No hay productos que coincidan con “${q}”. Prueba otro SKU o nombre.`
              : "Con el filtro actual no hay productos para mostrar."
          }
        />
      ) : (
        <ul className="space-y-3">
          {filtrados.map((producto) => {
            const bajo = estaBajoMinimo(producto);
            const pct = Math.min(
              100,
              Math.round((producto.existencia / Math.max(producto.minimo, 1)) * 100),
            );
            return (
              <li key={producto.id}>
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => setActivo(producto)}
                >
                  <Card className="transition-colors hover:bg-muted/40">
                    <CardContent className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{producto.nombre}</p>
                          <p className="text-xs text-muted-foreground">
                            {producto.sku} · {producto.categoria}
                          </p>
                        </div>
                        <Badge variant={bajo ? "destructive" : "secondary"}>
                          {bajo ? "Bajo mínimo" : "En rango"}
                        </Badge>
                      </div>
                      <div className="flex items-end justify-between text-sm">
                        <p>
                          <span className="text-xl font-semibold">
                            {producto.existencia}
                          </span>{" "}
                          <span className="text-muted-foreground">
                            {producto.unidad} en mano
                          </span>
                        </p>
                        <p className="text-muted-foreground">
                          Mín. {producto.minimo}
                        </p>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className={
                            bajo
                              ? "h-full rounded-full bg-destructive"
                              : "h-full rounded-full bg-teal-700"
                          }
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={!!activo} onOpenChange={(open) => !open && setActivo(null)}>
        <DialogContent className="sm:max-w-md">
          {activo ? (
            <>
              <DialogHeader>
                <DialogTitle>{activo.nombre}</DialogTitle>
                <DialogDescription>
                  {activo.sku} · {activo.categoria}
                </DialogDescription>
              </DialogHeader>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Existencia</dt>
                  <dd className="font-medium">
                    {etiquetaUnidad(activo.unidad, activo.existencia)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Mínimo</dt>
                  <dd className="font-medium">
                    {etiquetaUnidad(activo.unidad, activo.minimo)}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-muted-foreground">Ubicación</dt>
                  <dd className="font-medium">{activo.ubicacion}</dd>
                </div>
              </dl>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ExistenciasPage() {
  return (
    <AsyncGate>
      <ExistenciasContent />
    </AsyncGate>
  );
}
