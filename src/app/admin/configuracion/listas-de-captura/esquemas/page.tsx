"use client";

import { useState } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { CabeceraConfiguracion } from "@/components/cabecera-configuracion";
import { DialogAccionEsquema } from "@/components/dialog-accion-esquema";
import { DialogQuitarConClave } from "@/components/dialog-quitar-con-clave";
import { EditorEsquema } from "@/components/editores-catalogo";
import { ListaOrdenable, TEXTO_ORDEN } from "@/components/lista-ordenable";
import { AsyncGate } from "@/components/status-views";
import { Button } from "@/components/ui/button";
import {
  SinAccesoConfiguracion,
  useEditorCatalogos,
} from "@/components/use-editor-catalogos";
import {
  clonarEsquemaCatalogo,
  nombreEsquemaDuplicado,
} from "@/lib/catalogos";
import { useInventory } from "@/lib/inventory-context";
import type { EsquemaCatalogo } from "@/lib/types";
import { tituloEtiqueta } from "@/lib/titulo-etiqueta";
import { toast } from "sonner";
import {
  elegirEstiloPdf,
  MENSAJE_ESTILO_PDF_OBLIGATORIO,
} from "@/lib/pdf-estilo";

type ModoEditor = {
  tipo: "nuevo" | "editar" | "clonar";
  esquemaId: string;
};

type AccionClave = "editar" | "clonar" | "guardar";

function PaginaEsquemas() {
  const { catalogos } = useInventory();
  const { permitido, draft, setDraft, guardando, guardarBloque } =
    useEditorCatalogos();
  const [modoEditor, setModoEditor] = useState<ModoEditor | null>(null);
  const [esquemaParaAccion, setEsquemaParaAccion] =
    useState<EsquemaCatalogo | null>(null);
  const [accionClave, setAccionClave] = useState<AccionClave | null>(null);
  const [esquemaGuardarPendiente, setEsquemaGuardarPendiente] =
    useState<EsquemaCatalogo | null>(null);

  if (!permitido) return <SinAccesoConfiguracion />;

  function setEsquemas(esquemas: EsquemaCatalogo[]) {
    setDraft({ ...draft, esquemas });
  }

  function esquemaGuardado(id: string) {
    return catalogos.esquemas.some((e) => e.id === id);
  }

  function abrirNuevo() {
    const id = `esq-${Date.now()}`;
    setEsquemas([
      ...draft.esquemas,
      {
        id,
        nombre: "Esquema Nuevo",
        tallas: [],
      },
    ]);
    setModoEditor({ tipo: "nuevo", esquemaId: id });
  }

  function cerrarEditor() {
    if (!modoEditor) return;
    if (modoEditor.tipo === "nuevo" || modoEditor.tipo === "clonar") {
      setEsquemas(draft.esquemas.filter((e) => e.id !== modoEditor.esquemaId));
    } else if (modoEditor.tipo === "editar") {
      const original = catalogos.esquemas.find(
        (e) => e.id === modoEditor.esquemaId,
      );
      if (original) {
        setEsquemas(
          draft.esquemas.map((e) =>
            e.id === original.id ? { ...original } : e,
          ),
        );
      }
    }
    setModoEditor(null);
  }

  function validarEsquema(siguiente: EsquemaCatalogo, exceptoId?: string) {
    const nombre = tituloEtiqueta(siguiente.nombre);
    if (!nombre) {
      toast.error("El nombre del esquema no puede quedar vacío.");
      return null;
    }
    if (nombreEsquemaDuplicado(draft.esquemas, nombre, exceptoId)) {
      toast.error("Ya hay un esquema con ese nombre. Elige otro.");
      return null;
    }
    if (!elegirEstiloPdf(siguiente.estiloPdf)) {
      toast.error(MENSAJE_ESTILO_PDF_OBLIGATORIO);
      return null;
    }
    return {
      ...siguiente,
      nombre,
    };
  }

  async function persistirEsquema(siguiente: EsquemaCatalogo) {
    const esquemas = draft.esquemas.map((e) =>
      e.id === siguiente.id ? siguiente : e,
    );
    setEsquemas(esquemas);
    await guardarBloque(`esquema-${siguiente.id}`, { esquemas });
    setModoEditor(null);
    setEsquemaGuardarPendiente(null);
  }

  function pedirGuardar(siguiente: EsquemaCatalogo) {
    const validado = validarEsquema(
      siguiente,
      modoEditor?.tipo === "editar" ? siguiente.id : undefined,
    );
    if (!validado) return Promise.resolve();

    if (modoEditor?.tipo === "nuevo") {
      return persistirEsquema(validado);
    }

    setEsquemaGuardarPendiente(validado);
    setAccionClave("guardar");
    return Promise.resolve();
  }

  const esquemaActivo =
    modoEditor
      ? draft.esquemas.find((e) => e.id === modoEditor.esquemaId)
      : undefined;

  const indiceActivo =
    esquemaActivo
      ? draft.esquemas.findIndex((e) => e.id === esquemaActivo.id)
      : -1;

  return (
    <div className="space-y-4">
      <CabeceraConfiguracion
        titulo="Esquemas de conteo"
        descripcion="Tú armas los esquemas. Pulsa uno ya guardado para Editar o Clonar esquema (pide contraseña). + Esquema crea uno nuevo. Elige PDF compacto o detallado antes de guardar."
      />
      <section className="space-y-3 rounded-xl border p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium">Tus esquemas guardados</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Pulsa un nombre para editarlo o clonarlo. Arrastra abajo para
              cambiar el orden.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-12"
            onClick={abrirNuevo}
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
          <div className="space-y-2">
            {draft.esquemas.map((e) => {
              const activo = modoEditor?.esquemaId === e.id;
              const guardado = esquemaGuardado(e.id);
              return (
                <Button
                  key={e.id}
                  type="button"
                  variant={activo ? "default" : "outline"}
                  className="h-12 w-full justify-between gap-2 px-4"
                  aria-pressed={activo}
                  onClick={() => {
                    if (guardado) {
                      setEsquemaParaAccion(e);
                      return;
                    }
                    setModoEditor({ tipo: "nuevo", esquemaId: e.id });
                  }}
                >
                  <span className="truncate text-left">{e.nombre}</span>
                  <ChevronRight className="size-4 shrink-0 opacity-70" />
                </Button>
              );
            })}
          </div>
        )}

        {draft.esquemas.length > 1 ? (
          <>
            <p className="mt-4 text-sm font-medium">{TEXTO_ORDEN}</p>
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
              onClick={() => {
                const falta = draft.esquemas.find(
                  (e) => !elegirEstiloPdf(e.estiloPdf),
                );
                if (falta) {
                  toast.error(MENSAJE_ESTILO_PDF_OBLIGATORIO);
                  return;
                }
                void guardarBloque("esquemas-orden", {
                  esquemas: draft.esquemas,
                });
              }}
            >
              {guardando === "esquemas-orden" ? "Guardando…" : "Guardar orden"}
            </Button>
          </>
        ) : null}

        {esquemaActivo && indiceActivo >= 0 ? (
          <div className="space-y-2 border-t pt-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">
                {modoEditor?.tipo === "editar"
                  ? `Editando: ${esquemaActivo.nombre}`
                  : modoEditor?.tipo === "clonar"
                    ? `Clonando: ${esquemaActivo.nombre}`
                    : `Nuevo esquema`}
              </p>
              <Button
                type="button"
                variant="ghost"
                className="h-10 shrink-0"
                onClick={cerrarEditor}
              >
                Cerrar
              </Button>
            </div>
            <EditorEsquema
              esquema={esquemaActivo}
              sePuedeEliminar={
                modoEditor?.tipo === "editar" && esquemaGuardado(esquemaActivo.id)
              }
              guardando={guardando === `esquema-${esquemaActivo.id}`}
              onChange={(sig) =>
                setEsquemas(
                  draft.esquemas.map((x, j) => (j === indiceActivo ? sig : x)),
                )
              }
              onEliminar={() => {
                const siguientes = draft.esquemas.filter(
                  (_, j) => j !== indiceActivo,
                );
                setEsquemas(siguientes);
                setModoEditor(null);
                void guardarBloque(`esquema-${esquemaActivo.id}`, {
                  esquemas: siguientes,
                });
              }}
              onGuardar={(sig) => pedirGuardar(sig)}
            />
          </div>
        ) : null}
      </section>

      <DialogAccionEsquema
        esquema={esquemaParaAccion}
        abierto={esquemaParaAccion !== null && accionClave === null}
        onCerrar={() => setEsquemaParaAccion(null)}
        onEditar={() => setAccionClave("editar")}
        onClonar={() => setAccionClave("clonar")}
      />

      <DialogQuitarConClave
        abierto={accionClave === "editar" && esquemaParaAccion !== null}
        titulo="¿Editar este esquema?"
        descripcion={`Para cambiar «${esquemaParaAccion?.nombre ?? ""}» en su lugar escribe tu contraseña y pulsa Continuar. Los artículos que lo usan verán el cambio. Si pulsas No o la contraseña no es, se queda igual.`}
        idCampo="clave-editar-esquema"
        etiquetaSi="Continuar"
        onNo={() => {
          setAccionClave(null);
          setEsquemaParaAccion(null);
        }}
        onSi={() => {
          if (!esquemaParaAccion) return;
          setModoEditor({ tipo: "editar", esquemaId: esquemaParaAccion.id });
          setEsquemaParaAccion(null);
          setAccionClave(null);
        }}
      />

      <DialogQuitarConClave
        abierto={accionClave === "clonar" && esquemaParaAccion !== null}
        titulo="¿Clonar este esquema?"
        descripcion={`Para copiar «${esquemaParaAccion?.nombre ?? ""}» como esquema nuevo escribe tu contraseña y pulsa Continuar. El original no cambia. Si pulsas No o la contraseña no es, no se crea la copia.`}
        idCampo="clave-clonar-esquema"
        etiquetaSi="Continuar"
        onNo={() => {
          setAccionClave(null);
          setEsquemaParaAccion(null);
        }}
        onSi={() => {
          if (!esquemaParaAccion) return;
          const copia = clonarEsquemaCatalogo(
            esquemaParaAccion,
            draft.esquemas,
          );
          setEsquemas([...draft.esquemas, copia]);
          setModoEditor({ tipo: "clonar", esquemaId: copia.id });
          setEsquemaParaAccion(null);
          setAccionClave(null);
        }}
      />

      <DialogQuitarConClave
        abierto={accionClave === "guardar" && esquemaGuardarPendiente !== null}
        titulo="¿Guardar este esquema?"
        descripcion={`Para guardar «${esquemaGuardarPendiente?.nombre ?? ""}» escribe tu contraseña y pulsa Sí. Si pulsas No o la contraseña no es, no se guarda.`}
        idCampo="clave-guardar-esquema"
        onNo={() => {
          setAccionClave(null);
          setEsquemaGuardarPendiente(null);
        }}
        onSi={async () => {
          if (!esquemaGuardarPendiente) return;
          await persistirEsquema(esquemaGuardarPendiente);
          setAccionClave(null);
        }}
      />
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
