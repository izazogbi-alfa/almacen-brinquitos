"use client";

import { useState } from "react";
import { Plus, Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { agregarUnicos, parseLista } from "@/lib/listas-articulo";
import { TALLAS_LETRA, TALLAS_NINO } from "@/lib/sucursales";
import type { EsquemaConteo } from "@/lib/types";
import { cn } from "@/lib/utils";

export function etiquetaEsquema(esquema: EsquemaConteo) {
  if (esquema === "nino") return "Niño 0–60";
  if (esquema === "letra") return "Letra EXCHICO…ADULTO";
  return "Accesorio (sin talla)";
}

function Chips({ items }: { items: string[] }) {
  const extra = items.length > 12 ? items.length - 12 : 0;
  const visibles = extra ? items.slice(0, 12) : items;
  return (
    <ul className="mt-1 flex flex-wrap gap-1.5">
      {visibles.map((item) => (
        <li
          key={item}
          className="rounded-full bg-teal-50 px-2.5 py-1 text-sm text-teal-950 ring-1 ring-teal-200"
        >
          {item}
        </li>
      ))}
      {extra > 0 ? (
        <li className="rounded-full bg-muted px-2.5 py-1 text-sm text-muted-foreground">
          y {extra} más
        </li>
      ) : null}
    </ul>
  );
}

export function BloqueConfig({
  titulo,
  vacio,
  items,
  onConfigurar,
}: {
  titulo: string;
  vacio: string;
  items: string[];
  onConfigurar: () => void;
}) {
  return (
    <div className="rounded-xl border p-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{titulo}</p>
          {items.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">{vacio}</p>
          ) : (
            <Chips items={items} />
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          className="size-12 shrink-0"
          aria-label={`Configurar ${titulo}`}
          onClick={onConfigurar}
        >
          <Settings className="size-6" />
        </Button>
      </div>
    </div>
  );
}

export function DialogoEsquema({
  abierto,
  onCerrar,
  actual,
  onGuardar,
}: {
  abierto: boolean;
  onCerrar: () => void;
  actual: EsquemaConteo;
  onGuardar: (esquema: EsquemaConteo, tallasPlantilla?: string[]) => void;
}) {
  const [esquema, setEsquema] = useState(actual);

  const plantillas: {
    id: EsquemaConteo;
    titulo: string;
    detalle: string;
    tallas: string[];
  }[] = [
    {
      id: "nino",
      titulo: "Ropa de niño",
      detalle: "Plantilla 0, 2, 4 … 60. Solo se copia si tú lo pides.",
      tallas: [...TALLAS_NINO],
    },
    {
      id: "letra",
      titulo: "Talla de letra",
      detalle: "EXCHICO, CHICO, MEDIANO, GRANDE, EXGRANDE, ADULTO.",
      tallas: [...TALLAS_LETRA],
    },
    {
      id: "accesorio",
      titulo: "Accesorio",
      detalle: "Se cuenta sin talla. No arma una tabla de colores × tallas.",
      tallas: [],
    },
  ];

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-md"
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle>Esquema de conteo</DialogTitle>
          <DialogDescription>
            Elige cómo se cuenta este artículo. Puedes dejar las tallas como
            están o copiar una plantilla nueva a su lista.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          {plantillas.map((p) => (
            <button
              key={p.id}
              type="button"
              className={cn(
                "rounded-xl border p-3 text-left",
                esquema === p.id && "border-teal-700 ring-2 ring-teal-700/25",
              )}
              onClick={() => setEsquema(p.id)}
            >
              <p className="font-medium">{p.titulo}</p>
              <p className="text-sm text-muted-foreground">{p.detalle}</p>
            </button>
          ))}
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button type="button" className="h-11 w-full" onClick={() => onGuardar(esquema)}>
            Guardar esquema
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-11 w-full"
            onClick={() => {
              const p = plantillas.find((x) => x.id === esquema);
              onGuardar(esquema, p?.tallas);
            }}
          >
            Guardar y copiar plantilla a tallas
          </Button>
          <Button type="button" variant="outline" className="h-11 w-full" onClick={onCerrar}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DialogoListaArticulo({
  abierto,
  onCerrar,
  titulo,
  descripcion,
  placeholder,
  valores,
  onGuardar,
}: {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  descripcion: string;
  placeholder: string;
  valores: string[];
  onGuardar: (items: string[]) => void;
}) {
  const [modo, setModo] = useState<"editar" | "nueva" | "sumar">(
    valores.length ? "editar" : "nueva",
  );
  const [draft, setDraft] = useState<string[]>(valores);
  const [entrada, setEntrada] = useState("");

  function aplicarEntrada() {
    const nuevos = parseLista(entrada);
    if (nuevos.length === 0) return;
    setDraft((prev) => agregarUnicos(prev, nuevos));
    setEntrada("");
  }

  const visible =
    modo === "sumar" ? agregarUnicos(valores, draft) : draft;

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-md"
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descripcion}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-1.5">
          <Button
            type="button"
            variant={modo === "editar" ? "default" : "outline"}
            className="h-11 px-2 text-xs sm:text-sm"
            onClick={() => {
              setModo("editar");
              setDraft(valores);
            }}
          >
            Editar
          </Button>
          <Button
            type="button"
            variant={modo === "nueva" ? "default" : "outline"}
            className="h-11 px-2 text-xs sm:text-sm"
            onClick={() => {
              setModo("nueva");
              setDraft([]);
              setEntrada("");
            }}
          >
            Lista nueva
          </Button>
          <Button
            type="button"
            variant={modo === "sumar" ? "default" : "outline"}
            className="h-11 px-2 text-xs sm:text-sm"
            onClick={() => {
              setModo("sumar");
              setDraft([]);
              setEntrada("");
            }}
          >
            Sumar
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          {modo === "editar"
            ? "Cambia lo que ya tiene este artículo. Quita con la X o agrega abajo."
            : modo === "nueva"
              ? "Empieza de cero. Al guardar, reemplaza la lista de este artículo."
              : "Lo que agregues se junta con lo que ya tiene. No borra lo anterior."}
        </p>

        {visible.length === 0 ? (
          <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
            Todavía no hay nada en la lista.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {visible.map((item) => (
              <li key={item}>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-sm">
                  {item}
                  {modo !== "sumar" || draft.includes(item) ? (
                    <button
                      type="button"
                      className="rounded-full p-0.5 hover:bg-background"
                      aria-label={`Quitar ${item}`}
                      onClick={() => {
                        if (modo === "sumar") {
                          setDraft((prev) => prev.filter((x) => x !== item));
                        } else {
                          setDraft((prev) => prev.filter((x) => x !== item));
                        }
                      }}
                    >
                      <X className="size-3.5" />
                    </button>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-1">
          <Label htmlFor="item-lista-articulo">Agregar (uno o varios)</Label>
          <div className="flex gap-2">
            <Input
              id="item-lista-articulo"
              className="h-11"
              value={entrada}
              placeholder={placeholder}
              onChange={(e) => setEntrada(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  aplicarEntrada();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="h-11 shrink-0 gap-1"
              onClick={aplicarEntrada}
            >
              <Plus className="size-4" />
              Agregar
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (modo === "sumar") onGuardar(agregarUnicos(valores, draft));
              else onGuardar(draft);
            }}
          >
            Guardar lista
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
