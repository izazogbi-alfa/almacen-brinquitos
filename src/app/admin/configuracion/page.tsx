"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { DialogQuitarConClave } from "@/components/dialog-quitar-con-clave";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AsyncGate, EmptyView } from "@/components/status-views";
import { useInventory } from "@/lib/inventory-context";
import {
  agregarUnicos,
  moverEnLista,
  parseLista,
  quitarDeLista,
} from "@/lib/listas";
import type { Catalogos, EsquemaCatalogo } from "@/lib/types";

function BotonesOrden({
  indice,
  total,
  etiqueta,
  onMover,
}: {
  indice: number;
  total: number;
  etiqueta: string;
  onMover: (direccion: -1 | 1) => void;
}) {
  return (
    <div className="flex shrink-0 gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-11"
        disabled={indice === 0}
        aria-label={`Subir ${etiqueta}`}
        onClick={() => onMover(-1)}
      >
        <ChevronUp className="size-5" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-11"
        disabled={indice === total - 1}
        aria-label={`Bajar ${etiqueta}`}
        onClick={() => onMover(1)}
      >
        <ChevronDown className="size-5" />
      </Button>
    </div>
  );
}

function EditorChips({
  titulo,
  descripcion,
  placeholder,
  vacio,
  items,
  guardando,
  onChange,
  onGuardar,
}: {
  titulo: string;
  descripcion: string;
  placeholder: string;
  vacio: string;
  items: string[];
  guardando: boolean;
  onChange: (items: string[]) => void;
  onGuardar: (items: string[]) => Promise<void>;
}) {
  const [entrada, setEntrada] = useState("");
  const [quitar, setQuitar] = useState<string | null>(null);

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
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li
              key={`${item}-${i}`}
              className="flex items-center gap-2 rounded-lg border bg-teal-50/60 px-2 py-1.5 text-teal-950"
            >
              <span className="min-w-0 flex-1 truncate px-1 text-sm font-medium">
                {item}
              </span>
              <BotonesOrden
                indice={i}
                total={items.length}
                etiqueta={item}
                onMover={(dir) => onChange(moverEnLista(items, i, dir))}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-11 shrink-0"
                aria-label={`Quitar ${item}`}
                onClick={() => setQuitar(item)}
              >
                <X className="size-4" />
              </Button>
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
      <Button
        type="button"
        className="h-11 w-full"
        disabled={guardando}
        onClick={() => void onGuardar(items)}
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

function EditorEsquema({
  esquema,
  indice,
  total,
  onChange,
  onMover,
  onEliminar,
  onGuardar,
  sePuedeEliminar,
  guardando,
}: {
  esquema: EsquemaCatalogo;
  indice: number;
  total: number;
  onChange: (e: EsquemaCatalogo) => void;
  onMover: (direccion: -1 | 1) => void;
  onEliminar: () => void;
  onGuardar: (esquema: EsquemaCatalogo) => Promise<void>;
  sePuedeEliminar: boolean;
  guardando: boolean;
}) {
  const [entrada, setEntrada] = useState("");
  const [quitarEsquema, setQuitarEsquema] = useState(false);
  const [quitarTalla, setQuitarTalla] = useState<string | null>(null);

  function agregar() {
    const nuevos = parseLista(entrada);
    if (nuevos.length === 0) return;
    onChange({ ...esquema, tallas: agregarUnicos(esquema.tallas, nuevos) });
    setEntrada("");
  }

  return (
    <div className="space-y-3 rounded-xl border p-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <Label>Nombre</Label>
          <Input
            className="h-11"
            value={esquema.nombre}
            onChange={(e) => onChange({ ...esquema, nombre: e.target.value })}
          />
        </div>
        <div className="pt-6">
          <BotonesOrden
            indice={indice}
            total={total}
            etiqueta={esquema.nombre}
            onMover={onMover}
          />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Tallas de este esquema. Vacío = se cuenta solo con color y cantidad.
      </p>
      {esquema.tallas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin tallas (accesorio).</p>
      ) : (
        <ul className="space-y-2">
          {esquema.tallas.map((t, i) => (
            <li
              key={`${t}-${i}`}
              className="flex items-center gap-2 rounded-lg border bg-muted/60 px-2 py-1.5"
            >
              <span className="min-w-0 flex-1 truncate px-1 text-sm">{t}</span>
              <BotonesOrden
                indice={i}
                total={esquema.tallas.length}
                etiqueta={t}
                onMover={(dir) =>
                  onChange({
                    ...esquema,
                    tallas: moverEnLista(esquema.tallas, i, dir),
                  })
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-11 shrink-0"
                aria-label={`Quitar ${t}`}
                onClick={() => setQuitarTalla(t)}
              >
                <X className="size-4" />
              </Button>
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
      <Button
        type="button"
        className="h-11 w-full"
        disabled={guardando}
        onClick={() => void onGuardar(esquema)}
      >
        {guardando ? "Guardando…" : "Guardar"}
      </Button>
      {sePuedeEliminar ? (
        <Button
          type="button"
          variant="ghost"
          className="h-11 w-full"
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

function ConfiguracionAdmin() {
  const { user, catalogos, guardarCatalogos } = useInventory();
  const [draft, setDraft] = useState<Catalogos>(catalogos);
  const [guardando, setGuardando] = useState<string | null>(null);

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

  async function guardarBloque(clave: string, payload: Partial<Catalogos>) {
    setGuardando(clave);
    try {
      await guardarCatalogos(payload);
      toast.success("Guardado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setGuardando(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Configuración
        </h2>
        <p className="text-sm text-muted-foreground">
          Listas establecidas. En existencias, recepción y pedidos solo se
          elige de aquí; no se inventan colores ni tallas al vuelo. Cada bloque
          se guarda por su botón Guardar.
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
              Sube o baja cada esquema y pulsa Guardar en esa tarjeta.
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
              indice={i}
              total={draft.esquemas.length}
              sePuedeEliminar={draft.esquemas.length > 1}
              guardando={guardando === `esquema-${e.id}`}
              onMover={(dir) =>
                setEsquemas(moverEnLista(draft.esquemas, i, dir))
              }
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

      <EditorChips
        titulo="Colores"
        descripcion="Colores que el operador puede elegir al capturar. Ordénalos como quieras."
        placeholder="Ej. blanco, rosa, azul"
        vacio="Aún no hay colores. Agrega los que usan en el almacén."
        items={draft.colores}
        guardando={guardando === "colores"}
        onChange={(colores) => setDraft({ ...draft, colores })}
        onGuardar={(colores) => guardarBloque("colores", { colores })}
      />
      <EditorChips
        titulo="Tallas"
        descripcion="Catálogo general de tallas. Ordénalas como quieras. También puedes copiarlas a un esquema."
        placeholder="Ej. 1, 1X, 4 o CHICO"
        vacio="Aún no hay tallas sueltas."
        items={draft.tallas}
        guardando={guardando === "tallas"}
        onChange={(tallas) => setDraft({ ...draft, tallas })}
        onGuardar={(tallas) => guardarBloque("tallas", { tallas })}
      />
      <EditorChips
        titulo="Especificaciones"
        descripcion="Notas de captura: manga, forro, paquete, etc. Ordénalas como quieras."
        placeholder="Ej. manga corta, con gorro"
        vacio="Aún no hay especificaciones. El operador las verá vacías hasta que las armes."
        items={draft.especificaciones}
        guardando={guardando === "especificaciones"}
        onChange={(especificaciones) =>
          setDraft({ ...draft, especificaciones })
        }
        onGuardar={(especificaciones) =>
          guardarBloque("especificaciones", { especificaciones })
        }
      />
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
