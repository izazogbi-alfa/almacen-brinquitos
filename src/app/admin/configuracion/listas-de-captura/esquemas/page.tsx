"use client";

import { Plus } from "lucide-react";
import { CabeceraConfiguracion } from "@/components/cabecera-configuracion";
import { EditorEsquema } from "@/components/editores-catalogo";
import { ListaOrdenable, TEXTO_ORDEN } from "@/components/lista-ordenable";
import { AsyncGate } from "@/components/status-views";
import { Button } from "@/components/ui/button";
import {
  SinAccesoConfiguracion,
  useEditorCatalogos,
} from "@/components/use-editor-catalogos";
import type { EsquemaCatalogo } from "@/lib/types";

function PaginaEsquemas() {
  const { permitido, draft, setDraft, guardando, guardarBloque } =
    useEditorCatalogos();

  if (!permitido) return <SinAccesoConfiguracion />;

  function setEsquemas(esquemas: EsquemaCatalogo[]) {
    setDraft({ ...draft, esquemas });
  }

  return (
    <div className="space-y-4">
      <CabeceraConfiguracion
        titulo="Esquemas de conteo"
        descripcion="Tú armas los esquemas. No hay listas de fábrica (niño 0–60, letra, accesorio). Cada bloque se guarda con su botón Guardar. Elige PDF compacto o detallado en el esquema: así salen todas las prendas que lo usan."
      />
      <section className="space-y-3 rounded-xl border p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="mt-1 text-sm font-medium">{TEXTO_ORDEN}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-12"
            onClick={() =>
              setEsquemas([
                ...draft.esquemas,
                {
                  id: `esq-${Date.now()}`,
                  nombre: "Esquema nuevo",
                  tallas: [],
                  estiloPdf: "compacto",
                },
              ])
            }
          >
            <Plus className="size-4" />
            Esquema
          </Button>
        </div>
        {draft.esquemas.length === 0 ? (
          <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
            Aún no hay esquemas. Pulsa Esquema, ponle nombre y tallas, y
            Guardar. Luego asígnalos en Artículos → Agregar esquemas.
          </p>
        ) : (
          <ListaOrdenable
            items={draft.esquemas}
            getKey={(e) => e.id}
            etiqueta={(e) => e.nombre}
            onReorder={setEsquemas}
          />
        )}
        <Button
          type="button"
          className="h-12 w-full"
          disabled={guardando === "esquemas-orden" || draft.esquemas.length === 0}
          onClick={() =>
            void guardarBloque("esquemas-orden", { esquemas: draft.esquemas })
          }
        >
          {guardando === "esquemas-orden" ? "Guardando…" : "Guardar"}
        </Button>
        <div className="space-y-3">
          {draft.esquemas.map((e, i) => (
            <EditorEsquema
              key={e.id}
              esquema={e}
              sePuedeEliminar
              guardando={guardando === `esquema-${e.id}`}
              onChange={(sig) =>
                setEsquemas(draft.esquemas.map((x, j) => (j === i ? sig : x)))
              }
              onEliminar={() => {
                const siguientes = draft.esquemas.filter((_, j) => j !== i);
                setEsquemas(siguientes);
                void guardarBloque(`esquema-${e.id}`, { esquemas: siguientes });
              }}
              onGuardar={(sig) => {
                const esquemas = draft.esquemas.map((x, j) =>
                  j === i ? sig : x,
                );
                setEsquemas(esquemas);
                return guardarBloque(`esquema-${e.id}`, { esquemas });
              }}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

export default function PaginaEsquemasRuta() {
  return (
    <AsyncGate>
      <PaginaEsquemas />
    </AsyncGate>
  );
}
