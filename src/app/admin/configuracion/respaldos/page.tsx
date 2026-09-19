"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Save, RotateCcw } from "lucide-react";
import { CabeceraConfiguracion } from "@/components/cabecera-configuracion";
import { DialogQuitarConClave } from "@/components/dialog-quitar-con-clave";
import { AsyncGate, EmptyView } from "@/components/status-views";
import { SinAccesoConfiguracion } from "@/components/use-editor-catalogos";
import { Button } from "@/components/ui/button";
import { useInventory } from "@/lib/inventory-context";
import { HREF_CONFIGURACION } from "@/lib/secciones-configuracion";
import {
  LIMITE_RESPALDOS,
  nombreArchivoRespaldo,
  type RespaldoMeta,
} from "@/lib/respaldos";
import type { Catalogos } from "@/lib/types";
import type { AsignacionesPersistidas } from "@/lib/asignaciones-articulos";

type SavePickerWindow = Window & {
  showSaveFilePicker?: (opts: {
    suggestedName?: string;
    types?: Array<{
      description: string;
      accept: Record<string, string[]>;
    }>;
  }) => Promise<{
    createWritable: () => Promise<{
      write: (data: Blob) => Promise<void>;
      close: () => Promise<void>;
    }>;
  }>;
};

async function guardarEnPc(nombre: string, json: unknown) {
  const texto = JSON.stringify(json, null, 2);
  const blob = new Blob([texto], { type: "application/json" });
  const picker = window as SavePickerWindow;
  if (typeof picker.showSaveFilePicker === "function") {
    try {
      const handle = await picker.showSaveFilePicker({
        suggestedName: nombre,
        types: [
          {
            description: "Respaldo JSON",
            accept: { "application/json": [".json"] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return "carpeta";
    } catch (err) {
      const name = err instanceof Error ? err.name : "";
      if (name === "AbortError") return "cancelado";
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return "descarga";
}

function escribirLocalTrasRestaurar(data: {
  catalogos?: Catalogos;
  catalogosGuardadosEn?: string;
  asignaciones?: AsignacionesPersistidas["asignaciones"];
  asignacionesGuardadosEn?: string;
}) {
  try {
    if (data.catalogos && data.catalogosGuardadosEn) {
      window.localStorage.setItem(
        "brq_catalogos",
        JSON.stringify({
          savedAt: data.catalogosGuardadosEn,
          catalogos: data.catalogos,
        }),
      );
    }
    if (data.asignaciones && data.asignacionesGuardadosEn) {
      window.localStorage.setItem(
        "brq_asignaciones",
        JSON.stringify({
          savedAt: data.asignacionesGuardadosEn,
          asignaciones: data.asignaciones,
        }),
      );
    }
  } catch {
    /* quota */
  }
}

function etiquetaCuando(iso: string) {
  try {
    return new Date(iso).toLocaleString("es-MX", {
      timeZone: "America/Mexico_City",
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function PaginaRespaldos() {
  const { user } = useInventory();
  const [items, setItems] = useState<RespaldoMeta[] | null>(null);
  const [errorLista, setErrorLista] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState("");
  const [idRestaurar, setIdRestaurar] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setErrorLista("");
    const res = await fetch("/api/admin/respaldos", { credentials: "include" });
    const data = (await res.json().catch(() => ({}))) as {
      items?: RespaldoMeta[];
      error?: string;
    };
    if (!res.ok) {
      throw new Error(data.error ?? "No se pudo cargar la lista de copias.");
    }
    setItems(data.items ?? []);
  }, []);

  useEffect(() => {
    if (user?.rol !== "admin") return;
    let cancelado = false;
    void cargar().catch((err) => {
      if (!cancelado) {
        setErrorLista(
          err instanceof Error ? err.message : "No se pudo cargar la lista.",
        );
        setItems([]);
      }
    });
    return () => {
      cancelado = true;
    };
  }, [cargar, user?.rol]);

  if (user?.rol !== "admin") {
    return <SinAccesoConfiguracion />;
  }

  async function guardarAhora() {
    setGuardando(true);
    setAviso("");
    try {
      const res = await fetch("/api/admin/respaldos", {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        archivo?: unknown;
        meta?: RespaldoMeta;
        items?: RespaldoMeta[];
      };
      if (!res.ok) {
        throw new Error(data.error ?? "No se pudo guardar.");
      }
      if (data.items) setItems(data.items);
      const nombre = data.meta
        ? nombreArchivoRespaldo(data.meta)
        : "respaldo-brinquitos.json";
      const destino = await guardarEnPc(nombre, data.archivo);
      if (destino === "cancelado") {
        setAviso(
          "La copia ya quedó en la app. No se guardó archivo en tu PC porque cancelaste.",
        );
      } else if (destino === "carpeta") {
        setAviso("Listo. Quedó en la carpeta que elegiste y también aquí.");
      } else {
        setAviso(
          "Listo. El archivo se descargó (elige la carpeta en el cuadro del navegador) y también quedó aquí.",
        );
      }
    } catch (err) {
      setAviso("");
      setErrorLista(
        err instanceof Error ? err.message : "No se pudo guardar el respaldo.",
      );
    } finally {
      setGuardando(false);
    }
  }

  async function bajarCopia(id: string, meta: RespaldoMeta) {
    setAviso("");
    const res = await fetch(`/api/admin/respaldos/${id}/archivo`, {
      credentials: "include",
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error ?? "No se pudo bajar esa copia.");
    }
    const archivo = await res.json();
    const destino = await guardarEnPc(nombreArchivoRespaldo(meta), archivo);
    if (destino === "cancelado") return;
    setAviso("Archivo listo en tu computadora.");
  }

  async function restaurar(password: string) {
    if (!idRestaurar) return;
    const res = await fetch(`/api/admin/respaldos/${idRestaurar}/restaurar`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      catalogos?: Catalogos;
      catalogosGuardadosEn?: string;
      asignaciones?: AsignacionesPersistidas["asignaciones"];
      asignacionesGuardadosEn?: string;
    };
    if (!res.ok) {
      throw new Error(data.error ?? "Contraseña incorrecta. No se restauró.");
    }
    escribirLocalTrasRestaurar(data);
    setIdRestaurar(null);
    window.location.reload();
  }

  const manuales = (items ?? []).filter((it) => it.origen === "manual");
  const automaticos = (items ?? []).filter((it) => it.origen === "automatico");

  return (
    <div className="space-y-5">
      <CabeceraConfiguracion
        titulo="Respaldos"
        descripcion="Copia de esquemas, colores, tallas, especificaciones y qué esquema usa cada artículo (Baccus y el resto). Así no se pierden."
        volverHref={HREF_CONFIGURACION}
      />

      <section className="space-y-3 rounded-2xl border p-4">
        <h3 className="font-heading text-lg font-semibold">Guardar ahora</h3>
        <p className="text-sm text-muted-foreground">
          Tú eliges la carpeta de tu computadora. No pedimos cuenta de Drive ni
          Dropbox. También se queda una copia aquí (máximo {LIMITE_RESPALDOS};
          la más vieja se borra sola).
        </p>
        <Button
          type="button"
          className="h-12 w-full gap-2 text-base sm:w-auto"
          disabled={guardando}
          onClick={() => void guardarAhora()}
        >
          <Save className="size-5" />
          {guardando ? "Guardando…" : "Guardar ahora"}
        </Button>
        {aviso ? (
          <p className="text-sm text-teal-800" role="status">
            {aviso}
          </p>
        ) : null}
      </section>

      <section className="space-y-3 rounded-2xl border p-4">
        <h3 className="font-heading text-lg font-semibold">Automático del día</h3>
        <p className="text-sm text-muted-foreground">
          Una copia por día (zona México). El servidor la intenta de madrugada.
          Si no alcanza, se hace cuando una administradora abre la app. Máximo{" "}
          {LIMITE_RESPALDOS} automáticas.
        </p>
      </section>

      {errorLista ? (
        <div className="space-y-2 rounded-2xl border border-destructive/30 p-4">
          <p className="text-sm text-destructive" role="alert">
            {errorLista}
          </p>
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={() => {
              setErrorLista("");
              void cargar().catch((err) =>
                setErrorLista(
                  err instanceof Error
                    ? err.message
                    : "No se pudo cargar la lista.",
                ),
              );
            }}
          >
            Reintentar lista
          </Button>
        </div>
      ) : null}

      {items === null ? (
        <p className="text-sm text-muted-foreground">Cargando copias…</p>
      ) : items.length === 0 ? (
        <EmptyView
          titulo="Aún no hay copias aquí"
          detalle="Pulsa Guardar ahora. La del día aparece sola la primera vez que entres hoy, o cuando corra el reloj del servidor."
        />
      ) : (
        <div className="space-y-4">
          <ListaGrupo
            titulo={`Guardadas aquí (${manuales.length} de ${LIMITE_RESPALDOS})`}
            vacio="No hay copias manuales. Pulsa Guardar ahora."
            items={manuales}
            onRestaurar={setIdRestaurar}
            onBajar={(it) => void bajarCopia(it.id, it).catch((err) => setErrorLista(err instanceof Error ? err.message : "No se pudo bajar."))}
          />
          <ListaGrupo
            titulo={`Del día (${automaticos.length} de ${LIMITE_RESPALDOS})`}
            vacio="Hoy todavía no hay copia automática."
            items={automaticos}
            onRestaurar={setIdRestaurar}
            onBajar={(it) => void bajarCopia(it.id, it).catch((err) => setErrorLista(err instanceof Error ? err.message : "No se pudo bajar."))}
          />
        </div>
      )}

      <DialogQuitarConClave
        abierto={Boolean(idRestaurar)}
        titulo="¿Restaurar esta copia?"
        descripcion="Tus listas y los esquemas de cada artículo se reemplazan por los de esa fecha. Escribe tu contraseña."
        idCampo="clave-restaurar-respaldo"
        etiquetaSi="Sí, restaurar"
        onNo={() => setIdRestaurar(null)}
        onConfirmarConClave={restaurar}
      />
    </div>
  );
}

function ListaGrupo({
  titulo,
  vacio,
  items,
  onRestaurar,
  onBajar,
}: {
  titulo: string;
  vacio: string;
  items: RespaldoMeta[];
  onRestaurar: (id: string) => void;
  onBajar: (item: RespaldoMeta) => void;
}) {
  return (
    <section className="space-y-3">
      <h3 className="font-heading text-base font-semibold">{titulo}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{vacio}</p>
      ) : (
        <ul className="space-y-3">
          {items.map((it) => (
            <li
              key={it.id}
              className="space-y-3 rounded-2xl border bg-card p-4 shadow-sm"
            >
              <div>
                <p className="font-medium leading-tight">
                  {etiquetaCuando(it.createdAt)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {it.origen === "automatico" ? "Automático del día" : "Guardar ahora"}
                  {" · "}
                  {it.resumen.esquemas} esquemas · {it.resumen.articulos} artículos
                  con esquema
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 w-full gap-2"
                  onClick={() => onBajar(it)}
                >
                  <Download className="size-4" />
                  Bajar a mi PC
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="h-12 w-full gap-2"
                  onClick={() => onRestaurar(it.id)}
                >
                  <RotateCcw className="size-4" />
                  Restaurar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function Pagina() {
  return (
    <AsyncGate>
      <PaginaRespaldos />
    </AsyncGate>
  );
}
