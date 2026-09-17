"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AsyncGate, EmptyView } from "@/components/status-views";
import { useInventory } from "@/lib/inventory-context";
import { agregarUnicos, parseLista, quitarDeLista } from "@/lib/listas";
import type { Catalogos, EsquemaCatalogo } from "@/lib/types";

function EditorChips({
  titulo,
  descripcion,
  placeholder,
  vacio,
  items,
  onChange,
}: {
  titulo: string;
  descripcion: string;
  placeholder: string;
  vacio: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  const [entrada, setEntrada] = useState("");

  function agregar() {
    const nuevos = parseLista(entrada);
    if (nuevos.length === 0) return;
    onChange(agregarUnicos(items, nuevos));
    setEntrada("");
  }

  return (
    <section className="space-y-3 rounded-xl border p-4">
      <div>
        <h3 className="font-heading text-lg font-semibold">{titulo}</h3>
        <p className="text-sm text-muted-foreground">{descripcion}</p>
      </div>
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
          {vacio}
        </p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <li key={item}>
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-sm text-teal-950 ring-1 ring-teal-200">
                {item}
                <button
                  type="button"
                  className="rounded-full p-0.5 hover:bg-white"
                  aria-label={`Quitar ${item}`}
                  onClick={() => onChange(quitarDeLista(items, item))}
                >
                  <X className="size-3.5" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input
          className="h-11"
          value={entrada}
          placeholder={placeholder}
          onChange={(e) => setEntrada(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              agregar();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          className="h-11 shrink-0 gap-1"
          onClick={agregar}
        >
          <Plus className="size-4" />
          Agregar
        </Button>
      </div>
    </section>
  );
}

function EditorEsquema({
  esquema,
  onChange,
  onEliminar,
  sePuedeEliminar,
}: {
  esquema: EsquemaCatalogo;
  onChange: (e: EsquemaCatalogo) => void;
  onEliminar: () => void;
  sePuedeEliminar: boolean;
}) {
  const [entrada, setEntrada] = useState("");

  function agregar() {
    const nuevos = parseLista(entrada);
    if (nuevos.length === 0) return;
    onChange({ ...esquema, tallas: agregarUnicos(esquema.tallas, nuevos) });
    setEntrada("");
  }

  return (
    <div className="space-y-2 rounded-xl border p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Nombre</Label>
          <Input
            className="h-11"
            value={esquema.nombre}
            onChange={(e) => onChange({ ...esquema, nombre: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label>Nota</Label>
          <Input
            className="h-11"
            value={esquema.detalle ?? ""}
            onChange={(e) => onChange({ ...esquema, detalle: e.target.value })}
            placeholder="Opcional"
          />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Tallas de este esquema. Vacío = se cuenta solo con color y cantidad.
      </p>
      {esquema.tallas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin tallas (accesorio).</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {esquema.tallas.map((t) => (
            <li key={t}>
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-sm">
                {t}
                <button
                  type="button"
                  className="rounded-full p-0.5 hover:bg-background"
                  aria-label={`Quitar ${t}`}
                  onClick={() =>
                    onChange({
                      ...esquema,
                      tallas: quitarDeLista(esquema.tallas, t),
                    })
                  }
                >
                  <X className="size-3.5" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input
          className="h-11"
          value={entrada}
          placeholder="Ej. 4, 6, 8 o CHICO"
          onChange={(e) => setEntrada(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              agregar();
            }
          }}
        />
        <Button type="button" variant="outline" className="h-11" onClick={agregar}>
          Agregar
        </Button>
      </div>
      {sePuedeEliminar ? (
        <Button type="button" variant="ghost" className="w-full" onClick={onEliminar}>
          Quitar este esquema
        </Button>
      ) : null}
    </div>
  );
}

function ConfiguracionAdmin() {
  const { user, catalogos, guardarCatalogos } = useInventory();
  const [draft, setDraft] = useState<Catalogos>(catalogos);
  const [guardando, setGuardando] = useState(false);

  if (user?.rol !== "admin") {
    return (
      <EmptyView
        titulo="Solo administradora"
        detalle="Iza arma aquí las listas. Quien solo cuenta o recibe mercancía las elige al capturar."
      />
    );
  }

  function setEsquemas(esquemas: EsquemaCatalogo[]) {
    setDraft({ ...draft, esquemas });
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Configuración
        </h2>
        <p className="text-sm text-muted-foreground">
          Listas establecidas. En existencias, recepción y pedidos solo se
          elige de aquí; no se inventan colores ni tallas al vuelo.
        </p>
      </div>

      <section className="space-y-3 rounded-xl border p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-heading text-lg font-semibold">
              Esquemas de conteo
            </h3>
            <p className="text-sm text-muted-foreground">
              Cómo se cuenta: niño, letra, accesorio u otro que tú armes.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={() =>
              setEsquemas([
                ...draft.esquemas,
                {
                  id: `esq-${Date.now()}`,
                  nombre: "Esquema nuevo",
                  detalle: "",
                  tallas: [],
                },
              ])
            }
          >
            <Plus className="size-4" />
            Esquema
          </Button>
        </div>
        <div className="space-y-3">
          {draft.esquemas.map((e, i) => (
            <EditorEsquema
              key={e.id}
              esquema={e}
              sePuedeEliminar={draft.esquemas.length > 1}
              onChange={(sig) =>
                setEsquemas(draft.esquemas.map((x, j) => (j === i ? sig : x)))
              }
              onEliminar={() =>
                setEsquemas(draft.esquemas.filter((_, j) => j !== i))
              }
            />
          ))}
        </div>
      </section>

      <EditorChips
        titulo="Colores"
        descripcion="Colores que el operador puede elegir al capturar."
        placeholder="Ej. blanco, rosa, azul"
        vacio="Aún no hay colores. Agrega los que usan en el almacén."
        items={draft.colores}
        onChange={(colores) => setDraft({ ...draft, colores })}
      />
      <EditorChips
        titulo="Tallas"
        descripcion="Catálogo general de tallas. También puedes copiarlas a un esquema."
        placeholder="Ej. 1, 1X, 4 o CHICO"
        vacio="Aún no hay tallas sueltas."
        items={draft.tallas}
        onChange={(tallas) => setDraft({ ...draft, tallas })}
      />
      <EditorChips
        titulo="Especificaciones"
        descripcion="Notas de captura: manga, forro, paquete, etc."
        placeholder="Ej. manga corta, con gorro"
        vacio="Aún no hay especificaciones. El operador las verá vacías hasta que las armes."
        items={draft.especificaciones}
        onChange={(especificaciones) =>
          setDraft({ ...draft, especificaciones })
        }
      />

      <Button
        type="button"
        className="h-11 w-full"
        disabled={guardando}
        onClick={async () => {
          setGuardando(true);
          try {
            await guardarCatalogos(draft);
            toast.success("Listas guardadas");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Error");
          } finally {
            setGuardando(false);
          }
        }}
      >
        {guardando ? "Guardando…" : "Guardar listas"}
      </Button>
    </div>
  );
}

export default function PaginaConfiguracion() {
  return (
    <AsyncGate>
      <ConfiguracionAdmin />
    </AsyncGate>
  );
}
