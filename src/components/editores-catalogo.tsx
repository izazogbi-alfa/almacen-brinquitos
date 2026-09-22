"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { DialogQuitarConClave } from "@/components/dialog-quitar-con-clave";
import { ListaOrdenable, TEXTO_ORDEN } from "@/components/lista-ordenable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseLista, quitarDeLista } from "@/lib/listas";
import { listaTallas, listaTitulo, tituloEtiqueta, tituloTalla } from "@/lib/titulo-etiqueta";
import type { EsquemaCatalogo } from "@/lib/types";

export function EditorChips({
  titulo,
  descripcion,
  placeholder,
  vacio,
  items,
  guardando,
  onChange,
  onGuardar,
  tipo = "titulo",
}: {
  titulo: string;
  descripcion: string;
  placeholder: string;
  vacio: string;
  items: string[];
  guardando: boolean;
  onChange: (items: string[]) => void;
  onGuardar: (items: string[]) => Promise<void>;
  tipo?: "titulo" | "talla";
}) {
  const [entrada, setEntrada] = useState("");
  const [quitar, setQuitar] = useState<string | null>(null);
  const formatear = tipo === "talla" ? tituloTalla : tituloEtiqueta;

  function agregar() {
    const nuevos = parseLista(entrada).map(formatear);
    if (nuevos.length === 0) return;
    onChange(tipo === "talla" ? listaTallas([...items, ...nuevos]) : listaTitulo([...items, ...nuevos]));
    setEntrada("");
  }

  return (
    <section className="space-y-3 rounded-xl border p-4">
      <div>
        <h3 className="font-heading text-lg font-semibold">{titulo}</h3>
        <p className="text-sm text-muted-foreground">{descripcion}</p>
        <p className="mt-1 text-sm font-medium">{TEXTO_ORDEN}</p>
      </div>
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
          {vacio}
        </p>
      ) : (
        <ListaOrdenable
          items={items}
          getKey={(item) => item}
          etiqueta={(item) => formatear(item)}
          onReorder={onChange}
          onQuitar={(item) => setQuitar(item)}
        />
      )}
      <div className="flex gap-2">
        <Input
          className="h-12"
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
          className="h-12 shrink-0 gap-1"
          onClick={agregar}
        >
          <Plus className="size-4" />
          Agregar
        </Button>
      </div>
      <Button
        type="button"
        className="h-12 w-full"
        disabled={guardando}
        onClick={() => void onGuardar(tipo === "talla" ? listaTallas(items) : listaTitulo(items))}
      >
        {guardando ? "Guardando…" : "Guardar"}
      </Button>
      <DialogQuitarConClave
        abierto={quitar !== null}
        titulo={`¿Quitar ${quitar ?? ""}?`}
        descripcion={`Para quitar «${quitar ?? ""}» escribe tu contraseña y pulsa Sí. Si pulsas No o la contraseña no es, se queda.`}
        idCampo={`clave-${titulo}`}
        onNo={() => setQuitar(null)}
        onSi={() => {
          if (!quitar) return;
          const siguientes = quitarDeLista(items, quitar);
          onChange(siguientes);
          setQuitar(null);
          void onGuardar(siguientes);
        }}
      />
    </section>
  );
}

export function EditorEsquema({
  esquema,
  onChange,
  onEliminar,
  onGuardar,
  sePuedeEliminar,
  guardando,
}: {
  esquema: EsquemaCatalogo;
  onChange: (e: EsquemaCatalogo) => void;
  onEliminar: () => void;
  onGuardar: (esquema: EsquemaCatalogo) => Promise<void>;
  sePuedeEliminar: boolean;
  guardando: boolean;
}) {
  const [entrada, setEntrada] = useState("");
  const [quitarEsquema, setQuitarEsquema] = useState(false);
  const [quitarTalla, setQuitarTalla] = useState<string | null>(null);

  function agregar() {
    const nuevos = parseLista(entrada).map(tituloTalla);
    if (nuevos.length === 0) return;
    onChange({ ...esquema, tallas: listaTallas([...esquema.tallas, ...nuevos]) });
    setEntrada("");
  }

  return (
    <div className="space-y-3 rounded-xl border p-3">
      <div className="space-y-1">
        <Label>Nombre</Label>
        <Input
          className="h-12"
          value={esquema.nombre}
          onChange={(e) => onChange({ ...esquema, nombre: e.target.value })}
          onBlur={() =>
            onChange({
              ...esquema,
              nombre: tituloEtiqueta(esquema.nombre) || esquema.nombre,
            })
          }
        />
      </div>
      <p className="text-sm text-muted-foreground">
        Tallas de este esquema. Vacío = se cuenta solo con color y cantidad.
        Ordénalas arrastrando las fichas.
      </p>
      {esquema.tallas.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Sin tallas: se cuenta solo con color y cantidad.
        </p>
      ) : (
        <ListaOrdenable
          items={esquema.tallas}
          getKey={(t) => t}
          etiqueta={(t) => tituloTalla(t)}
          onReorder={(tallas) => onChange({ ...esquema, tallas })}
          onQuitar={(t) => setQuitarTalla(t)}
        />
      )}
      <div className="flex gap-2">
        <Input
          className="h-12"
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
        <Button type="button" variant="outline" className="h-12" onClick={agregar}>
          Agregar
        </Button>
      </div>
      <Button
        type="button"
        className="h-12 w-full"
        disabled={guardando}
        onClick={() =>
          void onGuardar({
            ...esquema,
            nombre: tituloEtiqueta(esquema.nombre) || esquema.nombre,
            tallas: listaTallas(esquema.tallas),
          })
        }
      >
        {guardando ? "Guardando…" : "Guardar"}
      </Button>
      {sePuedeEliminar ? (
        <Button
          type="button"
          variant="ghost"
          className="h-12 w-full"
          onClick={() => setQuitarEsquema(true)}
        >
          Quitar este esquema
        </Button>
      ) : null}

      <DialogQuitarConClave
        abierto={quitarEsquema}
        titulo="¿Quitar este esquema?"
        descripcion={`Para quitar «${esquema.nombre}» escribe tu contraseña y pulsa Sí. Si pulsas No o la contraseña no es, el esquema se queda.`}
        idCampo={`clave-esquema-${esquema.id}`}
        onNo={() => setQuitarEsquema(false)}
        onSi={() => {
          setQuitarEsquema(false);
          onEliminar();
        }}
      />
      <DialogQuitarConClave
        abierto={quitarTalla !== null}
        titulo={`¿Quitar talla ${quitarTalla ?? ""}?`}
        descripcion={`Para quitar «${quitarTalla ?? ""}» de este esquema escribe tu contraseña y pulsa Sí. Si pulsas No o la contraseña no es, se queda.`}
        idCampo={`clave-talla-${esquema.id}`}
        onNo={() => setQuitarTalla(null)}
        onSi={() => {
          if (!quitarTalla) return;
          const sig = {
            ...esquema,
            tallas: quitarDeLista(esquema.tallas, quitarTalla),
          };
          onChange(sig);
          setQuitarTalla(null);
          void onGuardar(sig);
        }}
      />
    </div>
  );
}
