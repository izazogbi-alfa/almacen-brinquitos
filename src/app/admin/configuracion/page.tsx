"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { DialogQuitarConClave } from "@/components/dialog-quitar-con-clave";
import { ListaOrdenable, TEXTO_ORDEN } from "@/components/lista-ordenable";
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
          etiqueta={(item) => item}
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
    const nuevos = parseLista(entrada);
    if (nuevos.length === 0) return;
    onChange({ ...esquema, tallas: agregarUnicos(esquema.tallas, nuevos) });
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
        />
      </div>
      <p className="text-sm text-muted-foreground">
        Tallas de este esquema. Vacío = se cuenta solo con color y cantidad.
        Ordénalas con los cuadritos.
      </p>
      {esquema.tallas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin tallas (accesorio).</p>
      ) : (
        <ListaOrdenable
          items={esquema.tallas}
          getKey={(t) => t}
          etiqueta={(t) => t}
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
        onClick={() => void onGuardar(esquema)}
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
            </p>
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
                },
              ])
            }
          >
            <Plus className="size-4" />
            Esquema
          </Button>
        </div>
        <ListaOrdenable
          items={draft.esquemas}
          getKey={(e) => e.id}
          etiqueta={(e) => e.nombre}
          onReorder={setEsquemas}
        />
        <Button
          type="button"
          className="h-12 w-full"
          disabled={guardando === "esquemas-orden"}
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
              sePuedeEliminar={draft.esquemas.length > 1}
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

      <EditorChips
        titulo="Colores"
        descripcion="Colores que el operador puede elegir al capturar."
        placeholder="Ej. blanco, rosa, azul"
        vacio="Aún no hay colores. Agrega los que usan en el almacén."
        items={draft.colores}
        guardando={guardando === "colores"}
        onChange={(colores) => setDraft({ ...draft, colores })}
        onGuardar={(colores) => guardarBloque("colores", { colores })}
      />
      <EditorChips
        titulo="Tallas"
        descripcion="Catálogo general de tallas. También puedes copiarlas a un esquema."
        placeholder="Ej. 1, 1X, 4 o CHICO"
        vacio="Aún no hay tallas sueltas."
        items={draft.tallas}
        guardando={guardando === "tallas"}
        onChange={(tallas) => setDraft({ ...draft, tallas })}
        onGuardar={(tallas) => guardarBloque("tallas", { tallas })}
      />
      <EditorChips
        titulo="Especificaciones"
        descripcion="Notas de captura: manga, forro, paquete, etc."
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
