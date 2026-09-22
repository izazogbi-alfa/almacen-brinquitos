"use client";

import { CabeceraConfiguracion } from "@/components/cabecera-configuracion";
import { EditorChips } from "@/components/editores-catalogo";
import { AsyncGate } from "@/components/status-views";
import {
  SinAccesoConfiguracion,
  useEditorCatalogos,
} from "@/components/use-editor-catalogos";

function PaginaTallas() {
  const { permitido, draft, setDraft, guardando, guardarBloque } =
    useEditorCatalogos();

  if (!permitido) return <SinAccesoConfiguracion />;

  return (
    <div className="space-y-4">
      <CabeceraConfiguracion
        titulo="Tallas"
        descripcion="Catálogo general de tallas. También puedes copiarlas a un esquema. Guarda este bloque con Guardar."
      />
      <EditorChips
        titulo="Tallas"
        descripcion="Catálogo general de tallas. También puedes copiarlas a un esquema."
        placeholder="Ej. 1, 1X, 4 o CHICO"
        vacio="Aún no hay tallas sueltas."
        items={draft.tallas}
        tipo="talla"
        guardando={guardando === "tallas"}
        onChange={(tallas) => setDraft({ ...draft, tallas })}
        onGuardar={(tallas) => guardarBloque("tallas", { tallas })}
      />
    </div>
  );
}

export default function PaginaTallasRuta() {
  return (
    <AsyncGate>
      <PaginaTallas />
    </AsyncGate>
  );
}
