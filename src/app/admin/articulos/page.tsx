"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AsyncGate, EmptyView } from "@/components/status-views";
import { useInventory } from "@/lib/inventory-context";
import type { EsquemaConteo, Producto } from "@/lib/types";
import { coloresProducto, esquemaDe, tallasProducto } from "@/lib/sucursales";

function ArticulosAdmin() {
  const { productos, user, guardarArticulo } = useInventory();
  const [q, setQ] = useState("");
  const [activo, setActivo] = useState<Producto | null>(null);
  const [nombre, setNombre] = useState("");
  const [sku, setSku] = useState("");
  const [categoria, setCategoria] = useState("");
  const [esquema, setEsquema] = useState<EsquemaConteo>("accesorio");
  const [colores, setColores] = useState("");
  const [tallas, setTallas] = useState("");
  const [guardando, setGuardando] = useState(false);

  if (user?.rol !== "admin") {
    return (
      <EmptyView
        titulo="Solo administradora"
        detalle="Iza define las especificaciones de cada artículo."
      />
    );
  }

  const hits = productos.filter((p) => {
    const t = q.trim().toLowerCase();
    if (!t) return false;
    return p.nombre.toLowerCase().includes(t) || p.sku.toLowerCase().includes(t);
  });

  function abrir(p: Producto) {
    setActivo(p);
    setNombre(p.nombre);
    setSku(p.sku);
    setCategoria(p.categoria);
    setEsquema(esquemaDe(p));
    setColores(coloresProducto(p).join(", "));
    setTallas(p.tallas?.length ? p.tallas.join(", ") : "");
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Artículos
        </h2>
        <p className="text-sm text-muted-foreground">
          Define talla (niño / letra / accesorio) y colores de cada código.
        </p>
      </div>
      <Input
        className="h-11"
        placeholder="Buscar artículo"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {!q.trim() ? (
        <EmptyView
          titulo="Busca para no listar todo el catálogo"
          detalle="Ej. ropón, chaleco, BRI-1001."
        />
      ) : hits.length === 0 ? (
        <EmptyView titulo="Sin coincidencias" detalle={`Nada con “${q}”.`} />
      ) : !activo ? (
        <ul className="space-y-2">
          {hits.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="w-full rounded-xl border p-3 text-left"
                onClick={() => abrir(p)}
              >
                <p className="font-medium">{p.nombre}</p>
                <p className="text-xs text-muted-foreground">
                  {p.sku} · {esquemaDe(p)}
                </p>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setGuardando(true);
            try {
              await guardarArticulo({
                id: activo.id,
                nombre,
                sku,
                categoria,
                esquemaConteo: esquema,
                colores,
                tallas,
              });
              toast.success("Especificación guardada");
              setActivo(null);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Error");
            } finally {
              setGuardando(false);
            }
          }}
        >
          <div className="space-y-1">
            <Label>Nombre</Label>
            <Input className="h-11" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>SKU</Label>
            <Input className="h-11" value={sku} onChange={(e) => setSku(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Categoría</Label>
            <Input className="h-11" value={categoria} onChange={(e) => setCategoria(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Esquema de conteo</Label>
            <select
              className="h-11 w-full rounded-lg border bg-background px-3"
              value={esquema}
              onChange={(e) => setEsquema(e.target.value as EsquemaConteo)}
            >
              <option value="nino">Ropa niño (tallas 0–60 pares)</option>
              <option value="letra">Letra (EXCHICO…ADULTO)</option>
              <option value="accesorio">Accesorio (sin talla)</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label>Colores (separados por coma)</Label>
            <Input className="h-11" value={colores} onChange={(e) => setColores(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Tallas propias (opcional, coma)</Label>
            <Input
              className="h-11"
              value={tallas}
              onChange={(e) => setTallas(e.target.value)}
              placeholder={
                esquema === "nino"
                  ? "Vacío = 0,2,4…60"
                  : esquema === "letra"
                    ? "Vacío = EXCHICO…ADULTO"
                    : "Vacío = sin talla"
              }
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Vista previa tallas: {tallasProducto({ ...activo, esquemaConteo: esquema, tallas: tallas.split(",").map((x) => x.trim()).filter(Boolean) }).slice(0, 8).join(", ")}
            …
          </p>
          <Button type="submit" className="h-11 w-full" disabled={guardando}>
            {guardando ? "Guardando…" : "Guardar especificación"}
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={() => setActivo(null)}>
            Volver
          </Button>
        </form>
      )}
    </div>
  );
}

export default function PaginaArticulos() {
  return (
    <AsyncGate>
      <ArticulosAdmin />
    </AsyncGate>
  );
}
