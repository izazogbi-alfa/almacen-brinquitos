import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function FotoProducto({
  src,
  alt,
  className,
}: {
  src?: string;
  alt: string;
  className?: string;
}) {
  if (!src) {
    return (
      <div
        className={cn(
          "flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-xl bg-muted text-muted-foreground",
          className,
        )}
      >
        <ImageOff className="size-8" />
        <span className="text-xs font-medium">Sin foto</span>
      </div>
    );
  }
  return (
    // Foto local de demo; img evita el recorte vacío de next/image a pantalla ancha.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={cn(
        "max-h-64 w-full rounded-xl bg-muted object-contain",
        className,
      )}
    />
  );
}
