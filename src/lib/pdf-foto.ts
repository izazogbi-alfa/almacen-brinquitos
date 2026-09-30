import type { BloquePrenda } from "@/lib/tabla-bloques";

export const FOTO_CLAVE_MM = 30;

export function esDataUrlImagen(src: string | undefined): src is string {
  return Boolean(src && src.startsWith("data:image/"));
}

/** Pasa la foto del artículo a data URL para que el PDF pueda pintarla. */
export async function incrustarFotosEnBloques(
  bloques: BloquePrenda[],
  leerRuta?: (src: string) => Promise<string | null>,
): Promise<BloquePrenda[]> {
  return Promise.all(
    bloques.map(async (bloque) => {
      if (!bloque.foto || esDataUrlImagen(bloque.foto)) return bloque;
      const data = leerRuta
        ? await leerRuta(bloque.foto).catch(() => null)
        : await dataUrlEnNavegador(bloque.foto);
      return data ? { ...bloque, foto: data } : { ...bloque, foto: undefined };
    }),
  );
}

function dataUrlEnNavegador(src: string): Promise<string | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || 1;
        canvas.height = img.naturalHeight || 1;
        const g = canvas.getContext("2d");
        if (!g) {
          resolve(null);
          return;
        }
        g.drawImage(img, 0, 0);
        const png = /\.png($|\?)/i.test(src);
        resolve(canvas.toDataURL(png ? "image/png" : "image/jpeg", 0.85));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
