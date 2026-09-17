"use client";

import { CabeceraConfiguracion } from "@/components/cabecera-configuracion";
import { EditorChips } from "@/components/editores-catalogo";
import { AsyncGate } from "@/components/status-views";
import {
  SinAccesoConfiguracion,
  useEditorCatalogos,
} from "@/components/use-editor-catalogos";

function PaginaColores() {
  const { permitido, draft, setDraft, guardando, guardarBloque } =
    useEditorCatalogos();

  if (!permitido) return <SinAccesoConfiguracion />;

  return (
    <div className="space-y-4">
      <CabeceraConfiguracion
        titulo="Colores"
        descripcion="Colores que el operador puede elegir al capturar. Guarda este bloque con Guardar."
      />
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
    </div>
  );
}

export default function PaginaColoresRuta() {
  return (
    <AsyncGate>
      <PaginaColores />
    </AsyncGate>
  );
}
