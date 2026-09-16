import Image from "next/image";
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
    <Image
      src={src}
      alt={alt}
      width={800}
      height={800}
      className={cn(
        "aspect-square w-full rounded-xl object-cover bg-muted",
        className,
      )}
    />
  );
}
