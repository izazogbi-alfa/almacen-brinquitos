"use client";

import { CabeceraConfiguracion } from "@/components/cabecera-configuracion";
import { EditorChips } from "@/components/editores-catalogo";
import { AsyncGate } from "@/components/status-views";
import {
  SinAccesoConfiguracion,
  useEditorCatalogos,
} from "@/components/use-editor-catalogos";

function PaginaEspecificaciones() {
  const { permitido, draft, setDraft, guardando, guardarBloque } =
    useEditorCatalogos();

  if (!permitido) return <SinAccesoConfiguracion />;

  return (
    <div className="space-y-4">
      <CabeceraConfiguracion
        titulo="Especificaciones"
        descripcion="Notas de captura: manga, forro, paquete, etc. Guarda este bloque con Guardar."
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

export default function PaginaEspecificacionesRuta() {
  return (
    <AsyncGate>
      <PaginaEspecificaciones />
    </AsyncGate>
  );
}
