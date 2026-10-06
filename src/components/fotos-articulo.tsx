"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FotoProducto } from "@/components/foto-producto";
import {
  MAX_FOTOS_EXTRA,
  comprimirImagenArchivo,
} from "@/lib/fotos-articulo";

export function FotosArticulo({
  foto,
  fotos,
  nombre,
  onFoto,
  onFotos,
}: {
  foto?: string;
  fotos: string[];
  nombre: string;
  onFoto: (foto?: string) => void;
  onFotos: (fotos: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const destinoRef = useRef<"principal" | "extra">("principal");
  const [destino, setDestino] = useState<"principal" | "extra">("principal");
  const [leyendo, setLeyendo] = useState(false);
  const alt = nombre.trim() || "Artículo";

  function elegir(modo: "principal" | "extra") {
    if (modo === "extra" && fotos.length >= MAX_FOTOS_EXTRA) {
      toast.error(`Esta prenda ya tiene ${MAX_FOTOS_EXTRA} imágenes extra.`);
      return;
    }
    destinoRef.current = modo;
    setDestino(modo);
    inputRef.current?.click();
  }

  async function alElegirArchivo(file: File | undefined) {
    if (!file) return;
    setLeyendo(true);
    try {
      const data = await comprimirImagenArchivo(file);
      if (destinoRef.current === "principal") {
        const resto = fotos.filter((item) => item !== data);
        const guardoAnterior = Boolean(foto && foto !== data);
        if (guardoAnterior && foto) resto.unshift(foto);
        onFoto(data);
        onFotos(resto.slice(0, MAX_FOTOS_EXTRA));
        toast.success(
          guardoAnterior && resto.length > MAX_FOTOS_EXTRA
            ? "Imagen principal lista. La anterior quedó entre las extra y se quitó la última. Pulsa Guardar ficha."
            : guardoAnterior
              ? "Imagen principal lista. La anterior quedó entre las extra. Pulsa Guardar ficha."
              : "Imagen principal lista. Pulsa Guardar ficha.",
        );
      } else {
        if (data === foto || fotos.includes(data)) {
          toast.message("Esa imagen ya está en el artículo.");
        } else if (fotos.length >= MAX_FOTOS_EXTRA) {
          toast.error(`Esta prenda ya tiene ${MAX_FOTOS_EXTRA} imágenes extra.`);
        } else {
          onFotos([...fotos, data]);
          toast.success("Imagen agregada. Pulsa Guardar ficha.");
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo leer la imagen.");
    } finally {
      setLeyendo(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function ponerPrincipal(item: string) {
    const resto = fotos.filter((fotoExtra) => fotoExtra !== item);
    if (foto && foto !== item) resto.unshift(foto);
    onFoto(item);
    onFotos(resto.slice(0, MAX_FOTOS_EXTRA));
  }

  return (
    <div className="space-y-3 rounded-xl border p-3">
      <div>
        <p className="text-sm font-medium">Imágenes</p>
        <p className="text-xs text-muted-foreground">
          La principal es la que ya sale en el conteo y en el PDF. Aquí puedes
          cambiarla o agregar más fotos de la misma prenda.
        </p>
      </div>
      <FotoProducto
        src={foto}
        alt={alt}
        className="mx-auto h-36 max-h-36 w-36 object-contain"
      />
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label="Elegir imagen del artículo"
        onChange={(e) => void alElegirArchivo(e.target.files?.[0])}
      />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button
          type="button"
          variant="outline"
          className="h-11"
          disabled={leyendo}
          onClick={() => elegir("principal")}
        >
          {leyendo && destino === "principal"
            ? "Leyendo…"
            : foto
              ? "Cambiar imagen"
              : "Poner imagen"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11"
          disabled={leyendo}
          onClick={() => elegir("extra")}
        >
          {leyendo && destino === "extra" ? "Leyendo…" : "Agregar imagen"}
        </Button>
      </div>
      {foto ? (
        <Button
          type="button"
          variant="ghost"
          className="h-10 w-full text-sm"
          disabled={leyendo}
          onClick={() => onFoto(undefined)}
        >
          Quitar imagen principal
        </Button>
      ) : null}
      {fotos.length > 0 ? (
        <ul className="grid grid-cols-3 gap-2">
          {fotos.map((item, i) => (
            <li key={`${i}-${item.slice(-24)}`} className="space-y-1">
              <FotoProducto
                src={item}
                alt={`${alt} ${i + 1}`}
                className="h-20 max-h-20 w-full object-cover"
              />
              <Button
                type="button"
                variant="outline"
                className="h-9 w-full px-1 text-[11px] leading-tight"
                disabled={leyendo}
                onClick={() => ponerPrincipal(item)}
              >
                Poner como principal
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-8 w-full text-xs"
                disabled={leyendo}
                onClick={() => onFotos(fotos.filter((fotoExtra) => fotoExtra !== item))}
              >
                Quitar
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">
          Aún no hay imágenes extra. Máximo {MAX_FOTOS_EXTRA}.
        </p>
      )}
    </div>
  );
}
