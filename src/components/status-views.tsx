"use client";

import { AlertCircle, PackageSearch, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useInventory } from "@/lib/inventory-context";

export function LoadingView({ filas = 5 }: { filas?: number }) {
  return (
    <div className="space-y-3" aria-live="polite" aria-busy="true">
      <p className="text-sm text-muted-foreground">Cargando datos del almacén…</p>
      {Array.from({ length: filas }).map((_, i) => (
        <div key={i} className="rounded-xl border p-4">
          <Skeleton className="mb-2 h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="mt-3 h-2 w-full" />
        </div>
      ))}
    </div>
  );
}

export function ErrorView() {
  const { retry } = useInventory();
  return (
    <Alert variant="destructive" className="border-destructive/30 p-4">
      <AlertCircle />
      <AlertTitle>No se pudo cargar el almacén</AlertTitle>
      <AlertDescription>
        No se pudo hablar con el servidor. Revisa la red e inténtalo de nuevo.
      </AlertDescription>
      <div className="col-start-2 mt-3">
        <Button type="button" onClick={retry} className="h-10 gap-2">
          <RefreshCw className="size-4" />
          Reintentar
        </Button>
      </div>
    </Alert>
  );
}

export function EmptyView({
  titulo,
  detalle,
}: {
  titulo: string;
  detalle: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-12 text-center">
      <PackageSearch className="mb-3 size-10 text-muted-foreground" />
      <h2 className="font-heading text-base font-semibold">{titulo}</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{detalle}</p>
    </div>
  );
}

export function AsyncGate({ children }: { children: React.ReactNode }) {
  const { status } = useInventory();
  if (status === "loading") return <LoadingView />;
  if (status === "error") return <ErrorView />;
  return <>{children}</>;
}
