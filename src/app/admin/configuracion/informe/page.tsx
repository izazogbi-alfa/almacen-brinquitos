"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CabeceraConfiguracion } from "@/components/cabecera-configuracion";
import { AsyncGate } from "@/components/status-views";
import { SinAccesoConfiguracion } from "@/components/use-editor-catalogos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useInventory } from "@/lib/inventory-context";
import { NOMBRE_EMPRESA_DEFAULT, nombreEmpresa } from "@/lib/catalogos";
import { puede } from "@/lib/modulos";
import { HREF_CONFIGURACION } from "@/lib/secciones-configuracion";

const LOGO_PX = 160;

function leerComoDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, LOGO_PX / img.width, LOGO_PX / img.height);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("No se pudo leer el logo."));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const jpg = canvas.toDataURL("image/jpeg", 0.72);
      URL.revokeObjectURL(url);
      resolve(jpg);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Esa imagen no se pudo abrir."));
    };
    img.src = url;
  });
}

function InformePdf() {
  const { user, catalogos, guardarCatalogos } = useInventory();
  const [nombre, setNombre] = useState(catalogos.empresaNombre ?? "");
  const [logo, setLogo] = useState(catalogos.logoDataUrl ?? "");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    setNombre(catalogos.empresaNombre ?? "");
    setLogo(catalogos.logoDataUrl ?? "");
  }, [catalogos.empresaNombre, catalogos.logoDataUrl]);

  if (!puede(user, "configuracion")) {
    return <SinAccesoConfiguracion />;
  }

  async function guardar() {
    setGuardando(true);
    try {
      await guardarCatalogos({
        ...catalogos,
        empresaNombre: nombre.trim(),
        logoDataUrl: logo || "",
      });
      toast.success("Listo. El PDF usará este logo y este nombre.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-4">
      <CabeceraConfiguracion
        titulo="Informe PDF"
        descripcion="Sale en el encabezado de existencias, recepción y pedidos. Carta horizontal."
        volverHref={HREF_CONFIGURACION}
      />
      <div className="space-y-2">
        <Label htmlFor="nombre-empresa">Nombre</Label>
        <Input
          id="nombre-empresa"
          className="h-12 text-base"
          placeholder={NOMBRE_EMPRESA_DEFAULT}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Si lo dejas vacío, sale {NOMBRE_EMPRESA_DEFAULT}.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="logo-empresa">Logo</Label>
        <Input
          id="logo-empresa"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="h-12 pt-2 text-sm"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            void leerComoDataUrl(file)
              .then((data) => setLogo(data))
              .catch((err) =>
                toast.error(
                  err instanceof Error ? err.message : "No se subió el logo.",
                ),
              );
          }}
        />
        {logo ? (
          <div className="flex items-center gap-3 rounded-xl border p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logo}
              alt="Logo del informe"
              className="size-16 rounded-md object-contain bg-white"
            />
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => setLogo("")}
            >
              Quitar logo
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            PNG o JPG. Se achica solo para el encabezado.
          </p>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        Ahora se vería: {nombreEmpresa({ ...catalogos, empresaNombre: nombre })}
      </p>
      <Button
        type="button"
        className="h-12 w-full"
        disabled={guardando}
        onClick={() => void guardar()}
      >
        {guardando ? "Guardando…" : "Guardar"}
      </Button>
    </div>
  );
}

export default function PaginaInformePdf() {
  return (
    <AsyncGate>
      <InformePdf />
    </AsyncGate>
  );
}
