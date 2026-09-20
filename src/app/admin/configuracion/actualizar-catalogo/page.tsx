"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CabeceraConfiguracion } from "@/components/cabecera-configuracion";
import { DialogQuitarConClave } from "@/components/dialog-quitar-con-clave";
import { AsyncGate, EmptyView } from "@/components/status-views";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useInventory } from "@/lib/inventory-context";
import {
  diffCatalogo,
  matrizDesdeLibro,
  parseTablaCatalogo,
  type DiffCatalogo,
  type FilaCatalogo,
} from "@/lib/actualizar-catalogo";
import { HREF_CONFIGURACION } from "@/lib/secciones-configuracion";

function muestras(filas: FilaCatalogo[], n = 4) {
  return filas.slice(0, n);
}

function ActualizarCatalogo() {
  const { user, productos, retry } = useInventory();
  const [errorArchivo, setErrorArchivo] = useState("");
  const [filas, setFilas] = useState<FilaCatalogo[] | null>(null);
  const [aviso, setAviso] = useState("");
  const [nombreArchivo, setNombreArchivo] = useState("");
  const [confirmar, setConfirmar] = useState(false);

  const diff: DiffCatalogo | null = useMemo(() => {
    if (!filas) return null;
    return diffCatalogo(productos, filas);
  }, [filas, productos]);

  if (user?.rol !== "admin") {
    return (
      <EmptyView
        titulo="Solo quien administra"
        detalle="Actualizar el catálogo desde Excel es de Iza. No borra existencias ni esquemas."
      />
    );
  }

  async function leerArchivo(file: File | undefined) {
    setErrorArchivo("");
    setFilas(null);
    setAviso("");
    setNombreArchivo("");
    if (!file) return;
    const bajo = file.name.toLowerCase();
    if (
      !bajo.endsWith(".xlsx") &&
      !bajo.endsWith(".xls") &&
      !bajo.endsWith(".csv")
    ) {
      setErrorArchivo("Sube un Excel (.xlsx) o un CSV.");
      return;
    }
    try {
      const buf = await file.arrayBuffer();
      const { matriz, fotosFila } = matrizDesdeLibro(buf, file.name);
      const parsed = parseTablaCatalogo(matriz, fotosFila);
      if (parsed.error) {
        setErrorArchivo(parsed.error);
        return;
      }
      setFilas(parsed.filas);
      setNombreArchivo(file.name);
      const extras: string[] = [];
      if (parsed.sinClave) {
        extras.push(
          `${parsed.sinClave} fila${parsed.sinClave === 1 ? "" : "s"} sin Clave o Nombre: se ignoran.`,
        );
      }
      if (parsed.duplicadas) {
        extras.push(
          `${parsed.duplicadas} clave${parsed.duplicadas === 1 ? "" : "s"} repetida${parsed.duplicadas === 1 ? "" : "s"}: se usa la última.`,
        );
      }
      if (!parsed.tieneColumnaFoto && fotosFila.size === 0) {
        extras.push("No hay columna de foto: las fotos actuales se quedan.");
      }
      setAviso(extras.join(" "));
    } catch (err) {
      setErrorArchivo(
        err instanceof Error
          ? err.message
          : "No se pudo leer el archivo. Prueba .xlsx o .csv.",
      );
    }
  }

  const hayCambios =
    (diff?.actualizar.length ?? 0) + (diff?.nuevos.length ?? 0) > 0;

  return (
    <div className="space-y-4">
      <CabeceraConfiguracion
        titulo="Actualizar catálogo"
        descripcion="Sube Excel o CSV. Empareja por Clave: cambia nombre y foto si vienen distintas, agrega las nuevas. Celda de foto vacía o sin esa columna: no quita la foto. Lo que no está en el archivo se queda. No borra existencias ni esquemas."
        volverHref={HREF_CONFIGURACION}
      />

      <div className="space-y-2">
        <Label htmlFor="archivo-catalogo">Archivo</Label>
        <Input
          id="archivo-catalogo"
          type="file"
          accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
          className="h-12 pt-2 text-sm"
          onChange={(e) => void leerArchivo(e.target.files?.[0])}
        />
        <p className="text-xs text-muted-foreground">
          Primera fila: Clave y Nombre. Foto, Fotos o URL es opcional. Si el
          Excel trae la imagen sobre la fila, también se usa.
        </p>
      </div>

      {errorArchivo ? (
        <EmptyView titulo="Archivo inválido" detalle={errorArchivo} />
      ) : null}

      {!filas && !errorArchivo ? (
        <EmptyView
          titulo="Aún no hay archivo"
          detalle="En el teléfono o en la computadora: elige el Excel o CSV de artículos."
        />
      ) : null}

      {filas && diff ? (
        <div className="space-y-3 rounded-2xl border bg-card p-4 shadow-sm">
          <p className="text-sm font-medium">{nombreArchivo}</p>
          {aviso ? (
            <p className="text-sm text-muted-foreground">{aviso}</p>
          ) : null}
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <li className="rounded-xl border px-3 py-3">
              <p className="font-heading text-3xl font-semibold">
                {diff.actualizar.length}
              </p>
              <p className="text-sm text-muted-foreground">a actualizar</p>
            </li>
            <li className="rounded-xl border px-3 py-3">
              <p className="font-heading text-3xl font-semibold">
                {diff.nuevos.length}
              </p>
              <p className="text-sm text-muted-foreground">nuevos</p>
            </li>
            <li className="rounded-xl border px-3 py-3">
              <p className="font-heading text-3xl font-semibold">
                {diff.sinCambio.length}
              </p>
              <p className="text-sm text-muted-foreground">sin cambio</p>
            </li>
            <li className="rounded-xl border px-3 py-3">
              <p className="font-heading text-3xl font-semibold">
                {diff.fotosCambian.length}
              </p>
              <p className="text-sm text-muted-foreground">fotos a cambiar</p>
            </li>
          </ul>
          {muestras(diff.actualizar).length > 0 ? (
            <p className="text-sm text-muted-foreground">
              Ej. actualizar:{" "}
              {muestras(diff.actualizar)
                .map((f) => f.clave)
                .join(", ")}
            </p>
          ) : null}
          {muestras(diff.nuevos).length > 0 ? (
            <p className="text-sm text-muted-foreground">
              Ej. nuevos:{" "}
              {muestras(diff.nuevos)
                .map((f) => f.clave)
                .join(", ")}
            </p>
          ) : null}
          {muestras(diff.fotosCambian).length > 0 ? (
            <p className="text-sm text-muted-foreground">
              Ej. fotos:{" "}
              {muestras(diff.fotosCambian)
                .map((f) => f.clave)
                .join(", ")}
            </p>
          ) : null}
          <p className="text-sm text-muted-foreground">
            Las claves que ya están en la app y no vienen en el archivo no se
            tocan. Vacío en Foto no borra la imagen.
          </p>
          {hayCambios ? (
            <Button
              type="button"
              className="h-12 w-full"
              onClick={() => setConfirmar(true)}
            >
              Aplicar cambios
            </Button>
          ) : (
            <EmptyView
              titulo="Nada que aplicar"
              detalle="Nombres y fotos ya coinciden. No se agrega ni se borra nada."
            />
          )}
        </div>
      ) : null}

      <DialogQuitarConClave
        abierto={confirmar}
        titulo="¿Aplicar este catálogo?"
        descripcion="Se actualizan nombres y las fotos que sí cambiaron. Se agregan claves nuevas. No se borra lo capturado ni los esquemas. Escribe tu contraseña y pulsa Sí."
        idCampo="clave-actualizar-catalogo"
        etiquetaSi="Sí, actualizar"
        onNo={() => setConfirmar(false)}
        onConfirmarConClave={async (password) => {
          if (!filas) return;
          const res = await fetch("/api/admin/catalogo-actualizar", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filas, password }),
          });
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
            actualizar?: number;
            nuevos?: number;
            fotosCambian?: number;
          };
          if (!res.ok) {
            throw new Error(data.error ?? "No se pudo actualizar.");
          }
          retry();
          setConfirmar(false);
          toast.success(
            `Listo. ${data.actualizar ?? 0} actualizados, ${data.nuevos ?? 0} nuevos, ${data.fotosCambian ?? 0} fotos. Lo demás sigue.`,
          );
        }}
      />
    </div>
  );
}

export default function PaginaActualizarCatalogo() {
  return (
    <AsyncGate>
      <ActualizarCatalogo />
    </AsyncGate>
  );
}
